import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { EntryDataService } from '../../services/entry-data.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmationModelService } from '../../services/confirmation-model.service';
import { EntryDetailModelService } from '../../services/entry-detail-model.service';
import { Router } from '@angular/router';
import { EntryTransaction, UserData } from '../../../assets/models/EntryTransaction';
import { NewEntryComponent } from '../../common/new-entry/new-entry.component';
import { CustomerDataService } from '../../services/customer-data.service';
import { DeliveryPersonDataService } from '../../services/delivery-person-data.service';
import { ExportService } from '../../services/export.service';
import { FormControl, FormGroup } from '@angular/forms';
import { Customer } from '../../../assets/models/Customer';
import { Product, ProductQuantity } from '../../../assets/models/Product';
import { ProductService } from '../../services/product.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import moment from 'moment';
import { ExportModelService } from '../../services/export-model.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DataForExportFormat } from '../../../assets/models/ExportEntry';
import { ShortcutService } from '../../services/shortcut.service';
import { SettingService } from '../../services/setting.service';
import { Subject, takeUntil } from 'rxjs';
import { EfficiencyTrackerService } from '../../services/efficiencyTracker.service';
import { TagService } from '../../services/tag.service';
import { LOCAL_STORAGE_KEYS } from '../../shared/constants';
import { Tags } from '../../../assets/models/Tags';
import { devices, WindowResizeService } from '../../services/window-resize.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-inventory',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    NewEntryComponent,
    MatFormFieldModule,
    MatDatepickerModule,
    MatCheckboxModule
  ],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('checkBox', { static: true }) checkBox!: TemplateRef<any>;
  @ViewChild('plainText', { static: true }) plainText!: TemplateRef<any>;
  @ViewChild('amountText', { static: true }) amountText!: TemplateRef<any>;
  @ViewChild('cnameText', { static: true }) cnameText!: TemplateRef<any>;
  @ViewChild('dnameText', { static: true }) dnameText!: TemplateRef<any>;
  @ViewChild('actionText', { static: true }) actionText!: TemplateRef<any>;
  @ViewChild('productDetail', { static: true }) productDetail!: TemplateRef<any>;
  @ViewChild('tagList', { static: true }) tagList!: TemplateRef<any>;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  @ViewChild('customerName') customerName!: ElementRef;
  @ViewChild('filterArea') filterArea!: ElementRef;
  @ViewChild('statArea') statArea!: ElementRef;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  tableStructure = [
    {
      key: 'date',
      label: 'Date',
      dataType: 'plainText'
    }, {
      key: 'customer',
      label: 'Customer',
      customClass: 'witdh-limit-200',
      dataType: 'cnameText'
    }, {
      key: 'shippingAddress',
      label: 'Address',
      customClass: 'witdh-limit-200',
      dataType: 'plainText'
    }, {
      key: 'deliveryBoyList',
      label: 'Delivery',
      customClass: 'witdh-limit-200',
      dataType: 'dnameText'
    }, {
      key: 'productData.name',
      label: 'Product',
      customClass: 'witdh-limit-200',
      dataType: 'productDetail',
      isLink: true
    }, {
      key: 'sentUnits',
      label: 'Sent',
      dataType: 'productDetail'
    }, {
      key: 'recievedUnits',
      label: 'Recieved',
      dataType: 'productDetail'
    }, {
      key: 'productData.pending',
      label: 'Pending',
      dataType: 'productDetail'
    }, {
      key: 'productData.rate',
      label: 'Rate/Unit',
      dataType: 'productDetail',
      isAmount: true
    }, {
      key: 'totalAmt',
      label: 'Total Amount',
      dataType: 'amountText'
    }, {
      key: 'paymentAmt',
      label: 'Payment',
      dataType: 'amountText'
    }, {
      key: 'dueAmt',
      label: 'Due Amount',
      dataType: 'amountText'
    }, {
      key: 'action',
      label: 'Action',
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
      width: 1
    }, {
      key: 'extraNote',
      dataType: 'plainText',
      width: this.tableStructure.length - 2
    }
  ]

  newEntry = false;
  isRefreshing = false;
  isSearching = false;
  isDuplicate = false;
  isEditing = false;
  canSelectRows = false;
  processedTableData?: any;
  unchangedProcessedData?: any;
  entryDataAvaliable = false;
  openTransaction?: EntryTransaction;
  filterActive = false;
  focusedFormName = '';
  statistics: any = {};
  startDateFilter?: string;
  endDateFilter?: string;
  forCustomerAllTotal?: any;
  selectedRows: any = [];
  allcustomerTotalData: any = {};

  customerList: Customer[] = [];
  customerSearchList: Customer[] = [];
  customerFilterId = '';

  shippingAddressList: string[] = [];
  shippingAddressSelectedList: string[] = [];
  shippingAddressSubmitted: string[] = [];

  productList: Product[] = [];
  productSelectedList: Product[] = [];
  productSubmitted: Product[] = [];

  tagObject: any = {};
  tagObjectList: Tags[] = [];
  tagsSelectedList: Tags[] = [];
  tagsSubmitted: Tags[] = [];
  devices!: devices;

  dataSource = new MatTableDataSource<any>([]);

  filterForm: FormGroup = new FormGroup({
    customerName: new FormControl('')
  });

  constructor(
    private afAuth: AngularFireAuth,
    private entryDataService: EntryDataService,
    private notificationService: NotificationService,
    private confirmationModelService: ConfirmationModelService,
    private entryDetailModelService: EntryDetailModelService,
    private router: Router,
    private customerDataService: CustomerDataService,
    private deliveryPersonDataService: DeliveryPersonDataService,
    private exportService: ExportService,
    private productService: ProductService,
    private exportModelService: ExportModelService,
    private shortcutService: ShortcutService,
    private settingService: SettingService,
    private efficiencyTrackerService: EfficiencyTrackerService,
    private windowResizeService: WindowResizeService,
    private loaderService: LoaderService,
    private tagService: TagService
  ) {
    const storedTagObject = localStorage.getItem(LOCAL_STORAGE_KEYS.TAG_DATA);
    if (storedTagObject) {
      this.tagObject = JSON.parse(storedTagObject);
      this.tagObjectList = Object.values(this.tagObject);
    }
  }

  ngOnInit(): void {
    this.windowResizeService.checkForWindowSize().pipe(takeUntil(this.destroy$)).subscribe((devicesObj: any) => this.devices = devicesObj);

    this.refreshEntryData(); // to refersh first time
    this.entryDataAvaliable = this.unchangedProcessedData?.length > 0;

    this.entryDataService.isDataChanged.pipe(takeUntil(this.destroy$)).subscribe(flag => {
      if (flag) {
        this.entryDataAvaliable = true;
        this.entryDataService.updateInventoryDataObject(); // convert new data in table format
        this.refreshEntryData(); // to refresh when there is data change
        this.newEntry = false;
        this.isRefreshing = false;
      }
    });

    if (this.customerDataService.getCustomerData()) {
      this.customerList = Object.values(this.customerDataService.getCustomerList());
      this.customerSearchList = this.customerList;
    }

    this.productService.isDataChanged.pipe(takeUntil(this.destroy$)).subscribe(flag => {
      if (flag)
        this.productList = Object.values(this.productService.getProductList());
    });

    this.tagService.isDataChanged.pipe(takeUntil(this.destroy$)).subscribe(flag => {
      if (flag) {
        this.tagObject = this.tagService.getTagObject();
        this.tagObjectList = Object.values(this.tagObject);
      }
    })
    this.tagObject = this.tagService.getTagObject();
    this.tagObjectList = Object.values(this.tagObject);

    this.shortcutService.shortcutTriggered.pipe(takeUntil(this.destroy$)).subscribe(key => {
      if (key === this.shortcutService.SHORTCUT.NEW_ENTRY)
        this.newEntry = true;
      else if (key === this.shortcutService.SHORTCUT.ACTIVATE_SEARCH)
        this.searchInput.nativeElement.focus();
    });
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event): void {
    if (this.filterArea && !this.filterArea.nativeElement.contains(event.target) &&
      ['customerName', 'addressDropdowm', 'productDropdown'].includes(this.focusedFormName))
      this.onfocus('');
    if (this.statArea && !this.statArea.nativeElement.contains(event.target) &&
      ['sentList', 'recieveList', 'pendingList'].includes(this.focusedFormName))
      this.onfocus('');
  }

  ngAfterViewChecked(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    this.efficiencyTrackerService.stopTracking('inventory');
  }

  openExportPopup() {
    this.exportModelService.showModel({
      hasSelectedRows: this.selectedRows.length > 0,
      hasSelectedCustomer: this.customerFilterId.length > 0,
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

    this.forCustomerAllTotal = {};
    if (totalRow) {
      this.forCustomerAllTotal['Product'] = 'All Total';
      this.forCustomerAllTotal['Sent'] = this.getStat('sentSum');
      this.forCustomerAllTotal['Receieved'] = this.getStat('recieveSum');
      this.forCustomerAllTotal['Pending'] = this.getStat('pending');
      this.forCustomerAllTotal['Total Amount'] = this.getStat('totAmt');
      this.forCustomerAllTotal['Paid Amount'] = this.getStat('paidAmt');
      this.forCustomerAllTotal['Due Amount'] = this.getStat('dueAmt');
    }

    if (thisPage && (this.paginator?.pageSize || 100) >= this.dataSource.data.length)
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
      this.exportService.exportToExcelV2({ data: dataForExport, custonerPerSheet: newSheet, fullPageTotalData: this.forCustomerAllTotal, showTotalRow: totalRow, allCustomerTotal: this.allcustomerTotalData, addressPerSheet: newAddress }, true, 'Inventory');
    else
      this.exportService.exportToPdf(dataForExport);
  }

  refreshData() {
    if (this.isRefreshing)
      return;
    this.isRefreshing = true;
    this.loaderService.showWithLoadingText('Refreshing inventory data...');

    setTimeout(() => {
      if (this.entryDataAvaliable) {
        this.refreshEntryData();
        this.notificationService.transactionListRefreshed();
        this.loaderService.hide();
      } else {
        this.entryDataService.hardRefresh();
        this.loaderService.hide();

        this.notificationService.showNotification({
          heading: 'No data found!',
          message: 'Iniciating hard refresh.',
          duration: 4000,
          leftBarColor: this.notificationService.color.yellow
        });
      }
      this.isRefreshing = false;
    }, 1000);
  }

  async refreshEntryData() {
    this.newEntry = false;
    this.processedTableData = null;
    this.openTransaction = undefined;
    if (this.canSelectRows) this.toggleSelectRow();

    this.tagObject = this.tagService.getTagObject();
    this.tagObjectList = Object.values(this.tagObject);

    this.unchangedProcessedData = this.entryDataService.getInventoryDataObject();
    this.processedTableData = this.unchangedProcessedData;
    this.calculateAllCustomerTotalData(this.unchangedProcessedData);

    if (this.processedTableData && this.processedTableData.length > 100) {
      this.dataSource.data = this.processedTableData.slice(0, 100); // initially show first 100 records for larger database
      setTimeout(() => {
        this.dataSource.data = this.processedTableData; // after 0.5 second load all data, this will decrease the page load time by 90%
      }, 500);
    } else
      this.dataSource.data = this.processedTableData;

    this.resetPaginator();

    if (this.filterActive)
      this.filterList();
  }

  updateProductList() {
    this.productList = Object.values(this.productService.getProductList());
  }

  resetPaginator() {
    if (this.paginator) {
      this.paginator.pageIndex = 0;
      this.dataSource.paginator = this.paginator;
    }
  }

  hasSecondRow = (index: number, row: any) => row.hasSecondRow;

  forSearch(item: any) {
    const deliveryPersonList = item.deliveryBoyList?.flatMap((user: UserData) => [
      user.fullName,
      user.phoneNumber,
      this.deliveryPersonDataService.getAddress(user.userId)
    ]) || [];

    const searchArray = [
      item.date,
      item.customer?.fullName,
      item.customer?.phoneNumber,
      this.customerDataService.getAddress(item.customer?.userId),
      ...deliveryPersonList, // convert list of object in one line
      item.extraNote,
      item.shippingAddress
    ].filter(obj => !!obj); // remove empty data

    if (item.productDetail)
      for (const product of item.productDetail)
        searchArray.push(product.productData.name);

    return searchArray.join(' ');
  }

  onSearch(event: any) {
    const searchValue = (event.target as HTMLInputElement).value;
    if (searchValue && searchValue.length > 0) {
      this.dataSource.data = this.processedTableData.filter((item: any) => this.forSearch(item).toString().toLowerCase().includes(searchValue.toLowerCase()));
      this.isSearching = true;
    } else {
      this.dataSource.data = this.processedTableData;
      this.isSearching = false;
    }
  }

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

  deleteEntry(object: any) {
    this.isDuplicate = false;
    if (!object) {
      this.notificationService.somethingWentWrong('109');
      return;
    }
    this.entryDataService.deleteEntry(object);
  }

  showMore(object: any) {
    const expandView = this.entryDataService.getTransactionList()?.[object?.transactionId];
    this.entryDetailModelService.showModel(expandView);
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

  openTag(tagId: any) {
    this.router.navigate(['/dashboard/warehouse'], { queryParams: { tagId: tagId } });
  }

  searchCustomer() {
    const value = this.customerName.nativeElement.value;

    if (value?.length == 0) {
      this.customerSearchList = this.customerList;
      this.customerFilterId = '';
      this.shippingAddressList = [];
      this.processedTableData = this.unchangedProcessedData
      this.dataSource.data = this.processedTableData;
    } else
      this.customerSearchList = this.customerList.filter((item) =>
        Object.values(item.data || {}).toString()?.toLowerCase()?.includes(value?.toLowerCase())
      );
  }

  onSelectCustomer(customer: Customer) {
    this.customerFilterId = customer.data.userId;
    this.customerName.nativeElement.value = customer.data.fullName + ' (' + this.formatNumber(customer.data.phoneNumber) + ')';
    this.customerSearchList = [];

    this.shippingAddressSelectedList = [];
    this.shippingAddressSubmitted = [];
    this.shippingAddressList = customer.data.shippingAddress || [];

    this.filterList();
  }

  submitAddressFilters() {
    this.focusedFormName = '';
    this.shippingAddressSubmitted = [...this.shippingAddressSelectedList];
    this.filterList();
  }

  submitProductFilters() {
    this.focusedFormName = '';
    this.productSubmitted = [...this.productSelectedList];
    this.filterList();
  }

  submitTagFilters() {
    this.focusedFormName = '';
    this.tagsSubmitted = [...this.tagsSelectedList];
    this.filterList();
  }

  toggleSelectAddress(address: string) {
    const index = this.shippingAddressSelectedList.indexOf(address);
    if (index !== -1) {
      this.shippingAddressSelectedList.splice(index, 1);
    } else {
      this.shippingAddressSelectedList.push(address);
    }
  }

  toggleSelectProduct(product: Product) {
    const index = this.productSelectedList.indexOf(product);
    if (index !== -1) {
      this.productSelectedList.splice(index, 1);
    } else {
      this.productSelectedList.push(product);
    }
  }

  toggleSelectTag(tag: Tags) {
    const index = this.tagsSelectedList.indexOf(tag);
    if (index !== -1) {
      this.tagsSelectedList.splice(index, 1);
    } else {
      this.tagsSelectedList.push(tag);
    }
  }

  removeAddress(event: any, index: number) {
    event.stopPropagation();
    this.onfocus('');
    this.shippingAddressSelectedList.splice(index, 1)
    this.shippingAddressSubmitted = [...this.shippingAddressSelectedList];

    this.filterList();
  }

  removeProduct(event: any, index: number) {
    event.stopPropagation();
    this.onfocus('');
    this.productSelectedList.splice(index, 1)
    this.productSubmitted = [...this.productSelectedList];

    this.filterList();
  }

  removeTag(event: any, index: number) {
    event.stopPropagation();
    this.onfocus('');
    this.tagsSelectedList.splice(index, 1)
    this.tagsSubmitted = [...this.tagsSelectedList];

    this.filterList();
  }

  dateRangeChange(dateRangeStart: HTMLInputElement, dateRangeEnd: HTMLInputElement) {
    this.startDateFilter = dateRangeStart.value;
    this.endDateFilter = dateRangeEnd.value;

    this.filterList();
  }

  filterList() {
    let filterList = this.unchangedProcessedData

    if (this.customerFilterId.length > 0) {
      filterList = filterList.filter((item: any) => item.customer.userId === this.customerFilterId);

      this.forCustomerAllTotal = {};

      this.forCustomerAllTotal['Product'] = 'All Total';
      this.forCustomerAllTotal['Sent'] = this.getStat('sentSum', filterList);
      this.forCustomerAllTotal['Receieved'] = this.getStat('recieveSum', filterList);
      this.forCustomerAllTotal['Pending'] = this.getStat('pending', filterList);
      this.forCustomerAllTotal['Total Amount'] = this.getStat('totAmt', filterList);
      this.forCustomerAllTotal['Paid Amount'] = this.getStat('paidAmt', filterList);
      this.forCustomerAllTotal['Due Amount'] = this.getStat('dueAmt', filterList);
    }

    if (this.shippingAddressSubmitted.length > 0)
      filterList = filterList.filter((item: any) => this.shippingAddressSubmitted.includes(item.shippingAddress));

    if (this.productSubmitted.length > 0)
      filterList = filterList.filter((item: any) => {
        if (item.productDetail)
          return this.productSelectedList.some((product: Product) => item.productDetail.some((productQuantity: ProductQuantity) => product.data.productId === productQuantity.productData.productId));
        return false;
      });

    if (this.tagsSubmitted.length > 0)
      filterList = filterList.filter((item: any) => {
        if (item.tagList)
          return this.tagsSelectedList.some((tags: Tags) => item.tagList.some((tagId: string) => tags.data.tagId === tagId));
        return false;
      });

    if (this.startDateFilter && this.endDateFilter) {
      const startDate = moment(this.startDateFilter || '', 'DD/MM/YYYY').toDate();
      const endDate = moment(this.endDateFilter || '', 'DD/MM/YYYY').toDate();

      filterList = filterList.filter((item: any) => {
        if (item.date) {
          const itemDate = new Date(item.date);
          return itemDate >= startDate && itemDate <= endDate;
        }
        return true;
      })
    }

    this.processedTableData = filterList
    this.dataSource.data = this.processedTableData;
  }

  closeFilter() {
    this.filterActive = false;
    this.customerFilterId = '';
    this.processedTableData = this.unchangedProcessedData
    this.dataSource.data = this.processedTableData;
    this.shippingAddressList = [];
    this.productSelectedList = [];
    this.productSubmitted = [];
    this.startDateFilter = undefined;
    this.endDateFilter = undefined;
  }

  getStat(type: string, data = this.dataSource.data): number {
    let result = 0;
    if (type === 'sentSum') {
      for (const obj of data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.sentUnits);
      }
    } else if (type === 'recieveSum') {
      for (const obj of data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.recievedUnits);
      }
    } else if (type === 'pending') {
      for (const obj of data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable)
              result += parseInt(product.sentUnits) - parseInt(product.recievedUnits);
      }
    } else if (type === 'dueAmt') {
      for (const obj of data)
        result += parseInt(obj.dueAmt);
    } else if (type === 'totAmt') {
      for (const obj of data)
        result += parseInt(obj.totalAmt);
    } else if (type === 'paidAmt') {
      for (const obj of data)
        result += parseInt(obj.paymentAmt);
    }
    return result || 0;
  }

  getDetailedStat(focus: string, type: string) {
    this.onfocus(focus);

    const object: any = {};
    if (type === 'sentSum') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail) {
          for (const product of obj.productDetail) {
            const sent = parseInt(product.sentUnits);

            if (object?.[product.productData.productId]) {
              object[product.productData.productId].value += sent;
            } else {
              object[product.productData.productId] = {
                name: product.productData.name,
                customClass: product.productData.productReturnable ? '' : 'secondary-color',
                value: sent
              }
            }
          }
        }
      }
      this.statistics.sentList = Object.values(object);
    } else if (type === 'recieveSum') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable) {
              const receive = parseInt(product.recievedUnits);

              if (object?.[product.productData.productId]) {
                object[product.productData.productId].value += receive;
              } else {
                object[product.productData.productId] = {
                  name: product.productData.name,
                  customClass: product.productData.productReturnable ? '' : 'secondary-color',
                  value: receive
                }
              }
            }
      }
      this.statistics.recieveList = Object.values(object);
    } else if (type === 'pending') {
      for (const obj of this.dataSource.data) {
        if (obj.productDetail)
          for (const product of obj.productDetail)
            if (product.productData.productReturnable) {
              const pending = parseInt(product.sentUnits) - parseInt(product.recievedUnits);

              if (object?.[product.productData.productId]) {
                object[product.productData.productId].value += pending;
              } else {
                object[product.productData.productId] = {
                  name: product.productData.name,
                  customClass: product.productData.productReturnable ? '' : 'secondary-color',
                  value: pending
                }
              }
            }
      }
      this.statistics.pendingList = Object.values(object);
    }
  }

  getTemplate(dataType: string) {
    if (dataType === 'checkBox') return this.checkBox;
    if (dataType === 'amountText') return this.amountText;
    if (dataType === 'cnameText') return this.cnameText;
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

  formatNumber(value?: string) {
    if (!value)
      return '';
    return value.replace(/(\d{5})(\d{5})/, '$1 $2');
  }

  onfocus(formName: string) {
    if (this.focusedFormName === formName)
      this.focusedFormName = '';
    else
      this.focusedFormName = formName;
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
    this.secondRowTableStructure[2].width = this.tableStructure.length - 2;
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

  calculateAllCustomerTotalData(allTransactions: DataForExportFormat) {
    this.allcustomerTotalData = {};
    const transactionList = allTransactions || {};

    Object.values(transactionList).forEach((obj: DataForExportFormat) => {
      const customerId = obj.customer.fullName;
      if (!this.allcustomerTotalData[customerId]) {
        this.allcustomerTotalData[customerId] = {
          sent: 0,
          receieved: 0,
          pending: 0,
          totalAmt: 0,
          paymentAmt: 0,
          dueAmt: 0
        };
      }

      this.allcustomerTotalData[customerId].sent += obj.productDetail.reduce((sum: number, product: ProductQuantity) => product.productData.productReturnable ? sum + product.sentUnits : sum, 0);
      this.allcustomerTotalData[customerId].receieved += obj.productDetail.reduce((receieved: number, product: ProductQuantity) => product.productData.productReturnable ? receieved + product.recievedUnits : receieved, 0);
      this.allcustomerTotalData[customerId].pending += obj.productDetail.reduce((pending: number, product: ProductQuantity) => product.productData.productReturnable ? pending + product.sentUnits - product.recievedUnits : pending, 0);
      this.allcustomerTotalData[customerId].totalAmt += obj.totalAmt || 0;
      this.allcustomerTotalData[customerId].paymentAmt += obj.paymentAmt || 0;
      this.allcustomerTotalData[customerId].dueAmt += (obj.totalAmt || 0) - (obj.paymentAmt || 0);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next(); // Emit a value to complete all subscriptions
    this.destroy$.complete(); // Complete the Subject
  }
}
