import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExportModelService } from "../../services/export-model.service";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatChipsModule } from "@angular/material/chips";
import { MatButtonModule } from "@angular/material/button";
import { SettingService } from "../../services/setting.service";

@Component({
    selector: "app-export-model",
    imports: [
        CommonModule,
        MatButtonToggleModule,
        ReactiveFormsModule,
        MatChipsModule,
        MatButtonModule,
    ],
    templateUrl: "./export-model.component.html",
    styleUrl: "./export-model.component.scss",

})
export class ExportModelComponent {

    exportModelForm: FormGroup = new FormGroup({
        exportType: new FormControl('', [Validators.required]),
        dataSize: new FormControl('', [Validators.required]),
        chipsArray: new FormControl([]),
    });

    constructor(
        public exportModelService: ExportModelService,
        public settingService: SettingService,
    ) {
        this.exportModelForm = new FormGroup({
            exportType: new FormControl(this.settingService.setting.exportFileType, [Validators.required]),
            dataSize: new FormControl(this.settingService.setting.exportDataSize, [Validators.required]),
            chipsArray: new FormControl(this.settingService.setting.dataToInclude),
        });
    }

    onExport() {
        this.exportModelService.onButtonClick.next(this.exportModelForm.value);
        this.exportModelForm.reset();
    }
}