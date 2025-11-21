import { Component, OnInit } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { EntryDataService } from "../../services/entry-data.service";
import { CommonModule } from "@angular/common";
import { FirebaseService } from "../../services/firebase.service";
import * as XLSX from 'xlsx';
import { NotificationService } from "../../services/notification.service";
import { EfficiencyTrackerService } from "../../services/efficiencyTracker.service";
import { DEVELOPER, LOCAL_STORAGE_KEYS } from "../../shared/constants";

@Component({
    selector: 'app-custom-develop',
    imports: [
        MatButtonModule,
        CommonModule
    ],
    templateUrl: './custom-develop.component.html',
    styleUrl: './custom-develop.component.scss'
})
export class CustomDevelopComponent implements OnInit {

    selectedFile: any;
    excelData: any[][] = [];

    // Expired on 17 May 2025
    rawTransactionList: any[] = [];
    needToConvert: any[] = [];
    statArray: any = [];
    efficiencyReport: any[] = [];
    dataLoadReport: any[] = [];

    isStageEnvironment: boolean = DEVELOPER.IS_STAGE_ENVIRONMENT;
    childPaths = ['attendance', 'customer', 'deliveryPerson', 'depositObjectList', 'productList', 'tagList', 'transactionList'];

    constructor(
        private entryDataService: EntryDataService,
        private firebaseService: FirebaseService,
        private notificationService: NotificationService,
        private efficiencyService: EfficiencyTrackerService
    ) { }

    ngOnInit(): void {
        setTimeout(() => {
            this.showEfficiencyReport();
        }, 3000);
    }

    onFileSelected(event: any): void {
        const target: DataTransfer = event.target as DataTransfer;
        if (target.files.length > 1) {
            this.notificationService.showNotification({
                heading: 'Cannot use multiple files.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red,
            });
            return;
        }

        this.selectedFile = event.target.files[0];

        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
            const bstr: string = e.target.result;
            const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
            const wsname: string = wb.SheetNames[0];
            const ws: XLSX.WorkSheet = wb.Sheets[wsname];
            let data: any = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Filter out rows where all cells are empty or whitespace
            data = data.filter((row: any[]) => row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));

            this.excelData = data;
        };
        reader.readAsBinaryString(target.files[0]);
    }

    // Expired on 17 May 2025
    checkAvailable() {
        this.entryDataService.hardRefresh();
        this.rawTransactionList = this.entryDataService.getSortedTransactionList();
        this.needToConvert = this.rawTransactionList.filter((entry: any) => !!entry.data.deliveryBoy);

        this.statArray = [];
        this.statArray.push({
            label: 'Last checked on',
            value: new Date().toLocaleString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            })
        }, {
            label: 'Total data size',
            value: this.rawTransactionList.length
        }, {
            label: 'Data to convert size',
            value: this.needToConvert.length
        });
    }

    // Expired on 17 May 2025
    startConverting() {
        this.rawTransactionList = this.entryDataService.getSortedTransactionList();
        this.needToConvert = this.rawTransactionList.filter((entry: any) => !!entry.data.deliveryBoy);

        const needToConvertCount = this.needToConvert.length;
        let converted = 0;
        let uploaded = 0;
        let failed = 0;
        const failedList = [];

        this.statArray = [];
        this.statArray.push({
            label: 'Started on',
            value: new Date().toLocaleString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            }) + ':' + new Date().getMilliseconds()
        }, {
            label: 'Total data size',
            value: this.rawTransactionList.length
        }, {
            label: 'Data to convert size',
            value: this.needToConvert.length
        }, {
            label: 'Converted',
            value: converted.toString() + ', 0%'
        }, {
            label: 'Uploaded',
            value: uploaded.toString() + ', 0%'
        }, {
            label: 'Failed',
            value: failed.toString() + ', 0%'
        });

        this.needToConvert.forEach((entry: any) => {
            ++converted;
            this.statArray[3].value = converted.toString() + `, ${((converted / needToConvertCount) * 100).toFixed(2)}%`;

            entry.data.deliveryBoyList = [entry.data.deliveryBoy];
            entry.data.deliveryBoy = null;

            this.firebaseService.setData(`transactionList/${entry.data?.transactionId}`, entry).then(() => {
                ++uploaded;
                this.statArray[4].value = uploaded.toString() + `, ${((uploaded / needToConvertCount) * 100).toFixed(2)}%`;
            }).catch(() => {
                ++failed;
                this.statArray[5].value = failed.toString() + `, ${((failed / needToConvertCount) * 100).toFixed(2)}%`;
                failedList.push(entry);
            });
        });

        this.needToConvert = [];

        this.statArray.push({
            label: 'Ended on',
            value: new Date().toLocaleString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: true
            }) + ':' + new Date().getMilliseconds()
        });
    }

    clearStagingDatabase() {
        if (!this.isStageEnvironment) {
            this.notificationService.showNotification({
                heading: 'Not in staging environment',
                message: 'This action is only available in staging environment.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red,
            });
            return;
        }
        this.childPaths.forEach((childPath) => {
            this.firebaseService.setData(childPath, null).then(() => {
                console.log(`✅ Cleared staging data for ${DEVELOPER.STAGE_PATH_PREFIX + childPath}`);
            }).catch((error) => {
                console.error(`🔴 Failed to clear staging data for ${DEVELOPER.STAGE_PATH_PREFIX + childPath}: ${error.message}`);
            });
        });

        // localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_PROFILE);
        // sessionStorage.removeItem(LOCAL_STORAGE_KEYS.USER_PROFILE);
        sessionStorage.removeItem(LOCAL_STORAGE_KEYS.CUSTOMER_DATA);
        sessionStorage.removeItem(LOCAL_STORAGE_KEYS.DELIVERY_PERSON_DATA);
        // sessionStorage.removeItem(LOCAL_STORAGE_KEYS.SETTING);
        // sessionStorage.removeItem(LOCAL_STORAGE_KEYS.NAV_SETTING);
        sessionStorage.removeItem(LOCAL_STORAGE_KEYS.TAG_DATA);
        sessionStorage.removeItem(LOCAL_STORAGE_KEYS.ATTENDANCE_DATA);

        this.notificationService.showNotification({
            heading: 'Staging database executed.',
            message: 'Please check browser console for more details.',
            duration: 5000,
            leftBarColor: this.notificationService.color.yellow,
        });
    }

    showEfficiencyReport() {
        const efficiencyData = this.efficiencyService.getEfficiencyData();
        const dataLoadData = this.efficiencyService.getDataLoadData();

        this.efficiencyReport = Object.entries(efficiencyData).map(([key, value]) => ({
            label: key,
            ...value
        }));
        this.dataLoadReport = Object.entries(dataLoadData).map(([key, value]) => ({
            label: key,
            ...value
        }));
    }
}