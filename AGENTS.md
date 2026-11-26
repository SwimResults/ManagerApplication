# AGENTS.md

Electron + Angular 20 desktop app ("SwimResults Manager"). Pool-side timing hardware (ALGE UDP, OMEGA serial) and result files go in, and the app pushes them to the SwimResults backend APIs. Overview and tech stack: [README.md](README.md).

## Read on demand (don't preload)

- Architecture, code map, routes, **IPC channel table**, checklists: [docs/architecture.md](docs/architecture.md)
- Multi-window sync (`alge:*` channels, display window): [docs/ipc-communication.md](docs/ipc-communication.md)
- OMEGA OSM6 serial protocol + real capture: [docs/protocols/omega-osm6.md](docs/protocols/omega-osm6.md)

## Where things are

- `main.js`: the whole Electron main process (windows, Express :3000, IPC, serial, `settings.json` persistence)
- `src/app/core/service/`: logic. `alge.service` (ALGE), `omega.service` (OMEGA), `import.service` (push timing), `file-watcher.service` (auto import), `electron.service` (Node/IPC bridge)
- REST clients and API models: the shared library `@swimresults/angular` (github.com/SwimResults/swimresults-angular), configured in `app.config.ts`. Only app-specific models stay in `src/app/core/model/`
- `src/app/content/`: feature pages. `src/app/layout/`: shell + reusable UI elements
- `src/environments/`: API URLs / OAuth issuer (dev points partly at localhost)
- `public/i18n/{de,en}.json`: translations in use (`src/assets/i18n` is unused)

## Commands

```bash
npm run electron-build-local   # dev build + run in Electron
npm run build                  # production Angular build (required before npm start / make)
npm test                       # Karma/Jasmine
```

## Rules

- The renderer uses Node via `window.require` (`nodeIntegration: true`, no context isolation). Guard Node/IPC code with `electronService.isElectron` so `ng serve` keeps working.
- Keep hash routing (`withHashLocation()`), and keep the `display` route before `""`.
- A new IPC channel needs changes in `main.js` **and** the renderer service, plus the table in `docs/architecture.md`.
- Wrap IPC/serial/UDP callbacks that update UI state in `NgZone.run`.
- Never commit secrets. The import password is user-entered at runtime.
- UI strings go through ngx-translate. Add keys to both `public/i18n/de.json` and `en.json`.
- Branches: work on `develop`, PRs target `master`.
- Keep docs in `docs/`, not the repo root. Update the relevant doc when behaviour it describes changes.
