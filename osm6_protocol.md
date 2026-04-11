# OSM6 Serial Protocol

This document describes the protocol implemented by `osm6_send.py` and `osm6_recv.py`, and how the receiver parses incoming bytes.

## Summary

The data stream is treated as a sequence of transmissions.
A transmission ends when the byte `0x04` is received, which is the EOT marker.
The receiver buffers bytes until it sees EOT, then prints/parses that complete transmission.

There is no higher-level packet header, length field, checksum, or escaping logic in the current implementation.
The protocol is purely byte-stream based.

## Transmission Rules

A transmission is built from raw bytes read from the serial port or from a `.bin` file.

Rules applied by the current implementation:

1. Bytes `0x0A` and `0x0D` are ignored.
   These are line-feed and carriage-return bytes.
   They do not become part of the parsed message and do not affect message boundaries.

2. Every other byte is appended to the current transmission buffer.

3. When byte `0x04` is encountered:
   - it is appended to the current transmission,
   - the current transmission is considered complete,
   - the transmission is emitted as one unit,
   - the buffer is cleared for the next transmission.

4. If the stream ends and there are still bytes in the buffer, that buffered data is considered an incomplete transmission.
   In the file reader this is printed as incomplete.
   In the serial receiver it remains buffered until the program stops.

## End Of Message

A message ends exactly when EOT `0x04` is received.

That means:

- A message can contain arbitrary bytes before EOT.
- EOT is part of the message payload as implemented.
- The receiver does not emit a message before EOT.
- If multiple EOT bytes arrive, each one closes the currently buffered message and starts the next one.

In practice, for your Electron app, the rule is:

- keep appending bytes to a buffer,
- ignore `0x0A` and `0x0D`,
- when `0x04` arrives, finalize the current message and hand it to the parser.

## Special Byte Labels

The parser converts certain byte values into readable labels instead of raw characters.

| Byte | Label |
| --- | --- |
| `0x01` | `[SOH]` |
| `0x08` | `[HOME]` |
| `0x02` | `[STX]` |
| `0x10` | `[LF]` |
| `0x04` | `[EOT]` |
| `0x20` | `¬` |
| `0x12` | `[DC2]` |
| `0x14` | `[DC4]` |

Any byte not in this table is converted with `chr(byte)` and appended as a literal character.

## Receiver Parsing Logic

The current `osm6_recv.py` logic works like this:

1. Open the selected serial port with the chosen baud rate.
2. Read raw bytes from the port.
3. For each byte:
   - ignore `0x0A` and `0x0D`,
   - map special bytes using the table above,
   - append the result to the current buffer,
   - if the byte is `0x04`, print the completed transmission and clear the buffer.

So the receiver is not line-based.
It is delimiter-based, and the delimiter is EOT.

## Sender Behavior

The current sender reads a `.bin` file from the same folder as the script and splits it into transmissions using the same rule as the receiver.

Sender rules:

1. Read the file as binary.
2. Ignore `0x0A` and `0x0D`.
3. Append all other bytes to the current transmission.
4. When `0x04` is reached, store that transmission as one unit.
5. Send one transmission per second.

This means the sender writes whole EOT-delimited transmissions to the serial port, not individual lines.

## Practical Integration Notes for Electron

If you implement this in Electron, the serial reader should behave like a byte accumulator rather than a line reader.

Recommended logic:

- maintain a `currentMessage` byte array or buffer,
- ignore `0x0A` and `0x0D`,
- translate special bytes to labels when rendering,
- flush the current message only when `0x04` is received,
- treat an unfinished buffer at shutdown as incomplete.

If you want to display the message as a string, do the mapping after the transmission is complete, not byte by byte in the UI layer.

## Example

If the incoming bytes are:

```text
0x01 0x02 0x41 0x20 0x14 0x04
```

The parsed transmission becomes:

```text
[SOH][STX]A¬[DC4][EOT]
```

The transmission ends at the `0x04` byte.

## Important Constraint

This protocol only works if both sides agree on the EOT framing rule.
If the sender does not include `0x04`, the receiver will never finalize the message.
If additional framing or escaping is needed later, the parser will need to be extended.
