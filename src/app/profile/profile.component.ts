import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, OnInit, ViewChild } from '@angular/core';
import { AccountService } from '../services/account.service';
import { AdminDataService } from '../services/admin-data.service';
import { formatDateAndTime, getNumberInformat } from '../shared/commonFunctions';
import { APPLICATION_DATA, DEFAULT_LOCAL_SETTING, DEFAULT_NAV_OBJECT } from '../shared/constants';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { SettingService } from '../services/setting.service';
import { Setting } from '../../assets/models/Setting';
import { NotificationService } from '../services/notification.service';
import { ConfirmationModelService } from '../services/confirmation-model.service';
import { EfficiencyTrackerService } from '../services/efficiencyTracker.service';
import { devices, WindowResizeService } from '../services/window-resize.service';
import { MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import moment from 'moment';
import { Navigation } from '../../assets/models/Navigation';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatButtonModule,
    MatDatepickerModule,
    DragDropModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit, AfterViewChecked {

  @ViewChild('picker') picker!: MatDatepicker<Date>;

  userData: any;
  adminProfileData?: any;
  profilePicLink: string | undefined = ''; //'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJxo2NFiYcR35GzCk5T3nxA7rGlSsXvIfJwg&s'
  localStorage = APPLICATION_DATA;
  dataUsed = '0.00 KB';
  showConfiguration = false;
  showNavigation = false;
  devices!: devices;
  navObj: any = DEFAULT_NAV_OBJECT;

  settingForm: FormGroup = new FormGroup({
    exportFileType: new FormControl('ask', [Validators.required]),
    exportDataSize: new FormControl('ask', [Validators.required]),
    dataToInclude: new FormControl([]),
    oldEntryWhenDateEdited: new FormControl('ask', [Validators.required]),
    askForConfirmationOnEdit: new FormControl('yes', [Validators.required]),
    askForConfirmationOnDuplicate: new FormControl('yes', [Validators.required]),
    askForConfirmationOnNewAddress: new FormControl('yes', [Validators.required]),
    closeDepositEntryOnSelectProfile: new FormControl('yes', [Validators.required]),
    showNegativePendingReturns: new FormControl('no', [Validators.required]),
    defaultDateOnNewEntry: new FormControl('currentDay', [Validators.required]),
    showEfficiencyTracker: new FormControl('yes', [Validators.required]),
    showDataLoadedTracker: new FormControl('no', [Validators.required]),
  });
  navSettingForm: FormGroup = new FormGroup({});
  customDateControl = new FormControl();
  clearCache = new FormControl('');
  formChanged = false;
  navFormChanged = false;
  navPositionChanged = false;
  customDate = '';
  navigationArray: Navigation[] = [];

  constructor(
    private accountService: AccountService,
    private adminDataService: AdminDataService,
    private settingService: SettingService,
    private notificationService: NotificationService,
    private confirmationModelService: ConfirmationModelService,
    private windowResizeService: WindowResizeService,
    private efficiencyTrackerService: EfficiencyTrackerService
  ) { }

  ngOnInit(): void {
    this.windowResizeService.checkForWindowSize().subscribe((devicesObj: any) => this.devices = devicesObj);

    if (this.accountService.hasUserData()) {
      this.userData = this.accountService.getUserData();
    } else {
      const data = this.adminDataService.getAdminData(this.accountService.getUserId());
      this.accountService.setUserData(data);
      this.userData = data;
    }
    this.adminProfileData = this.userData?.data;

    const authData = this.accountService.getAuthData();
    this.adminProfileData.importantTimes.createdAt = parseInt(authData?.user?.createdAt || '' + Date.now());
    this.adminProfileData.importantTimes.lastSeen = parseInt(authData?.user?.lastLoginAt || '' + Date.now());

    this.onReset(this.settingService.setting);
    this.dataUsed = this.efficiencyTrackerService.getTotalDataLoaded();

    this.onNavReset(this.settingService.getNavArrayList());

    this.settingService.isNavListChanged.subscribe(() => this.navigationArray = this.settingService.getNavArrayList());
  }

  ngAfterViewChecked(): void {
    this.efficiencyTrackerService.stopTracking('profile');
  }

  onSave() {
    const value = this.settingForm.value;
    value.customDate = this.customDate;

    this.settingService.writeLocalStorage(value);
    this.formChanged = false;
    this.notificationService.showNotification({
      heading: 'Settings Saved Successfully.',
      duration: 5000,
      leftBarColor: this.notificationService.color.green
    });
  }

  onNavSave() {
    const value = this.navSettingForm.value;
    let navObj = this.settingService.navSettingObj;
    Object.keys(value).forEach((key: string) => navObj[key].visibleIn = value[key]);
    if (this.navPositionChanged) {
      this.navigationArray.forEach((item: Navigation) => item.visibleIn = navObj[item.key].visibleIn);
      navObj = this.navigationArray.reduce((acc, item) => {
        acc[item.key] = item;
        return acc;
      }, {} as Record<string, Navigation>);
    }

    this.settingService.writeLocalNavStorage(navObj);
    this.navFormChanged = false;
    this.navPositionChanged = false;
    this.notificationService.showNotification({
      heading: 'Navigation Settings Saved Successfully.',
      duration: 5000,
      leftBarColor: this.notificationService.color.green
    });
  }

  onReset(settingData: Setting = DEFAULT_LOCAL_SETTING) {
    this.customDate = '';

    this.settingForm = new FormGroup({
      exportFileType: new FormControl(settingData.exportFileType || DEFAULT_LOCAL_SETTING.exportFileType, [Validators.required]),
      exportDataSize: new FormControl(settingData.exportDataSize || DEFAULT_LOCAL_SETTING.exportDataSize, [Validators.required]),
      dataToInclude: new FormControl(settingData.dataToInclude || DEFAULT_LOCAL_SETTING.dataToInclude),
      oldEntryWhenDateEdited: new FormControl(settingData.oldEntryWhenDateEdited || DEFAULT_LOCAL_SETTING.oldEntryWhenDateEdited, [Validators.required]),
      askForConfirmationOnEdit: new FormControl(settingData.askForConfirmationOnEdit || DEFAULT_LOCAL_SETTING.askForConfirmationOnEdit, [Validators.required]),
      askForConfirmationOnDuplicate: new FormControl(settingData.askForConfirmationOnDuplicate || DEFAULT_LOCAL_SETTING.askForConfirmationOnDuplicate, [Validators.required]),
      askForConfirmationOnNewAddress: new FormControl(settingData.askForConfirmationOnNewAddress || DEFAULT_LOCAL_SETTING.askForConfirmationOnNewAddress, [Validators.required]),
      closeDepositEntryOnSelectProfile: new FormControl(settingData.closeDepositEntryOnSelectProfile || DEFAULT_LOCAL_SETTING.closeDepositEntryOnSelectProfile, [Validators.required]),
      showNegativePendingReturns: new FormControl(settingData.showNegativePendingReturns || DEFAULT_LOCAL_SETTING.showNegativePendingReturns, [Validators.required]),
      defaultDateOnNewEntry: new FormControl(settingData.defaultDateOnNewEntry || DEFAULT_LOCAL_SETTING.defaultDateOnNewEntry, [Validators.required]),
      showEfficiencyTracker: new FormControl(settingData.showEfficiencyTracker || DEFAULT_LOCAL_SETTING.showEfficiencyTracker, [Validators.required]),
      showDataLoadedTracker: new FormControl(settingData.showDataLoadedTracker || DEFAULT_LOCAL_SETTING.showDataLoadedTracker, [Validators.required]),

    });
    this.customDateControl = new FormControl(moment(settingData.customDate || '', 'DD/MM/YYYY').toDate());

    if (settingData.customDate)
      this.customDate = ' ' + settingData.customDate;

    this.settingForm.valueChanges.subscribe(() => this.formChanged = true);
    this.settingForm.get('defaultDateOnNewEntry')?.valueChanges.subscribe((value: any) => {
      if (value === 'custom')
        this.picker.open();
      else
        this.customDate = '';
    });

    this.customDateControl.valueChanges.subscribe((date: any) => {
      const formatted = moment(date).format('DD/MM/YYYY');
      if (formatted === 'Invalid date')
        this.customDate = '';
      else
        this.customDate = ' ' + formatted;
    })
  }

  onNavReset(navSettingData: Navigation[] = this.settingService.getOriginalNavArrayList()) {
    this.navSettingForm = new FormGroup({});
    navSettingData.forEach((item: Navigation) => this.navSettingForm.addControl(item.key, new FormControl(item.visibleIn, [Validators.required])));
    this.navigationArray = this.settingService.getOriginalNavArrayList();

    this.navSettingForm.valueChanges.subscribe(() => this.navFormChanged = true);
  }

  onNavDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.navigationArray, event.previousIndex, event.currentIndex);
    this.navFormChanged = true;
    this.navPositionChanged = true;
  }

  onClearCache() {
    this.confirmationModelService.showModel({
      heading: 'Clear Cache',
      message: 'Are you sure you want to clear the cache? This will remove all the cached data and you will have to log in again. This helps in clearing any corrupted data.',
      leftButton: {
        text: 'Confirm',
        customClass: this.confirmationModelService.CUSTOM_CLASS.GREY_RED,
      },
      rightButton: {
        text: 'Cancel',
        customClass: this.confirmationModelService.CUSTOM_CLASS.GREY_BLUE
      }
    }).subscribe(result => {
      this.confirmationModelService.hideModel();
      if (result === 'left') {
        this.accountService.signOut();
        this.notificationService.loggedOut();
      } else
        this.clearCache.setValue('');
    });
  }

  getNumberInformat(arg0: any) {
    return getNumberInformat(arg0);
  }

  formatDateAndTime(arg0: number) {
    return formatDateAndTime(arg0);
  }

  isCustomDateValid(): boolean {
    if (this.settingForm?.get('defaultDateOnNewEntry')?.value === 'custom') {
      if (this.customDate)
        return true;
      return false;
    }
    return true;
  }
}
