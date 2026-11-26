# Architecture

Last reviewed: 2026-11-25 (v0.3.3)

## Process model

```
┌──────────────────────── Electron main process (main.js) ────────────────────────┐
│ Express on 127.0.0.1:3000 serves dist/swim-results-manager/browser              │
│ sharedState: live-timing heat/state, viewMode, omegaSettings                     │
│ settings.json in app.getPath('userData')  ← persisted viewMode + omega settings  │
│ SerialPort (optional native dep) → EOT framing → 'serial:message' to renderer    │
│ ipcMain handlers (table below)                                                   │
└───────────────▲───────────────────────────────────────────▲──────────────────────┘
                │ IPC                                       │ IPC
┌───────────────┴──────────── Main window ────┐   ┌────────┴── Display window ─────┐
│ Angular app (hash routing), full shell      │   │ same app at #/display          │
│ ALGE: UDP via node:dgram in the renderer    │   │ shell hidden, live board only  │
│ OMEGA: serial frames from main              │   │ reads shared heat state        │
└──────────────────────┬──────────────────────┘   └────────────────────────────────┘
                       │ HTTPS (JWT / OAuth2 PKCE via Keycloak)
              SwimResults backend APIs (api.swimresults.de/*)
```

- Renderer windows run with `nodeIntegration: true` and `contextIsolation: false`, so Angular reaches Node through `window.require(...)` inside [`electron.service.ts`](../src/app/core/service/electron.service.ts). `electron/preload.js` exists but is **not wired** into any window.
- Angular also runs in a plain browser (`npm run serve`). Every Electron-only code path is guarded with `electronService.isElectron`.

## Key files

| Concern | File |
| --- | --- |
| Main process (windows, IPC, Express, serial, settings) | [`main.js`](../main.js) |
| Renderer → Node/IPC wrapper, UDP listener | [`electron.service.ts`](../src/app/core/service/electron.service.ts) |
| Routes | [`app.routes.ts`](../src/app/app.routes.ts) |
| Providers (hash router, i18n, OAuth, interceptors) | [`app.config.ts`](../src/app/app.config.ts) |
| Shell vs display layout switch | [`app.component.ts`](../src/app/app.component.ts) |
| Shared timing state (heat, running state) | [`timing-state.service.ts`](../src/app/core/service/timing-state.service.ts) |
| ALGE parsing + cross-window IPC sync | [`alge.service.ts`](../src/app/core/service/alge.service.ts) |
| OMEGA parsing (OSM6 / UNT4) | [`omega.service.ts`](../src/app/core/service/omega.service.ts) |
| Serial port renderer API | [`serial-com.service.ts`](../src/app/core/service/serial-com.service.ts) |
| Push timing to SwimResults (`START` / `time` / `STOP`) | [`import.service.ts`](../src/app/core/service/import.service.ts) |
| File (result list) auto-import / watcher | [`file-watcher.service.ts`](../src/app/core/service/file-watcher.service.ts) |
| Selected meeting (+ theme colours) | [`current-meeting.service.ts`](../src/app/core/service/current-meeting.service.ts) |
| simple / advanced / expert UI modes | [`view-mode.service.ts`](../src/app/core/service/view-mode.service.ts), `active-view-mode.directive.ts` |
| Backend REST clients + API data models | [`@swimresults/angular`](https://github.com/SwimResults/swimresults-angular) (shared with the WebApplication; models based on the generated `@swimresults/api` types). Configured in [`app.config.ts`](../src/app/app.config.ts) (`SWIMRESULTS_API_CONFIG`: `environment.api_urls` + OAuth header for the import SSE stream) |
| App-only models (ALGE/OMEGA settings, state, import config) | [`src/app/core/model/`](../src/app/core/model/) |
| API base URLs, OAuth issuer | [`src/environments/`](../src/environments/) |

## Source layout

```
src/app/
  content/        feature pages
    live-timing/  old-view (ALGE), omega, com-test, display, view
    import/       manual import (file/text), auto-import (file watchers), logs/progress
    event/        schedule (event list) and event detail
    starts/       start list components
    dialog/       heat time / incident edit dialogs
    auth/         OAuth callback + logout
  core/           services, models, directives, guards, interceptors, pipes, functions
  layout/         shell (header, sidebar, status bar, main), reusable UI elements, windows
public/i18n/      translations actually loaded at runtime (de, en)
```

`src/assets/i18n/` (cs, de, en, ru, ua) is **not** in the Angular `assets` config and looks unused.

## Routes (hash routing: `#/...`)

| Path | Component | Purpose |
| --- | --- | --- |
| `display` | WindowLiveTimingDisplayComponent | second-window live display (shell hidden) |
| `old` | LiveTimingOldViewComponent | ALGE UDP live timing |
| `omega` | LiveTimingOmegaComponent | OMEGA serial live timing |
| `com-test` | LiveTimingComTestComponent | raw serial port tester |
| `import` / `auto-import` | Import / AutoImport views | upload or watch result files |
| `schedule`, `event/:event_number` | Event list / detail | meeting schedule, heats, incidents |
| `auth`, `auth/logout` | Auth / Logout | OAuth callbacks |
| `""` | MainComponent | home |

Express rewrites `/auth` → `/#/auth?...` and `/auth/logout` → `/#/auth/logout`, so the redirect URIs (`window.location.origin + '/auth'`) work with hash routing.

## Live-timing data flow

**ALGE (UDP):** UDP socket in the renderer (`ElectronService.startUdpListener`) → `AlgeService.processUdpMessage` → `TimingStateService` → `ImportService` POSTs to `{apiUrl}import/v1/alge/meet/{meet_id}`.

**OMEGA (serial):** main process opens `SerialPort` and frames bytes by EOT → `serial:message` → `SerialComService` → `OmegaService` parses OSM6 or UNT4 → `ImportService.startHeat/laneTime/stopHeat` (same endpoint). Protocol: [protocols/omega-osm6.md](protocols/omega-osm6.md).

**Display window:** the renderer sends `alge:update-*` to main. Main stores the value and broadcasts `alge:state-changed:*`, and every window re-reads with `alge:get-*`. Details: [ipc-communication.md](ipc-communication.md).

## IPC channels (`main.js`)

| Kind | Channels |
| --- | --- |
| `handle` (invoke) | `dialog:openFile`, `app:get-version`, `window:create-display`, `alge:get-current-heat`, `alge:get-state`, `alge:get-alge-state`, `alge:get-udp-active`, `view-mode:get`, `view-mode:set`, `omega:get-settings`, `omega:set-settings`, `serial:list-ports`, `serial:get-status`, `serial:start-listening`, `serial:stop-listening` |
| `on` (renderer → main) | `alge:update-current-heat`, `alge:update-state`, `alge:update-alge-state`, `alge:update-udp-active` |
| main → renderer | `alge:state-changed:<type>`, `view-mode:changed`, `serial:message`, `serial:status`, `serial:error` |

When you add a channel, update both sides and this table.

## Change checklists

- **Routing:** keep `withHashLocation()`, the Express `/auth` rewrites, and `display` declared before `""`.
- **Live-timing state:** change `alge.service.ts`/`timing-state.service.ts` and the `sharedState` + handlers in `main.js` together.
- **Settings to persist:** add them to `sharedState`, the load/persist helpers and the `settings.json` writer in `main.js`, then add get/set IPC.
- **Native deps:** `serialport` loads optionally (the app still starts without it). Forge's `auto-unpack-natives` plugin handles packaging.

## Known technical debt

- Insecure `webPreferences` (`nodeIntegration`, no context isolation, `webSecurity: false`). Hardening means moving `window.require` usage behind a `contextBridge` preload.
- Timing pushes authenticate with a password in the request body (`ImportConfig`), not a JWT.
- `environment.ts` (dev) mixes localhost and api-dev URLs, so check it before debugging API errors.
- Many `*.spec.ts` files are untouched CLI scaffolds.
