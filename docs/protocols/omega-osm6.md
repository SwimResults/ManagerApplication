# OMEGA / Swiss Timing OSM6 Protocol

Reference for the serial protocol parsed by [`omega.service.ts`](../../src/app/core/service/omega.service.ts) (parser mode `OSM6`; the alternative mode `UNT4` is implemented in the same file but not documented here).

- Source spec: Swiss Timing Ltd., *Quantum Swimming OSM6 Transmission Protocol*, document 0100.075
- Real capture of one heat: [samples/osm6-example-heat.txt](samples/osm6-example-heat.txt)

## 1. Serial settings

| Parameter    | Value                            |
| ------------ | -------------------------------- |
| Interface    | RS-485 (usually via USB adapter) |
| Baud rate    | 9600 – 115200 (app default 9600) |
| Data bits    | 8                                |
| Parity       | None                             |
| Stop bits    | 1                                |
| Encoding     | US-ASCII                         |
| Flow control | None                             |

App defaults live in [`omega-livetiming-settings.model.ts`](../../src/app/core/model/omega-livetiming-settings.model.ts) and are persisted to `settings.json` in Electron `userData` by `main.js`.

## 2. Byte framing (how the stream is split)

The stream is **delimited by EOT (`0x04`)**. There is no length field, checksum, or escaping.

1. Ignore `0x0A` and `0x0D` (they never affect boundaries).
2. Append every other byte to the current buffer.
3. On `0x04`: append it, emit the buffer as one transmission, clear the buffer.
4. Bytes left in the buffer at shutdown are an incomplete transmission.

In the app, framing happens in the main process (`main.js`, serial section). Each complete transmission goes to the renderer on `serial:message`, which [`serial-com.service.ts`](../../src/app/core/service/serial-com.service.ts) forwards to `OmegaService`.

### Control characters / display labels

| Byte   | Label    | Meaning                         |
| ------ | -------- | ------------------------------- |
| `0x01` | `[SOH]`  | Start of transmission           |
| `0x02` | `[STX]`  | Start of text                   |
| `0x04` | `[EOT]`  | End of transmission (delimiter) |
| `0x08` | `[HOME]` | Separator                       |
| `0x10` | `[LF]`   | Marks Part 2                    |
| `0x12` | `[DC2]`  | Identification command          |
| `0x14` | `[DC4]`  | Identification command          |
| `0x20` | `¬`      | Space                           |

Map bytes to labels only after a transmission is complete, never byte by byte in the UI.

## 3. Message structure

Timing messages come in **pairs**: Part 1 (header), then Part 2 (lane/time). Keep Part 1 buffered until its Part 2 arrives.

```
Part 1: [SOH][STX][HOME]ABCDDEEFFFGG¬¬HH[EOT]
Part 2: [SOH][STX][HOME][LF]JKK[STX]Hh:Mm:Ss.dc¬[EOT]
```

### Part 1 fields

| Field | Description  | Values                                                                        |
| ----- | ------------ | ----------------------------------------------------------------------------- |
| A     | Message type | 0=Ready, 1=Official end, 2=Online time, 3=Current results, 5=Previous results |
| B     | Time kind    | S=Start, I=Split, A=Finish, D=Relay takeover, R=Reaction, B=Button finish     |
| C     | Time type    | Space=Normal, E=Edited, +/- platform diff, 1–3 button ID                      |
| DD    | Used lanes   | Bitmask: first byte lanes 1–5, second byte lanes 6–10; bits 7,6,5 are `001`   |
| EE    | Lap number   | Integer                                                                       |
| FFF   | Event        | Integer                                                                       |
| GG    | Heat         | Integer                                                                       |
| HH    | Rank         | Integer                                                                       |

### Part 2 fields

| Field | Description                                      |
| ----- | ------------------------------------------------ |
| J     | Lane                                             |
| KK    | Current lap                                      |
| Time  | `Hh:Mm:Ss.dc`; leading parts may be blank spaces |

### Alive / heartbeat

```
[SOH][DC2]9[DC4]TP[EOT]
```

Sent continuously while the device is active. The app treats missing traffic for `OMEGA_TIMEOUT_MS` (20 s) as disconnected.

## 4. Real examples (from the sample capture)

```
[SOH][STX][HOME]2S¬>¬¬200103¬¬¬¬[EOT]          ← online, Start, event 001 heat 03
[SOH][STX][HOME]¬¬¬[STX]08.56:45.84¬[EOT]       ← start time of day
[SOH][STX][HOME]2I¬>¬¬200103¬¬¬1[EOT]          ← online, Split, rank 1
[SOH][STX][HOME]1¬1[STX]¬¬¬¬¬¬43.27¬[EOT]       ← lane 1, lap 1, 43.27
```

The `[LF]` marker from the spec does **not** always appear in real data. The parser tells Part 1 and Part 2 apart by structure.

## 5. App-specific behaviour (see `omega.service.ts`)

- The start-clock time of day is not used as race time.
- Only the **first** time per lane per lap is used; later duplicates are ignored.
- Meters per split come from the `lapIntervalMeters` setting.
- Finish frames are sent to SwimResults as `finished: "yes"`.
- When the next heat becomes ready, the previous heat is finished automatically.
- Per-lane time storage is reset on each heat start frame.
