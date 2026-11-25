# Multi-Window IPC Sync (live timing)

How the main window and the display window(s) share live-timing state. For the full channel list, see [architecture.md](architecture.md#ipc-channels-mainjs).

## Pattern: notify, then query

The main process holds the **single source of truth**. Renderers never trust a broadcast payload. They treat it as a "something changed" signal and re-read from main.

```
Main process (main.js)
├── sharedState { currentHeat, state, algeState, udpActive, viewMode, omegaSettings }
├── ipcMain.on('alge:update-*')     ← primary window pushes changes
├── ipcMain.handle('alge:get-*')    ← any window reads current value
└── broadcastStateChange(type)      → 'alge:state-changed:<type>' to all windows

Renderer (AlgeService / TimingStateService)
├── local RxJS subjects → send alge:update-* on change
├── on alge:state-changed:* → invoke alge:get-* → push into local subject
└── on startup → invoke alge:get-* so a new window shows current state at once
```

## Flow: primary window receives timing data

1. A UDP packet (ALGE) or serial frame (OMEGA) is parsed and updates `TimingStateService`.
2. `AlgeService.setupIpcSync()` sees the change and sends `alge:update-current-heat` (serialised: `Map`s become arrays).
3. Main updates `sharedState.currentHeat` and broadcasts `alge:state-changed:heat`.
4. Display windows invoke `alge:get-current-heat`, deserialise it, and emit it locally.

## Code shape

```javascript
// main.js
ipcMain.on('alge:update-current-heat', (event, heat) => {
  sharedState.currentHeat = heat
  broadcastStateChange('heat', heat)
})
ipcMain.handle('alge:get-current-heat', async () => sharedState.currentHeat)
```

```typescript
// alge.service.ts
ipcRenderer.on('alge:state-changed:heat', async () => {
  const latest = await ipcRenderer.invoke('alge:get-current-heat');
  this.currentHeatSubject.next(this.deserializeHeat(latest));
});
```

Components only subscribe to `algeService.currentHeat` / `state`. They never touch IPC directly.

`view-mode` uses the same idea: `view-mode:set` persists the mode to `settings.json` and broadcasts `view-mode:changed`.

## Gotchas

- **Serialisation:** `CurrentHeatModel.competitors` and `splits` are `Map`s. They must be converted before IPC (structured clone drops the prototype logic the code relies on). Use the existing `serializeHeat` / `deserializeHeat`.
- **Update loops:** every window echoes received state back as `alge:update-*`, because its subscriptions fire again. The loop stops only because the `alge:update-*` handlers in `main.js` broadcast when the value actually changed (`!==` / `JSON.stringify` comparison). Keep that dedupe if you touch those handlers.
- **NgZone:** IPC callbacks run outside Angular's zone. Wrap subject updates in `ngZone.run(...)` or the UI won't refresh.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Display shows stale data | listeners registered in `setupIpcSync()`; DevTools console of the display window |
| Main state not updating | primary window sends `alge:update-*`; add logging in `broadcastStateChange()` |
| New window starts empty | initial `alge:get-*` fetch on service construction |

## Possible future work

- WebSocket bridge so the display can run on another machine
- Delta/batched updates for very high-frequency feeds
