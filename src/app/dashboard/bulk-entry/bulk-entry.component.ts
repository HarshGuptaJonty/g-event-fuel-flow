import { generateDateTimeKey, generateRandomString } from "../../shared/commonFunctions";
import { AfterViewChecked, Component, OnDestroy, OnInit } from "@angular/core";
import { DeliveryPersonDataService } from "../../services/delivery-person-data.service";
import { NewEntryComponent } from "../../common/new-entry/new-entry.component";
import { BulkEntryDataService } from "../../services/bulk-entry-data.service";
import { CustomerDataService } from "../../services/customer-data.service";
import { NotificationService } from "../../services/notification.service";
import { EntryTransaction } from "../../../assets/models/EntryTransaction";
import { EntryDataService } from "../../services/entry-data.service";
import { MatButtonModule } from "@angular/material/button";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { ProductService } from "../../services/product.service";
import { CommonModule } from "@angular/common";
import { ImportModel } from "../../../assets/models/Import";
import { Router } from "@angular/router";
import moment from "moment";
import * as XLSX from 'xlsx';
import { EfficiencyTrackerService } from "../../services/efficiencyTracker.service";

@Component({
    selector: 'app-bulk-entry',
    imports: [
        MatButtonModule,
        CommonModule,
        NewEntryComponent
    ],
    templateUrl: './bulk-entry.component.html',
    styleUrls: ['./bulk-entry.component.scss']
})

export class BulkEntryComponent implements OnInit, OnDestroy, AfterViewChecked {

    tableStructure = [
        { name: 'Date', key: 'Date' },
        { name: 'Customer', key: 'Customer' },
        { name: 'Address', key: 'Address' },
        { name: 'Delivery Person', key: 'Delivery Person' },
        { name: 'Product', key: 'Product' },
        { name: 'Sent', key: 'Sent' },
        { name: 'Receieved', key: 'Receieved' },
        { name: 'Rate/Unit', key: 'Rate/Unit' },
        { name: 'Total Amount', key: 'Total Amount' },
        { name: 'Paid Amount', key: 'Paid Amount' },
        { name: 'Extra Note', key: 'Extra Note' }
    ]

    newEntry = false;
    selectedFile: any;

    workbook?: XLSX.WorkBook;
    sheetList: any;
    private excelData: ImportModel[] = [];
    tableData: EntryTransaction[] = [];
    lastEntry?: EntryTransaction;
    convertedData: any = {};

    importTransaction?: EntryTransaction;
    uploadedIndex: number[] = [];

    currentSheetIndex = 0;
    currentIndex = -1;
    visibleData = 10;

    constructor(
        private afAuth: AngularFireAuth,
        private entryDataService: EntryDataService,
        private notificationService: NotificationService,
        private customerDataService: CustomerDataService,
        private deliveryPersonDataService: DeliveryPersonDataService,
        private router: Router,
        private productService: ProductService,
        private bulkEntryDataService: BulkEntryDataService,
        private efficiencyTrackerService: EfficiencyTrackerService
    ) { }

    ngOnInit(): void {
        if (this.bulkEntryDataService.hasData) {
            this.selectedFile = this.bulkEntryDataService.selectedFile;
            this.workbook = this.bulkEntryDataService.workbook;
            this.sheetList = this.bulkEntryDataService.sheetList;
            this.excelData = this.bulkEntryDataService.excelData;
            this.tableData = this.bulkEntryDataService.tableData;
            this.lastEntry = this.bulkEntryDataService.lastEntry;
            this.uploadedIndex = this.bulkEntryDataService.uploadedIndex;
            this.currentSheetIndex = this.bulkEntryDataService.currentSheetIndex;
            this.currentIndex = this.bulkEntryDataService.currentIndex;

            this.changeSheet(this.currentSheetIndex);
        }
    }

    ngOnDestroy(): void {
        if (this.selectedFile) {
            this.bulkEntryDataService.selectedFile = this.selectedFile;
            this.bulkEntryDataService.workbook = this.workbook;
            this.bulkEntryDataService.sheetList = this.sheetList;
            this.bulkEntryDataService.excelData = this.excelData;
            this.bulkEntryDataService.tableData = this.tableData;
            this.bulkEntryDataService.lastEntry = this.lastEntry;
            this.bulkEntryDataService.uploadedIndex = this.uploadedIndex;
            this.bulkEntryDataService.currentSheetIndex = this.currentSheetIndex;
            this.bulkEntryDataService.currentIndex = this.currentIndex;
            this.bulkEntryDataService.hasData = true;
        }
    }

    ngAfterViewChecked(): void {
        this.efficiencyTrackerService.stopTracking('bulk-entry');
    }

    onFileSelected(event: any): void {
        const target: DataTransfer = event.target as DataTransfer;
        if (target.files.length > 1) {
            this.notificationService.showNotification({
                heading: 'Cannot select multiple files.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red,
            });
            return;
        }

        this.selectedFile = event.target.files[0];

        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
            const bstr: string = e.target.result;

            this.workbook = XLSX.read(bstr, { type: 'binary' });
            this.sheetList = this.workbook.SheetNames;

            this.changeSheet(this.currentSheetIndex);
        };
        reader.readAsBinaryString(target.files[0]);
    }

    changeSheet(index: number) {
        this.currentSheetIndex = index;

        if (this.workbook) {
            const wsname: string = this.workbook.SheetNames[this.currentSheetIndex];
            if (this.convertedData[wsname]) {
                this.tableData = this.convertedData[wsname];
                return;
            }

            const ws: XLSX.WorkSheet = this.workbook.Sheets[wsname];
            this.excelData = XLSX.utils.sheet_to_json(ws, { defval: "" });

            this.generateEntryList();
            this.convertedData[wsname] = this.tableData;
        }
    }

    generateEntryList() {
        this.tableData = [];
        this.uploadedIndex = [];
        this.currentIndex = -1;

        this.excelData.forEach((importData: ImportModel, index: number) => {
            if (importData.Customer !== '') { // remove empty objects
                const entryTransaction = this.generateEntryTransaction(importData, index);
                if (entryTransaction)
                    this.tableData.push(entryTransaction);
            }
        });
    }

    generateEntryTransaction(importData: ImportModel, index: number) {
        const selectedProducts = [];
        const productData = this.productService.getProductObjectViaName(importData.Product);
        if (productData) {
            productData.productData.rate = parseInt(String(importData["Rate/Unit"]));
            productData.recievedUnits = parseInt(String(importData.Receieved));
            productData.sentUnits = parseInt(String(importData.Sent));

            selectedProducts.push(productData);
        }

        const date = this.getFormattedDate('DD/MM/YYYY', importData.Date);
        const transactionId = this.getFormattedDate('YYYYMMDD', importData.Date) + '_' + generateDateTimeKey() + '_' + generateRandomString(5);
        let customerData = this.customerDataService.getCustomerUserObjectViaName(importData.Customer);
        const deliveryPersonList = this.deliveryPersonDataService.getDeliveryPersonObjectViaNames(importData["Delivery Person"]);
        const totalAmount = parseInt(String(importData["Total Amount"]));
        const paidAmount = parseInt(String(importData["Paid Amount"]));

        if (!date && !customerData && !deliveryPersonList.length && !totalAmount && !paidAmount) {
            if (productData)
                this.lastEntry?.data.selectedProducts?.push(productData);
            return undefined;
        }

        if (!customerData) {
            customerData = {
                fullName: importData.Customer,
                phoneNumber: '',
                userId: ''
            }
        }

        const entryData: EntryTransaction = {
            data: {
                date: date,
                customer: customerData,
                deliveryBoyList: deliveryPersonList,
                total: totalAmount,
                payment: paidAmount,
                transactionId: transactionId,
                importIndex: index,
                extraDetails: importData["Extra Note"],
                shippingAddress: importData.Address,
                selectedProducts: selectedProducts
            }
        }

        this.lastEntry = entryData;
        return entryData;
    }

    addEntry(entry: EntryTransaction) {
        this.currentIndex = entry.data.importIndex || 0;

        this.importTransaction = entry;
        this.newEntry = true;
    }

    saveEntry(event: EntryTransaction) {
        this.uploadedIndex.push(this.currentIndex);

        delete event.data.importIndex; // this should not be saved in the database

        this.entryDataService.addNewEntry(event);

        this.newEntry = false;
    }

    getFormattedDate(format: string, date: string): string {
        const formatted = date ? moment(date, 'D MMM YYYY').format(format) : '';
        if (formatted === 'Invalid date')
            return '';
        return formatted;
    }

    removeFile() {
        this.bulkEntryDataService.clearData();

        this.selectedFile = null;
        this.workbook = undefined;
        this.sheetList = [];
        this.excelData = [];
        this.tableData = [];
        this.lastEntry = undefined;
        this.uploadedIndex = [];
        this.currentSheetIndex = 0;
        this.currentIndex = -1;

        window.location.reload();
    }

    openCustomerProfile(obj: any) {
        if (obj.userId) {
            this.router.navigate(['/dashboard/customers'], { queryParams: { userId: obj.userId } });
        } else {
            this.notificationService.showNotification({
                heading: 'Profile not setup.',
                message: obj.fullName + "'s profile is not complete!",
                duration: 5000,
                leftBarColor: this.notificationService.color.yellow
            });
        }
    }

    openDeliveryBoyProfile(obj: any) {
        if (obj.userId) {
            this.router.navigate(['/dashboard/delivery'], { queryParams: { userId: obj.userId } });
        } else {
            this.notificationService.showNotification({
                heading: 'Profile not setup.',
                message: obj.fullName + "'s profile is not complete!",
                duration: 5000,
                leftBarColor: this.notificationService.color.yellow
            });
        }
    }

    openProduct(product: any) {
        this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId: product.productData.productId } });
    }

    downloadSampleFile() {
        window.open('assets/sample/sample.xlsx', '_blank');
    }
}