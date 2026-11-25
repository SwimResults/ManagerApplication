Here is a clean **Markdown summary optimized for coding agents** based on your PDF:

---

# 🏊 Quantum Swimming OSM6 Transmission Protocol (Summary)

**Source:** Swiss Timing Ltd.
**Document:** 0100.075

---

## 📡 1. Communication Settings

| Parameter    | Value                            |
| ------------ | -------------------------------- |
| Interface    | RS-485                           |
| Baud Rate    | 9600 – 115200                    |
| Data Bits    | 8                                |
| Parity       | None                             |
| Stop Bits    | 1                                |
| Encoding     | US-ASCII                         |
| Flow Control | None (no handshake, no XON/XOFF) |

---

## 🧱 2. Message Structure

Messages are sent in **pairs (Part 1 + Part 2)**.

### 🔹 General Format

```
Part 1:
[SOH][STX][HOME]ABCDDEEFFFGG¬¬HH[EOT]

Part 2:
[SOH][STX][HOME][LF]JKK[STX]Hh:Mm:Ss.dc¬[EOT]
```

### 🔹 Control Characters

| Symbol | Hex | Meaning                |
| ------ | --- | ---------------------- |
| SOH    | 01  | Start of transmission  |
| STX    | 02  | Start of text          |
| EOT    | 04  | End of transmission    |
| HOME   | 08  | Separator              |
| LF     | 10  | Start of Part 2        |
| DC2    | 12  | Identification command |
| DC4    | 14  | Identification command |
| ¬      | 20  | Space                  |

---

## 🧩 3. Field Definitions

### Part 1 Fields

| Field | Description  | Values                                                                        |
| ----- | ------------ | ----------------------------------------------------------------------------- |
| A     | Message Type | 0=Ready, 1=Official End, 2=Online Time, 3=Current Results, 5=Previous Results |
| B     | Time Kind    | S=Start, I=Split, A=Finish, D=Relay Takeover, R=Reaction, B=Button Finish     |
| C     | Time Type    | Space=Normal, E=Edited, +/- Platform diff, 1–3 Button ID                      |
| DD    | Used Lanes   | Bitmask (see below)                                                           |
| EE    | Lap Number   | Integer                                                                       |
| FFF   | Event        | Integer                                                                       |
| GG    | Heat         | Integer                                                                       |
| HH    | Rank         | Integer                                                                       |

### Part 2 Fields

| Field | Description           |
| ----- | --------------------- |
| J     | Lane                  |
| KK    | Current Lap           |
| Time  | Format: `Hh:Mm:Ss.dc` |

---

## 🧮 4. Used Lanes Bitmask

* **2 bytes (DD)**
* First digit → lanes **1–5**
* Second digit → lanes **6–10**
* Each bit = 1 lane
* Bits 7, 6, 5 are always `0,0,1`

---

## 🔁 5. Message Examples

### 🟢 Race Start

```
Part 1: [SOH][STX][HOME]2S ... [EOT]
Part 2: [SOH][STX][HOME][LF]1 0 [STX]14:17:55.26 [EOT]
```

### 🟡 Split Time

```
Part 1: 2I ...
Part 2: Lane 2, Lap 1 → 21.89
```

### 🔵 Final Time

```
Part 1: 2A ...
Part 2: Lane 4 → 1:22.07
```

---

## ❤️ 6. Alive Message (Optional)

```
[SOH][DC2]9[DC4]TP[EOT]
```

Used as a heartbeat to indicate device is active.

---

## ⚠️ 7. Implementation Notes (Important for Agents)

* Always parse **strictly by structure**, not assumptions.
* Future protocol extensions may add new message types.
* Messages **always come in pairs** → must buffer Part 1 until Part 2 arrives.
* Use control characters to delimit fields, **not string splitting alone**.
* Time field may be partially blank depending on event type.

---

## 🧠 8. Suggested Parsing Strategy

```pseudo
read stream byte-by-byte
detect SOH → start message
buffer until EOT

if message contains LF → Part 2
else → Part 1

store Part 1 temporarily
when Part 2 arrives → combine + parse
```

---

## ✅ 9. Key Takeaways

* Binary-framed ASCII protocol
* Paired message design
* Bitmask lane encoding
* Fixed + variable field hybrid structure
* Designed for real-time swimming competition timing

---

If you want, I can turn this into:

* Go structs + parser
* TypeScript interface + RxJS stream handler
* or a full decoding library skeleton
