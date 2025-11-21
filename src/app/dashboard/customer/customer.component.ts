import { CommonModule } from '@angular/common';
import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AccountService } from '../../services/account.service';
import { CustomerDataService } from '../../services/customer-data.service';
import { timeAgoWithMsg } from '../../shared/commonFunctions';
import { NewAccountComponent } from "../new-account/new-account.component";
import { UserCardComponent } from "../../common/user-card/user-card.component";
import { SearchService } from '../../services/search.service';
import { UserDetailsComponent } from "../../common/user-details/user-details.component";
import { EntryDataTableComponent } from "../entry-data-table/entry-data-table.component";
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { ShortcutService } from '../../services/shortcut.service';
import { Subject, takeUntil } from 'rxjs';
import { CustomerDepositTableComponent } from "../customer-deposit-table/customer-deposit-table.component";
import { SettingService } from '../../services/setting.service';
import { EfficiencyTrackerService } from '../../services/efficiencyTracker.service';
import { devices, WindowResizeService } from '../../services/window-resize.service';
import { LoaderService } from '../../services/loader.service';
import { DepositDataService } from '../../services/depositData.service';
import { EntryTransaction } from '../../../assets/models/EntryTransaction';

@Component({
  selector: 'app-customer',
  imports: [
    CommonModule,
    NewAccountComponent,
    UserCardComponent,
    UserDetailsComponent,
    EntryDataTableComponent,
    CustomerDepositTableComponent
  ],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss'
})
export class CustomerComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('statArea') statArea!: ElementRef;

  customerData?: any;
  computedData: any = {
    customerList: [],
    lastUpdatedStr: ''
  }
  userId = '';
  selectedCustomer?: any;
  addNewCustomer = false;
  isSearching = false;
  isEditingProfile = false;
  selectedIndex = 0;
  dueAmount = 0;
  customerUserId?: string;
  statistics: any = {
    sentSum: 0,
    recieveSum: 0,
    pending: 0
  };
  focusedFormName = '';
  showDepositData = false;
  devices!: devices;
  depositOverview: any[] = [];
  depositPending = 0;

  dataSource = new MatTableDataSource<any>([]);

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private accountService: AccountService,
    private customerService: CustomerDataService,
    private searchService: SearchService,
    private shortcutService: ShortcutService,
    private changeDetectorRef: ChangeDetectorRef,
    private settingService: SettingService,
    private efficiencyTrackerService: EfficiencyTrackerService,
    private windowResizeService: WindowResizeService,
    private loaderService: LoaderService,
    private depositDataService: DepositDataService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.windowResizeService.checkForWindowSize().pipe(takeUntil(this.destroy$)).subscribe((devicesObj: any) => this.devices = devicesObj);

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.customerUserId = params['userId'];  // Extracts 'userId' from the URL, if it exists
    });

    this.userId = this.accountService.getUserId();
    if (this.customerService.hasCustomerData()) {
      this.customerData = this.customerService.getCustomerData();

      this.computeCustomerData();
    } else {
      this.refreshCustomerData();
    }

    this.customerService.isDataChanged?.pipe(takeUntil(this.destroy$)).subscribe(flag => {
      if (flag) {
        this.selectedCustomer = null;
        this.customerData = this.customerService.getCustomerData();
        this.computeCustomerData();
      }
    });

    this.searchService.searchText$.pipe(takeUntil(this.destroy$)).subscribe(searchText => {
      if (searchText && searchText.length > 0) {
        this.computedData.customerList = Object.values(this.customerData.customerList).filter((item: any) =>
          Object.values(item.data).toString().toLowerCase().includes(searchText.toLowerCase())
        );
        this.isSearching = true;
        this.selectedCustomer = null;
      } else {
        this.computedData.customerList = Object.values(this.customerService.getCustomerList());
        this.isSearching = false;
        this.sortCustomerList();
      }
    });

    this.shortcutService.shortcutTriggered.pipe(takeUntil(this.destroy$)).subscribe((shortcut: string) => {
      if (shortcut === this.shortcutService.SHORTCUT.NEW_ACCOUNT)
        this.onAddNewCustomer();
      else if (shortcut === this.shortcutService.SHORTCUT.REFRESH_DATA)
        this.refreshCustomerData(true);
    });
  }

  ngAfterViewChecked(): void {
    this.efficiencyTrackerService.stopTracking('customers');
  }

  sortCustomerList() {
    if (!this.computedData.customerList) return;

    this.computedData.customerList = this.computedData.customerList.sort((a: any, b: any) => {
      const nameA = a.data.fullName?.toLowerCase() || ''; // Handle undefined or null values
      const nameB = b.data.fullName?.toLowerCase() || '';
      return nameA.localeCompare(nameB); // Compare strings in ascending order
    });
  }

  @HostListener('document:click', ['$event'])
  onClick(event: Event): void {
    if (this.statArea && !this.statArea.nativeElement.contains(event.target) &&
      ['sentList', 'recieveList', 'pendingList'].includes(this.focusedFormName))
      this.focusedFormName = '';
  }

  computeCustomerData() {
    this.computedData = {
      customerList: [],
      lastUpdatedStr: ''
    }

    this.computedData.lastUpdatedStr = timeAgoWithMsg(this.customerData.others.lastRefreshed);
    this.computedData.customerList = Object.values(this.customerData.customerList || {});
    this.sortCustomerList();

    this.openProfileOnLoad();
  }

  openProfileOnLoad() {
    if (this.customerUserId) {
      this.selectedCustomer = this.customerData?.customerList?.[this.customerUserId];
      this.computeDepositData();
      if (this.selectedCustomer) {
        this.selectedIndex = this.computedData.customerList.findIndex((obj: any) => obj?.data?.userId === this.customerUserId);
      }
    }
  }

  onDeleteProfile(userId: string) {
    this.customerService.deleteCustomer(userId);
  }

  customerSelected(object: any, index: number) {
    this.addNewCustomer = false;

    if (this.settingService.setting.closeDepositEntryOnSelectProfile === 'yes')
      this.showDepositData = false;

    this.selectedIndex = index;
    this.selectedCustomer = object;

    this.computeDepositData();
  }

  computeDepositData(){
    const data = this.depositDataService.getCustomerDepositList(this.selectedCustomer?.data.userId);
    const overview: any = {};
    this.depositPending = 0;
    data.forEach((item: EntryTransaction) => {
      item.data.selectedProducts?.forEach((product: any) => {
        if (!overview[product.productData.productId]) {
          overview[product.productData.productId] = {
            name: product.productData.name,
            customClass: product.productData.productReturnable ? '' : 'secondary-color',
            value: 0
          };
        }
        overview[product.productData.productId].value += parseInt(product.sentUnits) - parseInt(product.recievedUnits);
        this.depositPending += parseInt(product.sentUnits) - parseInt(product.recievedUnits);
      });
    });
    this.depositOverview = Object.values(overview).filter((item: any) => item.value !== 0);
  }

  onProfileEdit() {
    this.isEditingProfile = true;
    this.addNewCustomer = true;
  }

  toggleUpdateStatus(newStatus: boolean) {
    this.customerService.updateCustomerUpdateStatus(this.selectedCustomer.data.userId, newStatus);
  }

  onAddNewCustomer() {
    this.addNewCustomer = !this.addNewCustomer;
    if (this.addNewCustomer)
      this.isEditingProfile = false;
    else
      this.selectedCustomer = null;
  }

  async refreshCustomerData(showNotification = false) {
    this.loaderService.showWithLoadingText('Refreshing customer data...');
    this.selectedCustomer = null;
    await this.customerService.refreshData(showNotification);
    this.customerData = this.customerService.getCustomerData();
    this.computeCustomerData();
    this.loaderService.hide();
  }

  updateDueAmount(event: number) {
    this.dueAmount = event;

    this.changeDetectorRef.detectChanges(); // Trigger change detection manually
  }

  updateDataSource(event: any) {
    this.dataSource.data = event;

    this.statistics = {
      sentSum: 0,
      recieveSum: 0,
      pending: 0
    };

    for (const obj of this.dataSource.data) {
      if (obj.productDetail)
        for (const product of obj.productDetail)
          if (product.productData.productReturnable)
            this.statistics.sentSum += parseInt(product.sentUnits);
    }

    for (const obj of this.dataSource.data) {
      if (obj.productDetail)
        for (const product of obj.productDetail)
          if (product.productData.productReturnable)
            this.statistics.recieveSum += parseInt(product.recievedUnits);
    }

    for (const obj of this.dataSource.data) {
      if (obj.productDetail)
        for (const product of obj.productDetail)
          if (product.productData.productReturnable)
            this.statistics.pending += parseInt(product.sentUnits) - parseInt(product.recievedUnits);
    }

    this.changeDetectorRef.detectChanges(); // Trigger change detection manually
  }

  getDetailedStat(focus: string, type: string) {
    if (this.focusedFormName === focus) {
      this.focusedFormName = '';
      return;
    }
    this.focusedFormName = focus;

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

  ngOnDestroy(): void {
    this.destroy$.next(); // Emit a value to complete all subscriptions
    this.destroy$.complete(); // Complete the Subject
  }
}
