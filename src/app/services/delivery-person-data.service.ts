import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BehaviorSubject, Subject } from 'rxjs';
import { LOCAL_STORAGE_KEYS } from '../shared/constants';
import { FirebaseService } from './firebase.service';
import { NotificationService } from './notification.service';
import { AccountService } from './account.service';
import { DeliveryPerson } from '../../assets/models/DeliveryPerson';
import { EntryDataService } from './entry-data.service';
import { UserData } from '../../assets/models/EntryTransaction';

@Injectable({
  providedIn: 'root'
})
export class DeliveryPersonDataService {

  private deliveryPersonData = new BehaviorSubject<any>(null);
  deliveryPersonData$ = this.deliveryPersonData.asObservable();

  isDataChanged = new Subject<any>();

  constructor(
    private afAuth: AngularFireAuth,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private accountService: AccountService,
    private entryDataService: EntryDataService
  ) {
    const storedVacancy = sessionStorage.getItem(LOCAL_STORAGE_KEYS.DELIVERY_PERSON_DATA);
    if (storedVacancy)
      this.deliveryPersonData?.next(JSON.parse(storedVacancy));
    else
      this.refreshData();
  }

  setDeliveryPersonData(data: any) {
    this.deliveryPersonData?.next(data);
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.DELIVERY_PERSON_DATA, JSON.stringify(data));
  }

  async addNewDeliveryPersonFull(newDeliveryPerson: DeliveryPerson): Promise<boolean> {
    return this.firebaseService.setData(`deliveryPerson/bucket/${newDeliveryPerson.data.userId}`, newDeliveryPerson).then(() => {
      const objects = this.getDeliveryPersonList();
      objects[newDeliveryPerson.data.userId] = newDeliveryPerson;
      this.setDeliveryPersonData({
        deliveryPersonList: objects,
        others: {
          lastRefreshed: Date.now()
        }
      });
      this.isDataChanged.next(true);

      this.notificationService.showNotification({
        heading: `${newDeliveryPerson.data.fullName}'s account created.`,
        message: 'New delivery person added successfully.',
        duration: 5000,
        leftBarColor: '#3A7D44'
      });

      return true;
    }).catch(() => {
      this.isDataChanged.next(false);
      this.notificationService.somethingWentWrong('106');

      return false;
    });
  }

  addNewDeliveryPerson(newUserId: string, fullName: string, phoneNumber: string, address?: string) {
    const newDeliveryPerson = {
      data: {
        fullName: fullName,
        phoneNumber: phoneNumber,
        address: address || '',
        extraNote: '',
        userId: newUserId
      },
      others: {
        createdBy: this.accountService.getUserId(),
        createdTime: Date.now()
      }
    };

    this.addNewDeliveryPersonFull(newDeliveryPerson);
  }

  deleteDeliveryPerson(userId: string) {
    if (this.entryDataService.deliveryPersonHasData(userId)) {
      this.notificationService.showNotification({
        heading: 'Process denied.',
        message: 'Delivery person with deliveries cannot be deleted, please delete the deliveries first!',
        duration: 7000,
        leftBarColor: this.notificationService.color?.yellow
      });
      return;
    }
    this.firebaseService.setData(`deliveryPerson/bucket/${userId}`, null)
      .then(() => {
        const objects = this.getDeliveryPersonList();
        delete objects[userId];
        this.setDeliveryPersonData({
          deliveryPersonList: objects,
          others: {
            lastRefreshed: Date.now()
          }
        });
        this.isDataChanged.next(true);

        this.notificationService.showNotification({
          heading: 'Delivery person profile deleted successfully.',
          duration: 5000,
          leftBarColor: this.notificationService.color?.green
        });
      }).catch(() => {
        this.notificationService.somethingWentWrong('108');
      });
  }

  async refreshData(showNotification = false) {
    const latestData = await this.firebaseService.getData('deliveryPerson/bucket'); // todo increase database efficiency
    const data = {
      deliveryPersonList: latestData,
      others: {
        lastRefreshed: Date.now()
      }
    }
    this.setDeliveryPersonData(data);

    if (Object.keys(latestData).length === 0)
      this.notificationService.showNotification({
        heading: 'No delivery person data!',
        duration: 5000,
        leftBarColor: this.notificationService.color.red
      });
    else if (showNotification)
      this.notificationService.showNotification({
        heading: 'Delivery person data refreshed.',
        duration: 5000,
        leftBarColor: this.notificationService.color?.green
      });
  }

  getAddress(userId?: string) {
    if (userId)
      return this.getDeliveryPersonList()[userId]?.data?.address || '';
    else
      return '';
  }

  getDeliveryPersonObjectViaNames(namesString: string): UserData[] {
    const deliveryPersonList = this.getDeliveryPersonList();
    const names = namesString?.split(',').map((name: string) => name.trim());
    const deliveryPersons: UserData[] = [];

    for (const name of names) {
      let found = false;
      for (const key in deliveryPersonList) {
        if (deliveryPersonList[key].data.fullName == name) {
          const deliveryPersonObject = deliveryPersonList[key] as DeliveryPerson;
          deliveryPersons.push({
            fullName: deliveryPersonObject.data.fullName,
            phoneNumber: deliveryPersonObject.data.phoneNumber,
            userId: deliveryPersonObject.data.userId
          });
          found = true;
          break;
        }
      }
      if (!found) {
        deliveryPersons.push({
          fullName: name,
          phoneNumber: '',
          userId: ''
        });
      }
    }

    return deliveryPersons;
  }

  getDeliveryPersonData() {
    return this.deliveryPersonData?.value;
  }

  getDeliveryPersonList() {
    return this.deliveryPersonData?.value?.deliveryPersonList || {};
  }

  hasDeliveryPersonData() {
    return Object.values(this.deliveryPersonData?.value?.deliveryPersonList || {}).length > 0;
  }
}
