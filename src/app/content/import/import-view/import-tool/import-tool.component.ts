import {Component, Input, OnInit, inject} from '@angular/core';
import {EventService, FileService} from "../../../../core/service/api";
import {MeetingEvent} from "../../../../core/model/meeting/meeting-event.model";
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {ImportFileRequest, ImportFileService} from "../../../../core/service/api/import/import-file.service";
import {MatDialog} from "@angular/material/dialog";
import {ImportTextDialogComponent} from "./import-text-dialog.component";
import {MatIcon} from '@angular/material/icon';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {TranslateModule} from '@ngx-translate/core';
import {BtnComponent} from '../../../../layout/element/buttons/btn/btn.component';
import {GroupBoxComponent} from '../../../../layout/group-box/group-box.component';
import {MeetingImpl} from '../../../../core/model/meeting/meeting.model';

interface FileList {
    name: string,
    url: string,
    event: MeetingEvent,
    exists: boolean
}

@Component({
    selector: 'sr-import-tool',
    templateUrl: './import-tool.component.html',
    styleUrls: ['./import-tool.component.scss'],
    imports: [MatIcon, ReactiveFormsModule, MatRadioGroup, MatRadioButton, TranslateModule, BtnComponent, GroupBoxComponent, FormsModule]
})
export class ImportToolComponent implements OnInit {
    private eventService = inject(EventService);
    private fileService = inject(FileService);
    private importService = inject(ImportFileService);
    private fb = inject(FormBuilder);
    private dialog = inject(MatDialog);

    @Input() meeting: MeetingImpl = {} as MeetingImpl;
    @Input() streamId: string = '';

    fileTypeList = [
        {name: 'DSV', value: "dsv"},
        {name: 'LEF', value: "lef"},
        {name: 'PDF', value: "pdf"},
        {name: 'TXT', value: "pdf_txt"},
    ];

    currentFileType: string = ""
    currentFile?: FileList;

    events: MeetingEvent[] = [];
    files: FileList[] = [];

    importUrl: string = "";
    importFileType: string = "";
    importListType: string = "";
    importExclude: string = "";
    importInclude: string = "";

    runningImport: boolean = false;
    runningCertificationToggle: boolean = false;

    ngOnInit() {
        this.fetchEvents();
    }

    fetchEvents() {
        if (this.meeting.meet_id) {
            this.eventService.getEventsByMeeting(this.meeting.meet_id).subscribe(data => {
                this.events = data;
                this.updateFileList()
            })
        }
    }

    updateFileList() {
        if (!this.meeting) return;
        this.files = [];
        for (const event of this.events) {
            const file = {
                url: this.fileService.getUrlFromMask(this.meeting.data.ftp_result_list_mask, event.number),
                name: "WK " + event.number,
                event: event,
                exists: false
            }
            //this.fileService.checkExistence(file.url).then(exists => file.exists = exists);
            this.files.push(file);
        }
    }

    onFileTypeChange(v: string) {
        this.currentFileType = v;
    }

    onSelectFile(file: FileList) {
        this.currentFile = file;
    }


    onImport() {
        if (!this.meeting.meet_id) return;
        this.runningImport = true;

        console.log("starting import...");

        const excludes: number[] = [];
        if (this.importExclude) {
            const exs = this.importExclude.split(",");
            for (const ex of exs) {
                excludes.push(Number(ex))
            }
        }


        const includes: number[] = [];
        if (this.importInclude) {
            const incs = this.importInclude.split(",");
            for (const inc of incs) {
                includes.push(Number(inc))
            }
        }

        const data: ImportFileRequest = {
            url: this.importUrl,
            text: "",
            file_extension: this.importFileType.toUpperCase(),
            file_type: this.importListType.toUpperCase(),
            exclude_events: excludes,
            include_events: includes,
            meeting: this.meeting.meet_id,
            stream_id: this.streamId
        }

        if (this.importFileType === 'pdf_txt') {
            this.importService.readToPdfBeforeImport(data).subscribe({
                next: (newData => {
                    console.log("successfully send pdf to text for '" + this.importUrl + "'")
                    console.log(newData.text)

                    const dialogRef = this.dialog.open(ImportTextDialogComponent, {
                        data: newData,
                        width: '80%'
                    });

                    dialogRef.afterClosed().subscribe(result => {
                        console.log('The dialog was closed');

                        this.importService.importFile(result).subscribe({
                            next: (_ => {
                                console.log("successfully send import for text")
                                this.runningImport = false;
                            }),
                            error: err => {
                                console.error(err);
                                this.runningImport = false;
                            }
                        })
                    });
                }),
                error: err => {
                    console.error(err);
                    this.runningImport = false;
                }
            })
        } else {
            this.importService.importFile(data).subscribe({
                next: (_ => {
                    console.log("successfully send import for '" + this.importUrl + "'")
                    this.runningImport = false;
                }),
                error: err => {
                    console.error(err);
                    this.runningImport = false;
                }
            })
        }

    }

    setCurrentFileForImport() {
        if (this.currentFile) {
            this.onFileTypeChange("pdf");

            this.importUrl = this.currentFile.url;
            this.importFileType = "pdf";
            this.importListType = "result_list";
            this.importExclude = "";
            this.importInclude = this.currentFile.event.number + ",";
        }
    }

    openCurrentFile() {
        if (this.currentFile && this.currentFile.url) {
            window.open(this.currentFile.url, "_blank")
        }
    }

    toggleCurrentFileEventCertification() {
        if (this.currentFile && this.meeting.meet_id) {
            this.runningCertificationToggle = true;
            this.eventService.updateEventCertification(this.meeting.meet_id, this.currentFile?.event.number).subscribe({
                next: (_ => {
                    this.runningCertificationToggle = false;
                    this.fetchEvents();
                }),
                error: (_ => {
                    this.runningCertificationToggle = false;
                })
            });
        }
    }
}

