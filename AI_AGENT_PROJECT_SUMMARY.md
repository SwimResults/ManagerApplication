# AI Agent Project Summary

Last updated: 2026-03-27
Scope: Angular + Electron architecture overview, routing behavior, and Electron integration points.

## High-Level Architecture

- Desktop app built with Angular (standalone bootstrap) packaged via Electron Forge.
- Electron main process starts a local Express server on `127.0.0.1:3000` and loads Angular through `BrowserWindow.loadURL`.
- Angular production build output is served from `dist/swim-results-manager/browser`.
- Main process keeps shared runtime state for live timing so multiple windows stay synchronized.

## Core Files to Read First

- `main.js` (Electron main process, IPC handlers, Express hosting, display window creation)
- `src/app/core/service/electron.service.ts` (renderer-side Electron API wrapper)
- `src/app/core/service/alge.service.ts` (live timing state model + IPC sync logic)
- `src/app/app.routes.ts` (route definitions)
- `src/app/app.config.ts` (router provider uses hash location)
- `src/app/app.component.ts` + `src/app/app.component.html` (display mode vs normal shell)

## Routing Model

- Angular router uses hash routing: `provideRouter(routes, withHashLocation())`.
- Important routes:
  - `/display` -> dedicated display window component
  - `/auth` and `/auth/logout` -> OAuth callback/logout handling
  - default route `""` -> main shell component
- `display` route is intentionally declared first so it matches before default route.
- Root component toggles layout via `isDisplayMode` by checking whether URL includes `/display`:
  - Normal mode: header + sidebar + status bar + split layout
  - Display mode: only `router-outlet` content

## Electron <-> Angular Interaction

### Renderer abstraction: ElectronService

`src/app/core/service/electron.service.ts` exposes:

- Environment detection (`isElectron`)
- IPC usage (`ipcRenderer.invoke(...)`) for:
  - `dialog:openFile`
  - `window:create-display`
- Node API access via `window.require` for:
  - `fs` (file stats and reads)
  - `child_process`
  - `node:dgram` (UDP listener)
- UDP lifecycle methods:
  - `startUdpListener(port, address)`
  - `stopUdpListener()`

### Main-process IPC handlers

`main.js` handles:

- `dialog:openFile` -> native open-file dialog
- `window:create-display` -> opens second BrowserWindow and navigates to `#/display`
- Live timing shared-state channels:
  - request/response reads: `alge:get-*`
  - updates from renderer: `alge:update-*`
  - broadcasts to all windows: `alge:state-changed:*`

## Multi-Window Live Timing Sync

`src/app/core/service/alge.service.ts` is the renderer-side state service and IPC sync layer.

- Owns local RxJS subjects for:
  - current heat data
  - timing state
  - connection state
  - UDP active flag
- Sends state updates to main process (`alge:update-*`).
- Listens for state-changed broadcasts and then queries authoritative latest state from main (`alge:get-*`).
- Fetches initial state on startup so secondary windows get current values immediately.

## Display Window Flow

1. UI action calls `electronService.openDisplayWindow()` (from live timing old view).
2. Renderer invokes `window:create-display`.
3. Main creates new BrowserWindow and loads base URL.
4. After `did-finish-load`, main executes JS to set `window.location.hash = '#/display'`.
5. Angular route resolves display component, root shell switches to display mode layout.

## OAuth Callback Behavior with Hash Routing

- OAuth config uses redirect URIs based on origin:
  - `window.location.origin + '/auth'`
  - `window.location.origin + '/auth/logout'`
- Express in `main.js` rewrites those endpoints to hash-based Angular routes:
  - `/auth` -> `/#/auth?...query`
  - `/auth/logout` -> `/#/auth/logout`
- This bridges provider callback URLs with Angular hash routing.

## Known Caveats / Technical Debt

- BrowserWindows currently use:
  - `nodeIntegration: true`
  - `contextIsolation: false`
  - `webSecurity: false`
- Renderer directly uses `window.require(...)` instead of a hardened preload API.
- A preload file exists (`electron/preload.js`) but is not currently wired in BrowserWindow `webPreferences`.

## Where Electron Features Are Triggered in UI

- `src/app/content/live-timing/live-timing-old-view/live-timing-old-view.component.ts`
  - Starts/stops UDP listener
  - Opens display window
- `src/app/core/service/file-watcher.service.ts`
  - Opens native file dialog via ElectronService
  - Reads file metadata/contents through ElectronService

## Practical Onboarding Checklist for Future Agents

1. Confirm whether run target is Electron runtime or browser-only dev server.
2. Check `isElectron` guard paths before changing services that depend on Node APIs.
3. When touching routing, re-verify:
   - `withHashLocation()` behavior
   - `/auth` and `/auth/logout` Express redirects
   - `/display` route and root layout switch logic
4. When touching live timing state, review both sides:
   - `alge.service.ts` (renderer)
   - `main.js` shared state and IPC handlers (main process)
5. If working on security/hardening, plan migration from `window.require` to `contextBridge` + preload-exposed APIs.

## Build/Run Notes

- Main dev command: `npm start` (Electron Forge start).
- Angular build command used by scripts: `ng build --base-href ./`.
- Angular output path configured in `angular.json` under `outputPath.base`.
