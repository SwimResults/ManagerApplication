# SwimResults Manager (Helper Application)

Desktop app for **swimming meet organisers and result services** to run their meeting in [SwimResults](https://swimresults.de). It takes data from timing hardware and result software on the pool PC and pushes it live to the SwimResults backend.

![screenshot](https://github.com/user-attachments/assets/13c5fbe9-b6d9-4037-9507-238536c92bc8)

## What it does

**Implemented**

- **Live timing, ALGE**: receives UDP packets and pushes heat start, split and finish times to SwimResults
- **Live timing, OMEGA**: reads the RS-485 serial port (Swiss Timing OSM6 or UNT4 protocol); COM settings persist across restarts
- **Live display window**: a second window (e.g. a beamer) showing the running heat, synced with the main window
- **Import**: upload result or start-list files and text (e.g. EasyWK, PDF to text)
- **Auto import**: several file watchers re-upload result files whenever they change
- **Schedule and events**: browse events and heats, edit heat times, record incidents
- **View modes**: simple, advanced and expert UI levels
- **SwimResults login**: OAuth2 / OIDC (Keycloak, PKCE)
- **Serial COM tester**: raw serial port monitor for hardware debugging

**Planned**: create and edit meetings and their layout, DSV/LENEX import, participant/event/heat management, file list and schedule editing, certificate upload, billing, chat with the SwimResults team, data-consistency warnings.

## Tech stack

| Layer | Tech |
| --- | --- |
| Shell | Electron 35 (`main.js`), packaged with Electron Forge 7 (Squirrel/Windows, ZIP/macOS, deb, rpm) |
| UI | Angular 20 (standalone components, hash routing), Angular Material/CDK, SCSS, angular-split |
| State | RxJS services |
| i18n | ngx-translate (`public/i18n/{de,en}.json`) |
| Auth | angular-oauth2-oidc against `auth.swimresults.de` (Keycloak) |
| Hardware I/O | `node:dgram` (ALGE UDP), `serialport` 13 (OMEGA serial) |
| Local server | Express 5 on `127.0.0.1:3000` serves the built Angular app inside Electron |
| Tests | Karma + Jasmine |
| CI | GitHub Actions ([build.yml](.github/workflows/build.yml)): Windows build on every push; `v*` tags publish a GitHub Release |

Backend: the SwimResults microservices (meeting, athlete, start, import, user), configured in [`src/environments/`](src/environments/).

## Getting started

```bash
npm install
npm run electron-build-local   # Angular dev build + start Electron
npm start                      # Electron Forge start (uses the existing dist/)
npm run serve                  # Angular in the browser only (no Electron/hardware features)
npm test                       # unit tests
npm run make                   # installers for the current OS (make-win32 for Windows)
```

Environment variants: `electron-build-test` (test config) and the default `build` (production).

## Documentation

- [docs/README.md](docs/README.md): documentation index
- [docs/architecture.md](docs/architecture.md): process model, code map, IPC channels, data flows
- [docs/ipc-communication.md](docs/ipc-communication.md): multi-window state sync
- [docs/protocols/omega-osm6.md](docs/protocols/omega-osm6.md): OMEGA OSM6 serial protocol
- [AGENTS.md](AGENTS.md): quick start for AI coding agents

## License

See [LICENSE](LICENSE).
