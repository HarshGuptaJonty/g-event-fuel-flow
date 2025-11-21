import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { DeliveryPersonDataService } from '../../services/delivery-person-data.service';
import { timeAgoWithMsg } from '../../shared/commonFunctions';
import { UserCardComponent } from '../../common/user-card/user-card.component';
import { UserDetailsComponent } from "../../common/user-details/user-details.component";
import { NewAccountComponent } from "../new-account/new-account.component";
import { SearchService } from '../../services/search.service';
import { EntryDataTableComponent } from "../entry-data-table/entry-data-table.component";
import { DeliveryPerson } from '../../../assets/models/DeliveryPerson';
import { ShortcutService } from '../../services/shortcut.service';
import { Subject, takeUntil } from 'rxjs';
import { EfficiencyTrackerService } from '../../services/efficiencyTracker.service';
import { devices, WindowResizeService } from '../../services/window-resize.service';
import { LoaderService } from '../../services/loader.service';
import { DeliveryStatisticsComponent } from './delivery-statistics/delivery-statistics.component';
import { DeliveryAttendanceComponent } from './delivery-attendance/delivery-attendance.component';

@Component({
  selector: 'app-delivery-person',
  imports: [
    CommonModule,
    UserCardComponent,
    UserDetailsComponent,
    NewAccountComponent,
    EntryDataTableComponent,
    DeliveryStatisticsComponent,
    DeliveryAttendanceComponent
  ],
  templateUrl: './delivery-person.component.html',
  styleUrl: './delivery-person.component.scss'
})
export class DeliveryPersonComponent implements OnInit, OnDestroy, AfterViewChecked {

  deliveryPersonUserId?: string;
  deliveryPersonData?: any;
  computedData: any = {
    deliveryPersonList: [],
    lastUpdatedStr: ''
  }
  userId = '';
  selectedDeliveryPerson?: DeliveryPerson;
  isSearching = false;
  isEditingProfile = false;
  selectedIndex = 0;
  devices!: devices;
  openSection?: 'profile' | 'statistics' | 'attendance' | 'newAccount' = undefined;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private accountService: AccountService,
    private deliveryPersonDataService: DeliveryPersonDataService,
    private searchService: SearchService,
    private shortcutService: ShortcutService,
    private windowResizeService: WindowResizeService,
    private efficiencyTrackerService: EfficiencyTrackerService,
    private loaderService: LoaderService
  ) { }

  ngOnInit(): void {
    this.windowResizeService.checkForWindowSize().pipe(takeUntil(this.destroy$)).subscribe((devicesObj: any) => this.devices = devicesObj);

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.deliveryPersonUserId = params['userId'];  // Extracts 'userId' from the URL, if it exists

      if (this.computedData.deliveryPersonList)
        this.openProfileOnLoad();
    });

    this.userId = this.accountService.getUserId();
    if (this.deliveryPersonDataService.hasDeliveryPersonData()) {
      this.deliveryPersonData = this.deliveryPersonDataService.getDeliveryPersonData();

      this.computeDeliveryPersonData();
    } else {
      this.refreshDeliveryPersonData();
    }

    this.deliveryPersonDataService.isDataChanged?.pipe(takeUntil(this.destroy$)).subscribe((isChanged) => {
      if (isChanged) {
        this.selectedDeliveryPerson = undefined;
        this.deliveryPersonData = this.deliveryPersonDataService.getDeliveryPersonData();
        this.computeDeliveryPersonData();
      }
    });

    this.searchService.searchText$.pipe(takeUntil(this.destroy$)).subscribe(searchText => {
      if (searchText && searchText.length > 0) {
        this.computedData.deliveryPersonList = Object.values(this.deliveryPersonData.deliveryPersonList).filter((item: any) =>
          Object.values(item.data).toString().toLowerCase().includes(searchText.toLowerCase())
        );
        this.isSearching = true;
        this.selectedDeliveryPerson = undefined;
      } else {
        this.computedData.deliveryPersonList = Object.values(this.deliveryPersonData?.deliveryPersonList || {});
        this.isSearching = false;
        this.sortDeliveryPersonList();
      }
    });

    this.shortcutService.shortcutTriggered.pipe(takeUntil(this.destroy$)).subscribe((shortcut: string) => {
      if (shortcut === this.shortcutService.SHORTCUT.NEW_ACCOUNT)
        this.onAddNewDeliveryBoy();
      else if (shortcut === this.shortcutService.SHORTCUT.REFRESH_DATA)
        this.refreshDeliveryPersonData(true);
    });
  }

  ngAfterViewChecked(): void {
    this.efficiencyTrackerService.stopTracking('delivery');
  }

  sortDeliveryPersonList() {
    if (!this.computedData.deliveryPersonList) return;

    this.computedData.deliveryPersonList = this.computedData.deliveryPersonList.sort((a: any, b: any) => {
      const nameA = a.data.fullName?.toLowerCase() || ''; // Handle undefined or null values
      const nameB = b.data.fullName?.toLowerCase() || '';
      return nameA.localeCompare(nameB); // Compare strings in ascending order
    });
  }

  computeDeliveryPersonData() {
    this.computedData = {
      deliveryPersonList: [],
      lastUpdatedStr: ''
    }

    this.computedData.lastUpdatedStr = timeAgoWithMsg(this.deliveryPersonData.others.lastRefreshed);
    this.computedData.deliveryPersonList = Object.values(this.deliveryPersonData.deliveryPersonList || {});
    this.sortDeliveryPersonList();

    this.openProfileOnLoad();
  }

  openProfileOnLoad() {
    if (this.deliveryPersonUserId) {
      this.selectedDeliveryPerson = this.deliveryPersonData?.deliveryPersonList?.[this.deliveryPersonUserId];
      if (this.selectedDeliveryPerson) {
        this.selectedIndex = this.computedData.deliveryPersonList.findIndex((obj: any) => obj?.data?.userId === this.deliveryPersonUserId);
      }
    }
  }

  onDeleteProfile(userId: string) {
    this.deliveryPersonDataService.deleteDeliveryPerson(userId);
  }

  userSelected(object: any, index: number) {
    this.openSection = 'profile';
    this.selectedIndex = index;
    this.selectedDeliveryPerson = object;
  }

  openProfile(userId: string) {
    this.openSection = 'profile';
    this.selectedIndex = this.computedData.deliveryPersonList.findIndex((obj: any) => obj?.data?.userId === this.deliveryPersonUserId);
    this.selectedDeliveryPerson = this.deliveryPersonData?.deliveryPersonList?.[userId];
  }

  onProfileEdit() {
    this.isEditingProfile = true;
    this.openSection = 'newAccount';
  }

  onAddNewDeliveryBoy() {
    this.openSection = this.openSection === 'newAccount' ? undefined : 'newAccount';

    if (this.openSection === 'newAccount')
      this.isEditingProfile = false;
    else
      this.selectedDeliveryPerson = undefined;
  }

  async refreshDeliveryPersonData(showNotification = false) {
    this.loaderService.showWithLoadingText('Refreshing delivery person data...');
    this.selectedDeliveryPerson = undefined;
    await this.deliveryPersonDataService.refreshData(showNotification);
    this.deliveryPersonData = this.deliveryPersonDataService.getDeliveryPersonData();
    this.computeDeliveryPersonData();
    this.loaderService.hide();
  }

  toggleStatistics() {
    this.openSection = this.openSection === 'statistics' ? undefined : 'statistics';
  }

  toggleAttendance() {
    this.openSection = this.openSection === 'attendance' ? undefined : 'attendance';
  }

  ngOnDestroy(): void {
    this.destroy$.next(); // Emit a value to complete all subscriptions
    this.destroy$.complete(); // Complete the Subject
  }
}
