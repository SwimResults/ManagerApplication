import {Component, OnDestroy} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Subscription} from 'rxjs';
import {
  SerialComService,
  SerialConnectionStatus,
  SerialMessage,
  SerialParity,
  SerialPortInfo
} from '../../../core/service/serial-com.service';
import {GroupBoxComponent} from '../../../layout/group-box/group-box.component';

@Component({
  selector: 'sr-live-timing-com-test',
  imports: [FormsModule, DatePipe, GroupBoxComponent],
  templateUrl: './live-timing-com-test.component.html',
  styleUrl: './live-timing-com-test.component.scss'
})
export class LiveTimingComTestComponent implements OnDestroy {
  ports: SerialPortInfo[] = [];
  messages: SerialMessage[] = [];

  selectedPortPath = '';
  baudRate = 9600;
  dataBits: 5 | 6 | 7 | 8 = 8;
  stopBits: 1 | 2 = 1;
  parity: SerialParity = 'none';

  isLoadingPorts = false;
  isBusy = false;
  status: SerialConnectionStatus = {
    isListening: false,
    portPath: null,
    error: null
  };

  readonly dataBitOptions: Array<5 | 6 | 7 | 8> = [5, 6, 7, 8];
  readonly stopBitOptions: Array<1 | 2> = [1, 2];
  readonly parityOptions: SerialParity[] = ['none', 'even', 'odd', 'mark', 'space'];
  readonly maxMessages = 300;

  private statusSubscription: Subscription;
  private messageSubscription: Subscription;

  constructor(private serialComService: SerialComService) {
    this.statusSubscription = this.serialComService.status.subscribe(status => {
      this.status = status;
      if (status.portPath) {
        this.selectedPortPath = status.portPath;
      }
    });

    this.messageSubscription = this.serialComService.messages.subscribe(message => {
      this.messages = [message, ...this.messages].slice(0, this.maxMessages);
    });

    this.refreshPorts();
  }

  ngOnDestroy() {
    this.statusSubscription.unsubscribe();
    this.messageSubscription.unsubscribe();
  }

  async refreshPorts() {
    this.isLoadingPorts = true;
    try {
      this.ports = await this.serialComService.listPorts();
      if (!this.selectedPortPath && this.ports.length > 0) {
        this.selectedPortPath = this.ports[0].path;
      }
    } finally {
      this.isLoadingPorts = false;
    }
  }

  async startListening() {
    if (!this.selectedPortPath || this.isBusy) {
      return;
    }

    this.isBusy = true;
    try {
      const result = await this.serialComService.startListening({
        path: this.selectedPortPath,
        baudRate: Number(this.baudRate),
        dataBits: this.dataBits,
        stopBits: this.stopBits,
        parity: this.parity
      });

      if (!result.success) {
        this.pushSystemMessage(`Failed to start listener: ${result.error ?? 'Unknown error'}`);
      }
    } finally {
      this.isBusy = false;
    }
  }

  async stopListening() {
    if (this.isBusy) {
      return;
    }

    this.isBusy = true;
    try {
      const result = await this.serialComService.stopListening();
      if (!result.success) {
        this.pushSystemMessage(`Failed to stop listener: ${result.error ?? 'Unknown error'}`);
      }
    } finally {
      this.isBusy = false;
    }
  }

  clearMessages() {
    this.messages = [];
  }

  trackByPort(index: number, port: SerialPortInfo): string {
    return port.path;
  }

  trackByMessage(index: number, message: SerialMessage): string {
    return `${message.timestamp}-${index}`;
  }

  private pushSystemMessage(message: string) {
    this.messages = [{
      message,
      hexDump: '',
      byteLength: message.length,
      timestamp: new Date().toISOString()
    }, ...this.messages].slice(0, this.maxMessages);
  }

}
