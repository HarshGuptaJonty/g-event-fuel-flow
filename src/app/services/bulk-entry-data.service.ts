import { Injectable } from "@angular/core";
import { EntryTransaction } from "../../assets/models/EntryTransaction";
import { ImportModel } from "../../assets/models/Import";
import * as XLSX from 'xlsx';

@Injectable({
    providedIn: "root",
})
export class BulkEntryDataService { // service to save file untill user refresh the page or remove the file

    selectedFile: any;
    workbook?: XLSX.WorkBook;
    sheetList: any;
    excelData: ImportModel[] = [];
    tableData: EntryTransaction[] = [];
    lastEntry?: EntryTransaction;
    uploadedIndex: number[] = [];
    currentSheetIndex = 0;
    currentIndex = -1;

    hasData = false;

    clearData() {
        this.selectedFile = null;
        this.workbook = undefined;
        this.sheetList = undefined;
        this.excelData = [];
        this.tableData = [];
        this.lastEntry = undefined;
        this.uploadedIndex = [];
        this.currentSheetIndex = 0;
        this.currentIndex = -1;
    }
}