import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, Observable, ReplaySubject, Subject, Subscription, switchMap, timer} from 'rxjs';
import {CurrentHeatModel} from '../model/current-heat.model';
import {ConnectionState, State} from '../model/state.model';
import {ImportService} from './import.service';
import {SerialComService, SerialConnectionStatus, SerialMessage, SerialPortConfig, SerialPortInfo} from './serial-com.service';
import {TimingStateService} from './timing-state.service';
import {OmegaLivetimingSettingsImpl, OmegaParserMode} from '../model/omega-livetiming-settings.model';

interface OSM6Part1Frame {
  messageType: string;
  timeKind: string;
  timeType: string;
  event: number;
  heat: number;
  lapNumber: number;
  rank: number;
}

interface OSM6Part2Frame {
  lane: number;
  lap: number;
  time: number;
}

type OSM6Frame =
  | {kind: 'heartbeat'}
  | {kind: 'part1'; frame: OSM6Part1Frame}
  | {kind: 'part2'; frame: OSM6Part2Frame};

type UNT4Frame =
  | {kind: 'set'; event: number; heat: number}
  | {kind: 'rolling'; runningTime: number}
  | {kind: 'split'; lane: number; time: number};

@Injectable({
  providedIn: 'root'
})
export class OmegaService {
  private static readonly OMEGA_TIMEOUT_MS = 20_000;

  private messageSubject = new ReplaySubject<string>();
  message = this.messageSubject.asObservable();

  private omegaStateSubject = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  omegaState = this.omegaStateSubject.asObservable();

  private serialActiveSubject = new BehaviorSubject<boolean>(false);
  serialActive = this.serialActiveSubject.asObservable();

  serialStatus!: Observable<SerialConnectionStatus>;

  currentHeat!: Observable<CurrentHeatModel>;
  state!: Observable<State>;

  private pingSubject = new Subject<void>();
  private pendingPart1: OSM6Part1Frame | null = null;
  private pendingFinishAfterPart2 = false;
  private livetimingSettings = new OmegaLivetimingSettingsImpl();
  private unt4PendingStart = false;
  private unt4ActiveEvent: number | null = null;

  private serialStatusSubscription: Subscription;
  private serialMessageSubscription: Subscription;

  constructor(
    private importService: ImportService,
    private serialComService: SerialComService,
    private timingStateService: TimingStateService,
    private ngZone: NgZone
  ) {
    this.serialStatus = this.serialComService.status;
    this.currentHeat = this.timingStateService.currentHeat;
    this.state = this.timingStateService.state;
    this.setupTimeoutCheck();
    this.serialStatusSubscription = this.serialComService.status.subscribe(status => {
      this.ngZone.run(() => {
        this.serialActiveSubject.next(status.isListening);
        if (status.error) {
          this.omegaStateSubject.next(ConnectionState.ERROR);
        } else if (!status.isListening) {
          this.omegaStateSubject.next(ConnectionState.DISCONNECTED);
        }
      });
    });

    this.serialMessageSubscription = this.serialComService.messages.subscribe(message => {
      this.processSerialMessage(message);
    });
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    return this.serialComService.listPorts();
  }

  async startListening(config: SerialPortConfig) {
    const result = await this.serialComService.startListening(config);
    if (!result.success && result.error) {
      this.messageSubject.next(`Serial start failed: ${result.error}`);
    }
    return result;
  }

  async stopListening() {
    const result = await this.serialComService.stopListening();
    if (!result.success && result.error) {
      this.messageSubject.next(`Serial stop failed: ${result.error}`);
    }
    return result;
  }

  getLapIntervalMeters(): number {
    return this.livetimingSettings.lapIntervalMeters;
  }

  setLapIntervalMeters(value: number) {
    const normalized = Number.isFinite(value) && value > 0 ? Math.floor(value) : 100;
    this.livetimingSettings.lapIntervalMeters = normalized;
    this.messageSubject.next(`OMEGA: lap interval set to ${normalized}m`);
  }

  getParserMode(): OmegaParserMode {
    return this.livetimingSettings.parserMode;
  }

  setParserMode(mode: OmegaParserMode) {
    this.livetimingSettings.parserMode = mode;
    this.pendingPart1 = null;
    this.pendingFinishAfterPart2 = false;
    this.unt4PendingStart = false;
    this.unt4ActiveEvent = null;
    this.messageSubject.next(`OMEGA: parser mode set to ${mode}`);
  }

  setCurrentHeat(runningHeat: CurrentHeatModel) {
    this.timingStateService.setCurrentHeat(runningHeat);
  }

  setState(state: State) {
    this.timingStateService.setState(state);
  }

  private processSerialMessage(message: SerialMessage) {
    const bytes = Array.isArray(message.bytes) ? message.bytes : [];
    this.messageSubject.next(`[DEBUG] processSerialMessage: received ${bytes.length} bytes, byteLength=${message.byteLength}`);
    if (bytes.length === 0) {
      return;
    }

    this.receivePing();

    if (this.livetimingSettings.parserMode === 'UNT4') {
      this.processUnt4Message(message, bytes);
      return;
    }

    this.processOsm6Message(message, bytes);
  }

  private processOsm6Message(message: SerialMessage, bytes: number[]) {

    const frame = this.decodeFrame(bytes);
    if (!frame) {
      if (this.shouldFinishOnBlankPart2(bytes)) {
        this.messageSubject.next('OMEGA: blank finish payload received, finishing heat');
        this.finishHeat();
        this.pendingPart1 = null;
        this.pendingFinishAfterPart2 = false;
        return;
      }

      this.messageSubject.next(`OMEGA: Unparsed frame (${message.byteLength} bytes)`);
      return;
    }

    switch (frame.kind) {
      case 'heartbeat':
        this.messageSubject.next('OMEGA: heartbeat');
        break;
      case 'part1':
        this.pendingPart1 = frame.frame;
        this.pendingFinishAfterPart2 = this.isFinishFrame(frame.frame);

        if (frame.frame.messageType === '0') {
          this.messageSubject.next('OMEGA: ready signal received, finishing previous heat first');
          this.finishHeat();
          this.pendingFinishAfterPart2 = false;
        }

        this.applyHeatMetadata(frame.frame);
        this.messageSubject.next(`OMEGA: heat ${frame.frame.event}/${frame.frame.heat} (${frame.frame.messageType}/${frame.frame.timeKind})`);

        if (this.isStartFrame(frame.frame)) {
          this.beginHeat();
        }
        break;
      case 'part2':
        this.handlePart2Frame(frame.frame);
        break;
    }
  }

  private processUnt4Message(message: SerialMessage, bytes: number[]) {
    const frame = this.decodeUnt4Frame(bytes);
    if (!frame) {
      this.messageSubject.next(`UNT4: Unparsed frame (${message.byteLength} bytes)`);
      return;
    }

    switch (frame.kind) {
      case 'set': {
        const currentHeat = this.timingStateService.currentHeatValue;
        const hasCurrentEvent = currentHeat.event > 0;
        const isNewEvent = hasCurrentEvent && currentHeat.event !== frame.event;

        if (isNewEvent) {
          this.messageSubject.next(`UNT4: new event ${frame.event} detected, finishing previous heat`);
          this.finishHeat();
        }

        this.timingStateService.mutateCurrentHeat(heat => {
          heat.event = frame.event;
          heat.heat = frame.heat;
          heat.runningTime = -1;
        });
        this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);

        this.unt4ActiveEvent = frame.event;
        this.unt4PendingStart = true;
        this.messageSubject.next(`UNT4: set event/heat to ${frame.event}/${frame.heat}`);
        break;
      }
      case 'rolling': {
        this.timingStateService.mutateCurrentHeat(heat => {
          heat.runningTime = frame.runningTime;
        });

        if (this.unt4PendingStart && this.unt4ActiveEvent !== null) {
          this.messageSubject.next(`UNT4: first rolling frame for event ${this.unt4ActiveEvent}, starting heat`);
          this.beginHeat();
          this.unt4PendingStart = false;
        }

        this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
        break;
      }
      case 'split': {
        const competitor = this.timingStateService.getOrCreateCompetitor(frame.lane);
        const lap = competitor.lap + 1;
        const meters = lap * this.livetimingSettings.lapIntervalMeters;

        competitor.lap = lap;
        competitor.lapM = meters;
        competitor.splits.set(lap, frame.time);

        this.importService.laneTime(frame.lane, frame.time, meters, false);
        this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
        this.messageSubject.next(`UNT4: lane ${frame.lane}, lap ${lap}, time ${frame.time}`);
        break;
      }
    }
  }

  private decodeUnt4Frame(bytes: number[]): UNT4Frame | null {
    if (bytes.length < 3 || bytes[0] !== 0x01 || bytes[bytes.length - 1] !== 0x04) {
      return null;
    }

    if (bytes[1] === 0x08) {
      const payload = this.cleanUnt4Payload(this.bytesToText(bytes.slice(2, bytes.length - 1)));
      const numbers = payload.match(/\d+/g) ?? [];
      if (numbers.length < 2) {
        return null;
      }

      const event = Number(numbers[numbers.length - 2]);
      const heat = Number(numbers[numbers.length - 1]);
      if (!Number.isFinite(event) || !Number.isFinite(heat)) {
        return null;
      }

      return {kind: 'set', event, heat};
    }

    if (bytes[1] !== 0x14 || bytes.length < 8) {
      return null;
    }

    const frameType = String.fromCharCode(bytes[2]);
    const firstStxIndex = bytes.indexOf(0x02);
    const secondStxIndex = firstStxIndex >= 0 ? bytes.indexOf(0x02, firstStxIndex + 1) : -1;
    if (secondStxIndex < 0) {
      return null;
    }

    const payload = this.cleanUnt4Payload(this.bytesToText(bytes.slice(secondStxIndex + 1, bytes.length - 1)));
    const tokens = payload
      .replace(',', '.')
      .match(/-?\d+(?:\.\d+)?/g) ?? [];

    if (frameType === 'R') {
      if (tokens.length === 0) {
        return null;
      }
      const runningTime = this.parseOsm6Time(tokens[tokens.length - 1]);
      if (!Number.isFinite(runningTime)) {
        return null;
      }
      return {kind: 'rolling', runningTime};
    }

    if (frameType === 'S') {
      if (tokens.length < 2) {
        return null;
      }

      const lane = Number(tokens[0]);
      const time = this.parseOsm6Time(tokens[tokens.length - 1]);
      if (!Number.isFinite(lane) || !Number.isFinite(time)) {
        return null;
      }

      return {kind: 'split', lane, time};
    }

    return null;
  }

  private cleanUnt4Payload(text: string): string {
    return text
      .replace(/[\u0001\u0002\u0004\u0008\u0014]/g, '')
      .replace(/¬/g, ' ')
      .trim();
  }

  private handlePart2Frame(frame: OSM6Part2Frame) {
    const part1 = this.pendingPart1;
    if (!part1) {
      this.messageSubject.next(`OMEGA: lane ${frame.lane} time without pending header`);
      return;
    }

    if (this.isStartFrame(part1)) {
      this.messageSubject.next(`OMEGA: ignored start time-of-day payload (${frame.time})`);
      this.pendingPart1 = null;
      return;
    }

    this.applyHeatMetadata(part1);

    const competitor = this.timingStateService.getOrCreateCompetitor(frame.lane);

    // OMEGA can repeat the same lane/lap line; keep only the first received value.
    if (competitor.splits.has(frame.lap)) {
      this.messageSubject.next(`OMEGA: duplicate ignored lane ${frame.lane}, lap ${frame.lap}, time ${frame.time}`);
      this.pendingPart1 = null;

      if (this.pendingFinishAfterPart2) {
        this.finishHeat();
        this.pendingFinishAfterPart2 = false;
      }
      return;
    }

    competitor.lap = frame.lap;
    competitor.splits.set(frame.lap, frame.time);

    const done = part1.timeKind === 'A';
    // Calculate meters: lap * lapIntervalMeters
    const meters = frame.lap * this.livetimingSettings.lapIntervalMeters;
    competitor.lapM = meters;
    this.messageSubject.next(`[DEBUG] calculated meters: lap=${frame.lap} * interval=${this.livetimingSettings.lapIntervalMeters}m = ${meters}m`);
    this.importService.laneTime(frame.lane, frame.time, meters, done);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
    this.messageSubject.next(`OMEGA: lane ${frame.lane}, lap ${frame.lap}, time ${frame.time}${done ? ' (final)' : ''}`);
    this.pendingPart1 = null;

    if (this.pendingFinishAfterPart2) {
      this.finishHeat();
      this.pendingFinishAfterPart2 = false;
    }
  }

  private shouldFinishOnBlankPart2(bytes: number[]): boolean {
    const part1 = this.pendingPart1;
    if (!part1 || !this.isFinishFrame(part1)) {
      return false;
    }

    const rawText = this.bytesToText(bytes);
    const strippedText = rawText.replace(/[\u0001\u0002\u0004\u0008\u000a\u000d\u0010\u0012\u0014]/g, '');
    const isBlank = strippedText.trim().length === 0;
    this.messageSubject.next(`[DEBUG] blank finish check: raw=${JSON.stringify(rawText)} stripped=${JSON.stringify(strippedText)} blank=${isBlank}`);
    return isBlank;
  }

  private applyHeatMetadata(frame: OSM6Part1Frame) {
    this.timingStateService.mutateCurrentHeat(heat => {
      heat.event = frame.event;
      heat.heat = frame.heat;
      if (frame.lapNumber > 0) {
        heat.laps = frame.lapNumber;
      }
    });
  }

  private beginHeat() {
    this.messageSubject.next('OMEGA: start signal received, resetting heat times');
    this.pendingFinishAfterPart2 = false;
    this.timingStateService.setState(State.RUNNING);
    this.timingStateService.currentHeatValue.competitors.forEach(competitor => {
      competitor.splits = new Map<number, number>();
      competitor.lap = 0;
      competitor.lapM = 0;
    });
    this.importService.startHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
  }

  private finishHeat() {
    if (this.timingStateService.stateValue === State.READY) {
      return;
    }

    this.timingStateService.setState(State.READY);
    this.timingStateService.currentHeatValue.competitors.forEach(competitor => {
      competitor.splits = new Map<number, number>();
      competitor.lap = 0;
      competitor.lapM = 0;
    });
    this.importService.stopHeat(this.timingStateService.currentHeatValue.event, this.timingStateService.currentHeatValue.heat);
    this.timingStateService.setCurrentHeat(this.timingStateService.currentHeatValue);
  }

  private isStartFrame(frame: OSM6Part1Frame): boolean {
    return frame.timeKind === 'S';
  }

  private isFinishFrame(frame: OSM6Part1Frame): boolean {
    return frame.messageType === '1';
  }

  private decodeFrame(bytes: number[]): OSM6Frame | null {
    const hexDump = bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ');
    this.messageSubject.next(`[DEBUG] Raw bytes (${bytes.length}): ${hexDump}`);

    if (this.isHeartbeatFrame(bytes)) {
      this.messageSubject.next(`[DEBUG] Identified as heartbeat frame`);
      return {kind: 'heartbeat'};
    }

    // Check frame boundaries
    if (bytes.length < 4) {
      this.messageSubject.next(`[DEBUG] Frame too short (${bytes.length} < 4)`);
      return null;
    }
    if (bytes[0] !== 0x01) {
      this.messageSubject.next(`[DEBUG] Missing SOH at start (got 0x${bytes[0].toString(16).padStart(2, '0')})`);
      return null;
    }
    if (bytes[bytes.length - 1] !== 0x04) {
      this.messageSubject.next(`[DEBUG] Missing EOT at end (got 0x${bytes[bytes.length - 1].toString(16).padStart(2, '0')})`);
      return null;
    }

    const rawText = this.bytesToText(bytes);
    this.messageSubject.next(`[DEBUG] Raw text: ${JSON.stringify(rawText)}`);

    // Keep ASCII spaces because OSM6 uses fixed-width fields where spaces are meaningful.
    const text = rawText.replace(/[\u0001\u0002\u0004\u0008\u000a\u000d\u0010\u0012\u0014]/g, '');
    this.messageSubject.next(`[DEBUG] After stripping controls: ${JSON.stringify(text)} (len=${text.length})`);

    if (!text) {
      this.messageSubject.next(`[DEBUG] Text empty after stripping`);
      return null;
    }

    const detectedKind = this.detectFrameKind(bytes);
    this.messageSubject.next(`[DEBUG] Detected frame kind=${detectedKind}`);

    if (detectedKind === 'part2') {
      this.messageSubject.next(`[DEBUG] Attempting Part 2 parse`);
      const part2 = this.parsePart2(text);
      return part2 ? {kind: 'part2', frame: part2} : null;
    }

    if (detectedKind === 'part1') {
      this.messageSubject.next(`[DEBUG] Attempting Part 1 parse`);
      const part1 = this.parsePart1(text);
      return part1 ? {kind: 'part1', frame: part1} : null;
    }

    this.messageSubject.next(`[DEBUG] Could not determine frame kind from structure`);
    return null;
  }

  private detectFrameKind(bytes: number[]): 'part1' | 'part2' | null {
    // OSM6 docs: Part1 = [SOH][STX][HOME]... [EOT], Part2 = [SOH][STX][HOME][LF]... [STX]... [EOT]
    // Future-proof decision: classify by control-byte structure, never by payload characters like ':'.
    const firstStxIndex = bytes.indexOf(0x02);
    const secondStxIndex = firstStxIndex >= 0 ? bytes.indexOf(0x02, firstStxIndex + 1) : -1;
    const homeIndex = firstStxIndex >= 0 ? bytes.indexOf(0x08, firstStxIndex + 1) : -1;

    if (firstStxIndex < 0 || homeIndex < 0) {
      this.messageSubject.next(`[DEBUG] detectFrameKind: missing STX/HOME (firstSTX=${firstStxIndex}, HOME=${homeIndex})`);
      return null;
    }

    if (secondStxIndex >= 0) {
      const marker = homeIndex + 1 < bytes.length ? bytes[homeIndex + 1] : -1;
      const hasPart2LfMarker = marker === 0x10 || marker === 0x0A;
      this.messageSubject.next(
        `[DEBUG] detectFrameKind: second STX at ${secondStxIndex}, marker after HOME=0x${marker.toString(16).padStart(2, '0')}, hasPart2LfMarker=${hasPart2LfMarker}`
      );
      return 'part2';
    }

    this.messageSubject.next(`[DEBUG] detectFrameKind: only one STX -> part1`);
    return 'part1';
  }

  private parsePart1(text: string): OSM6Part1Frame | null {
    const normalized = text.slice(0, 14);
    this.messageSubject.next(`[DEBUG] Part1: normalized=${JSON.stringify(normalized)} (len=${normalized.length})`);

    if (normalized.length < 14) {
      this.messageSubject.next(`[DEBUG] Part1: too short (${normalized.length} < 14)`);
      return null;
    }

    const messageType = normalized.charAt(0);
    const timeKind = normalized.charAt(1);
    const timeType = normalized.charAt(2);
    const eventStr = normalized.slice(7, 10);
    const heatStr = normalized.slice(10, 12);
    const lapNumberStr = normalized.slice(5, 7);
    const rankStr = normalized.slice(12, 14);

    const event = Number(eventStr);
    const heat = Number(heatStr);
    const lapNumber = Number(lapNumberStr);
    const rank = Number(rankStr);

    this.messageSubject.next(
      `[DEBUG] Part1 parsed: type='${messageType}' kind='${timeKind}' ttype='${timeType}' ` +
      `event=${event}('${eventStr}') heat=${heat}('${heatStr}') ` +
      `lap=${lapNumber}('${lapNumberStr}') rank=${rank}('${rankStr}')`
    );

    return {
      messageType,
      timeKind,
      timeType,
      event,
      heat,
      lapNumber,
      rank
    };
  }

  private parsePart2(text: string): OSM6Part2Frame | null {
    let laneLength = 1;

    const laneStr = text.charAt(0);
    const lapStr = text.slice(1, 3);
    const timeText = text.slice(3);

    const lane = Number(laneStr);
    const lap = Number(lapStr);
    const time = this.parseOsm6Time(timeText);

    this.messageSubject.next(
      `[DEBUG] Part2: laneLen=${laneLength} lane=${lane}('${laneStr}') lap=${lap}('${lapStr}') ` +
      `timeText='${timeText}' time=${time}`
    );

    if (!Number.isFinite(lane)) {
      this.messageSubject.next(`[DEBUG] Part2: lane not finite (${lane})`);
      return null;
    }
    if (!Number.isFinite(lap)) {
      this.messageSubject.next(`[DEBUG] Part2: lap not finite (${lap})`);
      return null;
    }
    if (!Number.isFinite(time)) {
      this.messageSubject.next(`[DEBUG] Part2: time not finite (${time})`);
      return null;
    }

    return {lane, lap, time};
  }

  private parseOsm6Time(timeText: string): number {
    const trimmed = timeText.trim();
    this.messageSubject.next(`[DEBUG] parseOsm6Time input: '${timeText}' trimmed: '${trimmed}'`);
    if (!trimmed) {
      this.messageSubject.next(`[DEBUG] parseOsm6Time: empty after trim`);
      return NaN;
    }

    const segments = trimmed.split(':');
    this.messageSubject.next(`[DEBUG] parseOsm6Time segments: [${segments.map(s => `'${s}'`).join(', ')}] (count=${segments.length})`);
    if (segments.length < 1 || segments.length > 3) {
      this.messageSubject.next(`[DEBUG] parseOsm6Time: invalid segment count`);
      return NaN;
    }

    let hours = 0;
    let minutes = 0;
    let secondsPart = '';

    if (segments.length === 3) {
      hours = Number(segments[0]);
      minutes = Number(segments[1]);
      secondsPart = segments[2];
    } else if (segments.length === 2) {
      minutes = Number(segments[0]);
      secondsPart = segments[1];
    } else {
      // OSM6 can send second-only values like "43.27".
      secondsPart = segments[0];
    }

    secondsPart = secondsPart.slice(0, 5);

    this.messageSubject.next(`[DEBUG] parseOsm6Time: hh=${hours} mm=${minutes} ss.ms='${secondsPart}'`);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      this.messageSubject.next(`[DEBUG] parseOsm6Time: hrs/mins not finite`);
      return NaN;
    }

    const [secondsText, fractionText = '0'] = secondsPart.split(/[.,]/);
    const seconds = Number(secondsText);
    if (!Number.isFinite(seconds)) {
      this.messageSubject.next(`[DEBUG] parseOsm6Time: seconds not finite ('${secondsText}')`);
      return NaN;
    }

    const fractionMs = Number(fractionText.padEnd(3, '0').slice(0, 3));
    if (!Number.isFinite(fractionMs)) {
      this.messageSubject.next(`[DEBUG] parseOsm6Time: fraction not finite ('${fractionText}')`);
      return NaN;
    }

    const result = (((hours * 60) + minutes) * 60 + seconds) * 1000 + fractionMs;
    this.messageSubject.next(`[DEBUG] parseOsm6Time result: ${result}ms`);
    return result * 10;
  }

  private isHeartbeatFrame(bytes: number[]): boolean {
    return bytes.length === 7
      && bytes[0] === 0x01
      && bytes[1] === 0x12
      && bytes[2] === 0x39
      && bytes[3] === 0x14
      && bytes[4] === 0x54
      && bytes[5] === 0x50
      && bytes[6] === 0x04;
  }

  private bytesToText(bytes: number[]): string {
    return bytes.map(byte => String.fromCharCode(byte)).join('');
  }

  private receivePing() {
    this.ngZone.run(() => {
      this.omegaStateSubject.next(ConnectionState.CONNECTED);
    });
    this.pingSubject.next();
  }

  private setupTimeoutCheck() {
    this.pingSubject.pipe(
      switchMap(() => timer(OmegaService.OMEGA_TIMEOUT_MS))
    ).subscribe(() => {
      this.ngZone.run(() => {
        this.omegaStateSubject.next(ConnectionState.DISCONNECTED);
      });
    });
  }
}
