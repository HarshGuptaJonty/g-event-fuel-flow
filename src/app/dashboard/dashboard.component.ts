import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { AccountService } from '../services/account.service';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CustomerDataService } from '../services/customer-data.service';
import { SearchService } from '../services/search.service';
import { NotificationService } from '../services/notification.service';
import { ConfirmationModelService } from '../services/confirmation-model.service';
import { filter, Subscription } from 'rxjs';
import { AdminDataService } from '../services/admin-data.service';
import { DeliveryPersonDataService } from '../services/delivery-person-data.service';
import { ShortcutService } from '../services/shortcut.service';
import { EfficiencyTrackerService } from '../services/efficiencyTracker.service';
import { SettingService } from '../services/setting.service';
import { Navigation } from '../../assets/models/Navigation';
import { AiWidgetService } from '../services/ai-widget.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterOutlet
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  @ViewChild('profileIcon') profileIcon!: ElementRef;
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  menuItemList: Navigation[] = [];
  activeNavMenu = 'customers';
  profilePicLink: string | undefined = ''; //https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJxo2NFiYcR35GzCk5T3nxA7rGlSsXvIfJwg&s
  showMenuCardInfo = false;
  screenWidth = 0;
  userData?: any;
  adminProfileData?: any;
  private routeSub: Subscription = new Subscription();
  customerDelivery = [525, 630, 745, 1150, 1260, 1400, 1520];
  others = [0, 0, 510, 888, 1000, 1145, 1275];
  navSettingObj: any;
  topNavList: string[] = [];

  constructor(
    private accountService: AccountService,
    private customerService: CustomerDataService,
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService,
    private notificationService: NotificationService,
    private confirmationModelService: ConfirmationModelService,
    private adminDataService: AdminDataService,
    private deliveryPersonDataService: DeliveryPersonDataService,
    private shortcutService: ShortcutService,
    private settingService: SettingService,
    private efficiencyTrackerService: EfficiencyTrackerService,
    private aiWidgetService: AiWidgetService
  ) { }

  async ngOnInit(): Promise<void> {
    this.menuItemList = this.settingService.getNavArrayList();
    this.navSettingObj = JSON.parse(JSON.stringify(this.settingService.navSettingObj));
    Object.values(this.navSettingObj).forEach((item: any) => {
      if (item.visibleIn === 'top')
        this.topNavList.push(item.key);
    });
    this.settingService.isNavListChanged.subscribe(() => {
      this.menuItemList = this.settingService.getNavArrayList();
      this.navSettingObj = JSON.parse(JSON.stringify(this.settingService.navSettingObj));
      this.topNavList = [];
      Object.values(this.navSettingObj).forEach((item: any) => {
        if (item.visibleIn === 'top')
          this.topNavList.push(item.key);
      });
      this.onResize();
    });

    this.route.firstChild?.url.subscribe((url) => this.activeNavMenu = url[0]?.path);
    this.routeSub.add(
      this.router.events?.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        const child = this.route.firstChild;
        if (child) {
          child.url.subscribe((url) => {
            this.activeNavMenu = url[0]?.path;
            this.onResize();
          });
        }
      })
    );

    this.onResize();

    if (this.accountService.hasUserData()) {
      this.userData = this.accountService.getUserData();
    } else {
      // fetch admin data from account service
      const data = this.adminDataService.getAdminData(this.accountService.getUserId());
      this.accountService.setUserData(data);
      this.userData = data;
    }
    this.adminProfileData = this.userData?.data;

    if (this.userData?.data?.userID){
      this.aiWidgetService.isWidgetVisible = true;
      this.computeUserData();
    } else {
      this.accountService.signOut();
      this.notificationService.notAuthorized();
    }

    this.shortcutService.shortcutTriggered.subscribe(key => {
      if (this.activeNavMenu === 'customers' || this.activeNavMenu === 'delivery') {
        if (key === this.shortcutService.SHORTCUT.ACTIVATE_SEARCH)
          this.searchInput.nativeElement.focus();
      }
    })
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
    let i = -1;
    if (this.activeNavMenu === 'customers' || this.activeNavMenu === 'delivery') {
      this.menuItemList.forEach((item: Navigation, index: number) => {
        if (this.topNavList.includes(item.key))
          i++;
        const minWidth = this.customerDelivery[i];
        this.menuItemList[index].visibleIn = this.screenWidth >= minWidth ? this.navSettingObj[item.key].visibleIn : 'side';
      });
    } else {
      this.menuItemList.forEach((item: Navigation, index: number) => {
        if (this.topNavList.includes(item.key))
          i++;
        const minWidth = this.others[i];
        this.menuItemList[index].visibleIn = this.screenWidth >= minWidth ? this.navSettingObj[item.key].visibleIn : 'side';
      });
    }
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.profileIcon && !this.profileIcon.nativeElement.contains(event.target))
      this.showMenuCardInfo = false;
  }

  takeMeToDashboard() {
    this.router.navigate(['/dashboard/customers']);
  }

  computeUserData() {
    this.profilePicLink = this.adminProfileData?.profilePicLink;
  }

  navMenuItemClicked(key: string) {
    this.activeNavMenu = key;
    this.showMenuCardInfo = false;
    if (key === 'log-out') {
      this.confirmationModelService.showModel({
        heading: 'Log out?',
        message: 'You are trying to logout, are you sure?',
        leftButton: {
          text: 'Logout',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_RED,
        }, rightButton: {
          text: 'Cancel',
          customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
        }
      }).subscribe(result => {
        this.confirmationModelService.hideModel();
        if (result === 'left') {
          this.accountService.signOut();
          this.notificationService.loggedOut();
        }
      });
    } else {
      this.router.navigate(['/dashboard/' + key]);
      this.efficiencyTrackerService.startTracking(key);
    }
  }

  onSearch(event: any) {
    const searchValue = (event.target as HTMLInputElement).value;
    this.searchService.updateSearchText(searchValue);
  }

  visibleInMenuItem(key: string, isVisibleIn: 'top' | 'side') {
    this.menuItemList = this.menuItemList.map((item: Navigation) => item.key === key ? { ...item, visibleIn: isVisibleIn } : item);
  }

  hasCustomerData() {
    return Object.keys(this.customerService.getCustomerList()).length > 0;
  }

  hasDeliveryPersonData() {
    return Object.keys(this.deliveryPersonDataService.getDeliveryPersonList()).length > 0;
  }
}
