import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { DataForExportFormat, ExportPenidngReturns } from '../../assets/models/ExportEntry';
import { NotificationService } from './notification.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserData } from '../../assets/models/EntryTransaction';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(
    private notificationService: NotificationService
  ) { }

  exportToExcelV2(obj: { data: DataForExportFormat[], custonerPerSheet: boolean, fullPageTotalData: any, showTotalRow: boolean, allCustomerTotal?: any, addressPerSheet?: boolean }, includeCustomerName = true, filePrefix = 'Inventory') {
    const fileName = filePrefix + '_' + this.generateFileName();

    const convertedFormat = this.convertData(obj.data, includeCustomerName);
    if (obj.showTotalRow)
      convertedFormat.push(obj.fullPageTotalData);
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(convertedFormat);
    const workbook: XLSX.WorkBook = { Sheets: { 'Full Data': worksheet }, SheetNames: ['Full Data'] };

    if (obj.custonerPerSheet) {
      const sheetPerCustomer: any = {};
      obj.data.forEach((item: DataForExportFormat) => {
        let name = item.customer.fullName || 'Unknown';
        if (name.length > 30) // sheet names cannot be more than 31 characters
          name = name.substring(0, 25) + '...';

        if (sheetPerCustomer[name])
          sheetPerCustomer[name].push(item);
        else
          sheetPerCustomer[name] = [item];
      });

      Object.keys(sheetPerCustomer).forEach((objectKey: string) => {
        const convertedFormat = this.convertData(sheetPerCustomer[objectKey], includeCustomerName);
        if (obj.showTotalRow)
          convertedFormat.push(this.getCustomerTotalData(obj.allCustomerTotal, objectKey));
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(convertedFormat);
        workbook.SheetNames.push(objectKey);
        workbook.Sheets[objectKey] = worksheet;
      });
    } else if (obj.addressPerSheet) {
      const sheetPerAddress: any = {};
      obj.data.forEach((item: DataForExportFormat) => {
        if (sheetPerAddress[item.shippingAddress])
          sheetPerAddress[item.shippingAddress].push(item);
        else
          sheetPerAddress[item.shippingAddress] = [item];
      });

      Object.keys(sheetPerAddress).forEach((objectKey: string) => {
        const convertedFormat = this.convertData(sheetPerAddress[objectKey], includeCustomerName);
        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(convertedFormat);
        workbook.SheetNames.push(objectKey);
        workbook.Sheets[objectKey] = worksheet;
      });
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    this.notificationService.exporting(fileName);
  }

  getCustomerTotalData(allcustomerTotalData: any, fullName: string) {
    const data = allcustomerTotalData[fullName] || {};

    const convert: any = {
      Product: 'All Total',
      Sent: data.sent || 0,
      Receieved: data.receieved || 0,
      Pending: data.pending || 0,
      'Total Amount': data.totalAmt || 0,
      'Paid Amount': data.paymentAmt || 0,
      'Due Amount': data.dueAmt || 0
    };

    return convert;
  }

  private convertData(data: DataForExportFormat[], includeCustomerName = true) {
    const convertedFormat: any[] = [];
    data.reverse();

    const exportTotal: any = {};
    exportTotal['Date'] = '';
    if (includeCustomerName) exportTotal['Customer'] = '';
    exportTotal['Address'] = '';
    exportTotal['Delivery Person'] = '';
    exportTotal['Product'] = 'Total';
    exportTotal['Sent'] = 0;
    exportTotal['Receieved'] = 0;
    exportTotal['Pending'] = 0;
    exportTotal['Rate/Unit'] = '';
    exportTotal['Total Amount'] = 0;
    exportTotal['Paid Amount'] = 0;
    exportTotal['Due Amount'] = 0;
    exportTotal['Extra Note'] = '';
    exportTotal['Status'] = '';

    data.forEach((item: DataForExportFormat) => {
      if (item.productDetail && item.productDetail.length > 0) {
        let isFirstRow = true;
        for (const product of item.productDetail) {
          const newObject: any = {};

          let recieve: any = product.recievedUnits;
          if (!product.productData.productReturnable)
            recieve = '';

          let pending: any = (product.sentUnits || 0) - (product.recievedUnits || 0);
          if (!product.productData.productReturnable)
            pending = '';

          if (isFirstRow) {
            newObject['Date'] = item.date || '';
            if (includeCustomerName) newObject['Customer'] = item.customer.fullName || '';
            newObject['Address'] = item.shippingAddress || '';
            newObject['Delivery Person'] = item.deliveryBoyList?.map((user: UserData) => user.fullName).join(", ");
          } else {
            newObject['Date'] = '';
            if (includeCustomerName) newObject['Customer'] = '';
            newObject['Address'] = '';
            newObject['Delivery Person'] = '';
          }

          newObject['Product'] = product.productData.name || '';
          newObject['Sent'] = product.sentUnits || 0;
          newObject['Receieved'] = recieve || 0;
          newObject['Pending'] = pending || 0;
          newObject['Rate/Unit'] = product.productData.rate || 0;

          if (isFirstRow) {
            newObject['Total Amount'] = item.totalAmt || 0;
            newObject['Paid Amount'] = 1 * (item.paymentAmt || 0);
            newObject['Due Amount'] = (item.totalAmt || 0) - (item.paymentAmt || 0);

            exportTotal['Total Amount'] += newObject['Total Amount'];
            exportTotal['Paid Amount'] += newObject['Paid Amount'];
            exportTotal['Due Amount'] += newObject['Due Amount'];
          } else {
            newObject['Total Amount'] = '';
            newObject['Paid Amount'] = '';
            newObject['Due Amount'] = '';
          }
          newObject['Extra Note'] = item.extraNote || '';

          if (isFirstRow) {
            newObject['Status'] = item.status || '';
            isFirstRow = false;
          }

          exportTotal['Sent'] += product.productData.productReturnable ? newObject['Sent'] : 0;
          exportTotal['Receieved'] += recieve === '' ? 0 : newObject['Receieved'];
          exportTotal['Pending'] += pending === '' ? 0 : newObject['Pending'];

          convertedFormat.push(newObject);
        }
      } else {
        const newObject: any = {};
        newObject['Date'] = item.date || '';
        if (includeCustomerName) newObject['Customer'] = item.customer.fullName || '';
        newObject['Address'] = item.shippingAddress || '';
        newObject['Delivery Person'] = item.deliveryBoyList.map((user: UserData) => user.fullName).join(", ");
        newObject['Product'] = '';
        newObject['Sent'] = '';
        newObject['Receieved'] = '';
        newObject['Pending'] = '';
        newObject['Rate/Unit'] = '';
        newObject['Total Amount'] = 0
        newObject['Paid Amount'] = 1 * (item.paymentAmt || 0);
        newObject['Due Amount'] = 0 - (item.paymentAmt || 0);

        exportTotal['Paid Amount'] += newObject['Paid Amount'];
        exportTotal['Due Amount'] += newObject['Due Amount'];
        newObject['Extra Note'] = item.extraNote || '';
        newObject['Status'] = item.status || '';

        convertedFormat.push(newObject);
      }
    });

    convertedFormat.push({});
    convertedFormat.push(exportTotal);

    return convertedFormat;
  }

  exportToPdf(data: DataForExportFormat[], includeCustomerName = true, filePrefix = 'Inventory'): void {
    const convertedFormat = this.convertData(data, includeCustomerName);

    const doc = new jsPDF('landscape');
    const fileName = filePrefix + '_' + this.generateFileName() + '.pdf';

    const columns = Object.keys(convertedFormat[0]).map(key => ({ title: key, dataKey: key })); // title refer to the column names and dataKey refer to key of object
    const rows = convertedFormat.map(entry => Object.values(entry)); // object inside object cant be processed here properly

    (doc as any).autoTable({
      head: [columns],
      body: rows,
    });

    doc.save(fileName);
    this.notificationService.exporting(fileName);
  }

  exportPendingReturn(data: ExportPenidngReturns[]) {
    const fileName = 'Pending Returns_' + this.generateFileName();

    const convertedFormat: any[] = [];
    const totalLine: any = {}
    let totalPending = 0;

    data.forEach((pendingData: ExportPenidngReturns) => {
      const exportPending: any = {
        "Customer Name": pendingData.customerName,
        "Total Pending": pendingData.totalPending,
      };
      totalPending += pendingData.totalPending;

      pendingData.pendingProducts.forEach((value: { name: string, pending: number }) => {
        exportPending[value.name] = value.pending;

        if (!totalLine[value.name])
          totalLine[value.name] = value.pending;
        else
          totalLine[value.name] += value.pending;

      });

      convertedFormat.push(exportPending);
    });

    totalLine['Customer Name'] = "Total";
    totalLine['Total Pending'] = totalPending;
    convertedFormat.push({}); // blank line
    convertedFormat.push(totalLine);

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(convertedFormat);
    const workbook: XLSX.WorkBook = { Sheets: { 'Pending Returns': worksheet }, SheetNames: ['Pending Returns'] };

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    this.notificationService.exporting(fileName);
  }

  private generateFileName(): string {
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');

    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1); // Months are zero-based
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    return `${day}${month}${year}_${hours}${minutes}${seconds}`;
  }
}
