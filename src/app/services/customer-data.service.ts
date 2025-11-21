import { Injectable, Injector } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { LOCAL_STORAGE_KEYS } from '../shared/constants';
import { BehaviorSubject, Subject } from 'rxjs';
import { Customer } from '../../assets/models/Customer';
import { AccountService } from './account.service';
import { FirebaseService } from './firebase.service';
import { NotificationService } from './notification.service';
import { EntryDataService } from './entry-data.service';
import { UserData } from '../../assets/models/EntryTransaction';

@Injectable({
  providedIn: 'root'
})
export class CustomerDataService {

  private customerData = new BehaviorSubject<any>(null);
  customerData$ = this.customerData.asObservable();

  isDataChanged = new Subject<any>();

  constructor(
    private afAuth: AngularFireAuth,
    private accountService: AccountService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private injector: Injector
  ) {
    const storedVacancy = sessionStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOMER_DATA);
    if (storedVacancy)
      this.customerData?.next(JSON.parse(storedVacancy));
  }

  setCustomerData(data: any) {
    this.customerData?.next(data);
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOMER_DATA, JSON.stringify(data));
  }

  async addNewCustomerFull(newCustomer: Customer, isEdit = false): Promise<boolean> {
    return this.firebaseService.setData(`customer/bucket/${newCustomer.data.userId}`, newCustomer).then(() => {
      const objects = this.getCustomerList();
      objects[newCustomer.data.userId] = newCustomer;
      this.setCustomerData({
        customerList: objects,
        others: {
          lastRefreshed: Date.now()
        }
      });
      this.isDataChanged.next(true);

      this.notificationService.showNotification({
        heading: `${newCustomer.data.fullName}'s account ${isEdit ? 'updated' : 'created'}.`,
        message: isEdit ? 'Customer data updated successfully' : 'New customer added successfully.',
        duration: 5000,
        leftBarColor: '#3A7D44'
      });

      return true;
    }).catch(() => {
      this.isDataChanged.next(false);
      this.notificationService.somethingWentWrong('110');

      return false;
    });
  }

  addNewCustomer(newUserId: string, fullName: string, phoneNumber: string) {
    const newCustomer: Customer = {
      data: {
        fullName: fullName,
        phoneNumber: phoneNumber,
        address: '',
        shippingAddress: [''],
        extraNote: '',
        userId: newUserId
      },
      others: {
        createdBy: this.accountService.getUserId(),
        createdTime: Date.now()
      }
    }

    this.addNewCustomerFull(newCustomer);
  }

  async refreshData(showNotification = false) {
    const latestData = await this.firebaseService.getData('customer/bucket'); // todo increase database efficiency
    const data = {
      customerList: latestData,
      others: {
        lastRefreshed: Date.now()
      }
    }
    this.setCustomerData(data);

    if (Object.keys(latestData).length === 0)
      this.notificationService.showNotification({
        heading: 'No customer data!',
        message: 'Please add a customer.',
        duration: 5000,
        leftBarColor: this.notificationService.color.red
      });
    else if (showNotification)
      this.notificationService.showNotification({
        heading: 'Customer data refreshed.',
        duration: 5000,
        leftBarColor: this.notificationService.color.green
      });
  }

  addNewAddress(address: string, userId: string) {
    setTimeout(() => {
      const obj = this.getCustomerList()[userId];
      if (obj) {
        let addressList = obj?.data?.shippingAddress || [];
        addressList = addressList.filter((address: string) => address !== '');
        addressList.push(address);
        obj.data.shippingAddress = addressList;
        this.addNewCustomerFull(obj, true);
      } else {
        this.notificationService.somethingWentWrong('112', `Failed to add new address ${address}, please add it again!`);
      }
    }, 1000);
  }

  deleteCustomer(userId: string) {
    const entryDataService = this.injector.get(EntryDataService);
    if (entryDataService.customerHasData(userId)) {
      this.notificationService.showNotification({
        heading: 'Process denied.',
        message: 'Customer with entries cannot be deleted, please delete the entries first!',
        duration: 7000,
        leftBarColor: this.notificationService.color?.yellow
      });
      return;
    }
    this.firebaseService.setData(`customer/bucket/${userId}`, null)
      .then(() => {
        const objects = this.getCustomerList();
        delete objects[userId];
        this.setCustomerData({
          customerList: objects,
          others: {
            lastRefreshed: Date.now()
          }
        });

        this.notificationService.showNotification({
          heading: 'Customer profile deleted successfully.',
          duration: 5000,
          leftBarColor: this.notificationService.color?.green
        });
        this.isDataChanged.next(true);
      }).catch(() => {
        this.notificationService.somethingWentWrong('107');
      });
  }

  updateCustomerUpdateStatus(userId: string, isUpdated: boolean) {
    const customerObj = this.getCustomerList()[userId];
    if (customerObj) {
      customerObj.data.isUpdated = isUpdated;
      this.firebaseService.setData(`customer/bucket/${userId}`, customerObj).then(() => {
        this.notificationService.showNotification({
          heading: 'Status Changed.',
          duration: 2000,
          leftBarColor: this.notificationService.color?.green
        });
      }).catch(() => {
        this.notificationService.somethingWentWrong('119');
      });
    } else {
      this.notificationService.somethingWentWrong('120', `Failed to update status, please try again!`);
    }
  }

  getName(userId?: string) {
    if (userId)
      return this.getCustomerList()[userId]?.data?.fullName || null;
    return null;
  }

  getAddress(userId?: string) {
    if (userId)
      return this.getCustomerList()[userId]?.data?.address || '';
    return '';
  }

  getCustomerUserObjectViaName(name: string): UserData | undefined {
    const customerList = this.getCustomerList();
    for (const key in customerList) {
      if (customerList[key].data.fullName == name) {
        return {
          fullName: customerList[key].data.fullName,
          phoneNumber: customerList[key].data.phoneNumber,
          userId: customerList[key].data.userId
        };
      }
    }

    return undefined;
  }

  getCustomerData() {
    return this.customerData?.value || {};
  }

  getCustomerList() {
    return this.customerData?.value?.customerList || {};
  }

  hasCustomerData() {
    return Object.values(this.customerData?.value?.customerList || {}).length > 0;
  }
}
