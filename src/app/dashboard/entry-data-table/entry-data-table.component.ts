import { CommonModule } from '@angular/common';
import { AfterViewChecked, AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { Customer } from '../../../assets/models/Customer';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { EntryTransaction } from '../../../assets/models/EntryTransaction';
import { dateConverter } from '../../shared/commonFunctions';
import { MatButtonModule } from '@angular/material/button';
import { NewEntryComponent } from '../../common/new-entry/new-entry.component';
import { EntryDataService } from '../../services/entry-data.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';
import { ConfirmationModelService } from '../../services/confirmation-model.service';
import { EntryDetailModelService } from '../../services/entry-detail-model.service';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { ExportService } from '../../services/export.service';
import { DeliveryPerson } from '../../../assets/models/DeliveryPerson';
import { CustomerDataService } from '../../services/customer-data.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ExportModelService } from '../../services/export-model.service';
import { ShortcutService } from '../../services/shortcut.service';
import { SettingService } from '../../services/setting.service';
import { TagService } from '../../services/tag.service';
import { LOCAL_STORAGE_KEYS } from '../../shared/constants';

@Component({
  selector: 'app-entry-data-table',
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    NewEntryComponent,
    MatPaginatorModule,
    MatCheckboxModule
  ],
  templateUrl: './entry-data-table.component.html',
  styleUrl: './entry-data-table.component.scss'
})
export class EntryDataTableComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked {

  @Input() customerObject?: Customer;
  @Input() deliveryPersonObject?: DeliveryPerson;
  @Input() isCustomer = true;
  @Input() loadEntries: EntryTransaction[] = []; // load entries passed by move activity
  @Input() isLoadCustomEntries = false;
  @Input() showCheckBox = false;

  @Output() updateDataSource = new EventEmitter<any>();
  @Output() updateDueAmount = new EventEmitter<number>();
  @Output() showDeposit = new EventEmitter<any>();
  @Output() moveEntries = new EventEmitter<any>(); // pass on the selected entries to be moved

  @ViewChild('checkBox', { static: true }) checkBox!: TemplateRef<any>;
  @ViewChild('plainText', { static: true }) plainText!: TemplateRef<any>;
  @ViewChild('amountText', { static: true }) amountText!: TemplateRef<any>;
  @ViewChild('nameText', { static: true }) nameText!: TemplateRef<any>;
  @ViewChild('dnameText', { static: true }) dnameText!: TemplateRef<any>;
  @ViewChild('actionText', { static: true }) actionText!: TemplateRef<any>;
  @ViewChild('productDetail', { static: true }) productDetail!: TemplateRef<any>;
  @ViewChild('tagList', { static: true }) tagList!: TemplateRef<any>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  tableStructure = [
    {
      key: 'date',
      label: 'Date',
      dataType: 'plainText'
    }, {
      key: 'deliveryBoyList',
      label: 'Delivery Boy',
      customClass: 'witdh-limit-200',
      dataType: 'dnameText'
    }, {
      key: 'shippingAddress',
      label: 'Address',
      customClass: 'witdh-limit-200',
      dataType: 'plainText'
    }, {
      key: 'productData.name',
      label: 'Product',
      customClass: 'witdh-limit-200',
      dataType: 'productDetail',
      isLink: true
    }, {
      key: 'sentUnits',
      label: 'Sent',
      customClass: 'text-right',
      dataType: 'productDetail'
    }, {
      key: 'recievedUnits',
      label: 'Recieved',
      customClass: 'text-right',
      dataType: 'productDetail'
    }, {
      key: 'productData.pending',
      label: 'Pending',
      customClass: 'text-right',
      dataType: 'productDetail'
    }, {
      key: 'productData.rate',
      label: 'Rate/Unit',
      customClass: 'text-right',
      dataType: 'productDetail',
      isAmount: true
    }, {
      key: 'totalAmt',
      label: 'Total Amount',
      customClass: 'text-right',
      dataType: 'amountText'
    }, {
      key: 'paymentAmt',
      label: 'Payment',
      customClass: 'text-right',
      dataType: 'amountText'
    }, {
      key: 'dueAmt',
      label: 'Due Amount',
      customClass: 'text-right',
      dataType: 'amountText'
    }, {
      key: 'action',
      label: 'Action',
      customClass: 'text-right',
      dataType: 'actionText'
    }
  ]

  secondRowTableStructure = [
    {
      key: 'status',
      dataType: 'plainText',
      width: 1
    }, {
      key: 'tagList',
      dataType: 'tagList',
      width: 2
    }, {
      key: 'extraNote',
      dataType: 'plainText',
      width: this.tableStructure.length - 3
    }
  ]

  dueAmount = 0;
  processedTableData?: any;
  rawTransactionList: EntryTransaction[] = [];
  newEntry = false;
  isEditing = false;
  isDuplicate = false;
  entryDataAvaliable = false;
  canSelectRows = false;
  openTransaction?: EntryTransaction;
  isRefreshing = false;
  selectedRows: any = [];
  tagObject: any = {};

  dataSource = new MatTableDataSource<any>([]);

  constructor(
    private afAuth: AngularFireAuth,
    private entryDataService: EntryDataService,
    private notificationService: NotificationService,
    private confirmationModelService: ConfirmationModelService,
    private entryDetailModelService: EntryDetailModelService,
    private router: Router,
    private exportService: ExportService,
    private customerDataService: CustomerDataService,
    private exportModelService: ExportModelService,
    private shortcutService: ShortcutService,
    private settingService: SettingService,
    private tagService: TagService
  ) {
    const storedTagObject = localStorage.getItem(LOCAL_STORAGE_KEYS.TAG_DATA);
    if (storedTagObject)
      this.tagObject = JSON.parse(storedTagObject);
  }

  ngOnInit(): void {
    if (this.showCheckBox) this.toggleSelectRow(); // show check box if loading moving entries

    if (!this.isCustomer)
      this.modifyTableStructureToDeliveryType();

    this.shortcutService.shortcutTriggered.subscribe(key => {
      if (key === this.shortcutService.SHORTCUT.NEW_ENTRY)
        this.newEntry = true;
    });

    this.tagService.isDataChanged.subscribe(flag => {
      if (flag)
        this.tagObject = this.tagService.getTagObject();
    })
    this.tagObject = this.tagService.getTagObject();
  }

  ngOnChanges(): void {
    this.refreshEntryData(); // to refersh first time
    this.entryDataAvaliable = this.rawTransactionList.length > 0;

    this.entryDataService.isDataChanged?.subscribe(flag => {
      if (flag) {
        this.entryDataAvaliable = true;
        this.refreshEntryData(); // to refresh when there is data change
        this.newEntry = false;
        this.isRefreshing = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  ngAfterViewChecked(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  modifyTableStructureToDeliveryType() {
    this.tableStructure[1] = {
      key: 'customer',
      label: 'Customer',
      customClass: 'width-limit-200',
      dataType: 'nameText'
    };
    this.tableStructure.splice(4, 1);
  }

  refreshData() {
    if (this.isRefreshing)
      return;
    this.isRefreshing = true;

    setTimeout(() => {
      if (this.entryDataAvaliable) {
        this.refreshEntryData();
        this.notificationService.transactionListRefreshed();
      } else {
        this.entryDataService.hardRefresh();

        this.notificationService.showNotification({
          heading: 'No data found!',
          message: 'Initiating hard refresh.',
          duration: 4000,
          leftBarColor: this.notificationService.color.yellow
        });
      }
      this.isRefreshing = false;
    }, 1000);
  }

  openExportPopup() {
    this.exportModelService.showModel({
      hasSelectedRows: this.selectedRows.length > 0,
      hasSelectedCustomer: true,
    }).subscribe(result => {
      this.exportModelService.hideModel();

      if (result) {
        const excel = result.exportType === 'excel';
        const allPage = result.dataSize === 'allPage';
        const thisPage = result.dataSize === 'thisPage';
        const newSheet = result.chipsArray?.includes('newSheet') || false;
        const newAddress = result.chipsArray?.includes('newAddress') || false;
        const totalRow = result.chipsArray?.includes('totalRow') || false;
        this.exportFile(excel, allPage, thisPage, newSheet, totalRow, newAddress);
      }
    });
  }

  exportFile(excel: boolean, allPage: boolean, thisPage: boolean, newSheet: boolean, totalRow: boolean, newAddress: boolean) {
    let dataForExport = [];

    const forAllTotal: any = {};
    if (totalRow) {
      forAllTotal['Product'] = 'All Total';
      forAllTotal['Sent'] = this.getStat('sentSum');
      forAllTotal['Receieved'] = this.getStat('recieveSum');
      forAllTotal['Pending'] = this.getStat('pending');
      forAllTotal['Total Amount'] = this.getStat('totAmt');
      forAllTotal['Paid Amount'] = this.getStat('paidAmt');
      forAllTotal['Due Amount'] = this.dueAmount;
    }

    if (thisPage && (this.paginator?.pageSize || 40) >= this.dataSource.data.length)
      allPage = true;

    if (allPage)
      dataForExport = [...this.dataSource.data];
    else if (thisPage) {
      const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
      const endIndex = startIndex + this.paginator.pageSize;
      const displayedRows = [...this.dataSource.data].slice(startIndex, endIndex);
      dataForExport = displayedRows;
    } else
      dataForExport = [...this.selectedRows];

    if (excel)
      this.exportService.exportToExcelV2({ data: dataForExport, custonerPerSheet: newSheet, fullPageTotalData: forAllTotal, showTotalRow: totalRow, addressPerSheet: newAddress }, false, this.customerObject?.data.fullName);
    else
      this.exportService.exportToPdf(dataForExport);
  }

  getStat(type: string): number {
    let result = 0;
    if (type === 'sentSum') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.sentUnits);
      }
    } else if (type === 'recieveSum') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.recievedUnits);
      }
    } else if (type === 'pending') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.sentUnits) - parseInt(product.recievedUnits);
      }
    } else if (type === 'totAmt') {
      for (const obj of this.dataSource.data)
        result += parseInt(obj.totalAmt);
    } else if (type === 'paidAmt') {
      for (const obj of this.dataSource.data)
        result += parseInt(obj.paymentAmt);
    }
    return result || 0;
  }

  async refreshEntryData() {
    this.newEntry = false;
    this.dueAmount = 0;
    this.rawTransactionList = [];
    this.processedTableData = null;
    this.openTransaction = undefined;
    if (this.canSelectRows) this.toggleSelectRow();

    if (this.isLoadCustomEntries)
      this.rawTransactionList = this.loadEntries;
    else if (this.isCustomer)
      this.rawTransactionList = this.entryDataService.getCustomerTransactionList(this.customerObject?.data?.userId);
    else
      this.rawTransactionList = this.entryDataService.getDeliveryPersonTransactionList(this.deliveryPersonObject?.data?.userId);
    this.tagObject = this.tagService.getTagObject();
    this.processedTableData = this.rawTransactionList.map((item: EntryTransaction, index) => this.transformItem(item, index)).reverse();

    this.dataSource.data = this.processedTableData;
    this.resetPaginator();
    this.updateDataSource.emit(this.processedTableData);
    this.updateDueAmount.emit(this.dueAmount);
  }

  resetPaginator() {
    if (this.paginator) {
      this.paginator.pageIndex = 0;
      this.dataSource.paginator = this.paginator;
    }
  }

  transformItem(item: EntryTransaction, index = 0) {
    const payment = item.data?.payment || 0;
    const totalAmt = item.data.total || 0;
    const tagList = item.data.tags || [];

    this.dueAmount += totalAmt - payment;

    return {
      index: index,
      date: dateConverter(item.data?.date || ''),
      customer: {
        fullName: this.customerDataService.getName(item.data?.customer?.userId) || item.data?.customer?.fullName,
        phoneNumber: item.data?.customer?.phoneNumber,
        userId: item.data?.customer?.userId
      },
      deliveryBoyList: item.data.deliveryBoyList,
      totalAmt: totalAmt,
      paymentAmt: payment,
      dueAmt: this.dueAmount,
      transactionId: item.data?.transactionId,
      shippingAddress: item.data.shippingAddress,
      productDetail: item.data.selectedProducts,
      tagList: tagList,
      highLightColor: tagList.length > 0 ? (this.tagObject?.[tagList[0]]?.data?.colorCode || 'o') : 'k',

      extraNote: item.data.extraDetails,
      status: item.data.status,
      hasSecondRow: (item.data.extraDetails && item.data.extraDetails.length > 0) || tagList.length > 0 || item.data.status
    };
  }

  hasSecondRow = (index: number, row: any) => row.hasSecondRow;

  saveEntry(event: EntryTransaction) {
    this.entryDataService.addNewEntry(event, !!this.openTransaction, this.isDuplicate);
    this.isDuplicate = false;
  }

  editEntry(object: any) {
    if (this.settingService.setting.askForConfirmationOnEdit === 'yes') {
      this.confirmationModelService.showModel({
        heading: 'Edit Entry?',
        message: 'You are trying to edit an existing entry, are you sure?',
        leftButton: {
          text: 'Yes',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_BLUE,
        }, rightButton: {
          text: 'Cancel',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
        }
      }).subscribe(result => {
        this.confirmationModelService.hideModel();
        if (result === 'left') {
          this.openTransaction = this.entryDataService.getTransactionList()?.[object?.transactionId];
          this.isEditing = true;
          this.newEntry = true;
        }
      });
    } else {
      this.openTransaction = this.entryDataService.getTransactionList()?.[object?.transactionId];
      this.isEditing = true;
      this.newEntry = true;
    }
  }

  duplicate(object: any) {
    if (this.settingService.setting.askForConfirmationOnDuplicate === 'yes') {
      this.confirmationModelService.showModel({
        heading: 'Duplicate Entry?',
        message: 'You are trying to duplicate from an existing entry, are you sure?',
        leftButton: {
          text: 'Yes',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_BLUE,
        }, rightButton: {
          text: 'Cancel',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
        }
      }).subscribe(result => {
        this.confirmationModelService.hideModel();
        if (result === 'left') {
          this.isDuplicate = true;
          this.openTransaction = this.entryDataService.getTransactionList()?.[object?.transactionId];
          this.newEntry = true;
        }
      });
    } else {
      this.isDuplicate = true;
      this.openTransaction = this.entryDataService.getTransactionList()?.[object?.transactionId];
      this.newEntry = true;
    }
  }

  showMore(object: any) {
    const expandView = this.entryDataService.getTransactionList()?.[object?.transactionId];
    this.entryDetailModelService.showModel(expandView);
  }

  deleteEntry(object: any) {
    this.isDuplicate = false;
    if (!object) {
      this.notificationService.somethingWentWrong('101');
      return;
    }
    this.entryDataService.deleteEntry(object);
  }

  openProfile(obj: any) {
    if (obj.userId) {
      if (this.isCustomer)
        this.router.navigate(['/dashboard/delivery'], { queryParams: { userId: obj.userId } });
      else
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

  openProduct(product: any) {
    this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId: product.productData.productId } });
  }

  openTag(tagId: any) {
    this.router.navigate(['/dashboard/warehouse'], { queryParams: { tagId: tagId } });
  }

  getTemplate(dataType: string) {
    if (dataType === 'checkBox') return this.checkBox;
    if (dataType === 'amountText') return this.amountText;
    if (dataType === 'nameText') return this.nameText;
    if (dataType === 'dnameText') return this.dnameText;
    if (dataType === 'actionText') return this.actionText;
    if (dataType === 'productDetail') return this.productDetail;
    if (dataType === 'tagList') return this.tagList;
    return this.plainText;
  }

  displayedColumns(row = 1): string[] {
    if (row === 2)
      return this.secondRowTableStructure.map(item => item.key);
    return this.tableStructure.map(item => item.key);
  }

  getValue(obj: any, path: string): any {
    const returnable = obj?.productData?.productReturnable || false;

    if (path === 'productData.pending')
      if (returnable)
        return obj.sentUnits - obj.recievedUnits;
      else
        return '-';

    if (path === 'recievedUnits')
      if (returnable)
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
      else
        return '-';

    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  toggleSelectRow() {
    this.canSelectRows = !this.canSelectRows;
    if (this.canSelectRows) {
      this.tableStructure.unshift({
        key: 'select',
        label: 'Select',
        dataType: 'checkBox'
      });
    } else {
      this.tableStructure.shift();
      this.selectedRows = [];
    }
    this.secondRowTableStructure[2].width = this.tableStructure.length - 3;
  }

  showDepositData() {
    this.showDeposit.emit();
  }

  selectRow(value: any, event: any) {
    if (event.target.checked) {
      this.selectedRows.push(value);
    } else {
      const index = this.selectedRows.indexOf(value);
      if (index > -1)
        this.selectedRows.splice(index, 1);
    }
  }
}