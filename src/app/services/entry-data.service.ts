import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { EntryTransaction, UserData } from '../../assets/models/EntryTransaction';
import { NotificationService } from './notification.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TagService } from './tag.service';
import { dateConverter } from '../shared/commonFunctions';
import { CustomerDataService } from './customer-data.service';
import { Customer } from '../../assets/models/Customer';

@Injectable({
  providedIn: 'root'
})
export class EntryDataService {

  private transactionList = new BehaviorSubject<any>(null); // this loads all the transaction of the current year and store in it for usage
  transactionList$ = this.transactionList.asObservable();

  isDataChanged = new Subject<any>();
  tagObject: any = {};
  inventoryDataObject?: any;

  constructor(
    private afAuth: AngularFireAuth,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private tagService: TagService,
    private customerDataService: CustomerDataService,
  ) {
    this.initialize();
  }

  private async initialize(showNotification = false) {
    this.tagObject = this.tagService.getTagObject();

    const data = await this.firebaseService.getData('transactionList');
    if (Object.keys(data).length > 0) {
      this.transactionList.next(data);
      this.isDataChanged.next(true);

      this.generateInventoryDataObjects(); // generate transforemation objects for inventory page

      if (showNotification)
        this.notificationService.transactionListRefreshed();
    } else {
      this.transactionList.next(null);
      this.isDataChanged.next(false);

      if (showNotification) {
        this.notificationService.showNotification({
          heading: 'No transaction to show!',
          duration: 5000,
          leftBarColor: this.notificationService.color.red
        });
      }
    }
  }

  hardRefresh() {
    this.initialize(true);
  }

  getTransactionList() {
    return this.transactionList.value || {};
  }

  hasTransactionData() {
    return !!this.transactionList?.value;
  }

  customerHasData(customerId?: string) {
    if (this.isDataChanged && this.getTransactionList()) {
      return (Object.values(this.getTransactionList()) as EntryTransaction[])
        .filter((obj: any) => obj?.data?.customer?.userId === customerId).length > 0;
    }
    return false;
  }

  deliveryPersonHasData(deliveryPersonId?: string) {
    if (this.isDataChanged && this.getTransactionList()) {
      return (Object.values(this.getTransactionList()) as EntryTransaction[])
        .some((obj: any) => obj?.data?.deliveryBoyList?.map((user: UserData) => user.userId).includes(deliveryPersonId));
    }
    return false;
  }

  getCustomerTransactionList(customerId?: string): EntryTransaction[] {
    if (this.isDataChanged && this.getTransactionList()) {
      return (Object.values(this.getTransactionList()) as EntryTransaction[])
        .filter((obj: any) => obj?.data?.customer?.userId === customerId)
        .sort((a, b) => a.data?.transactionId > b.data?.transactionId ? 1 : -1);
    }
    return [];
  }

  getDeliveryPersonTransactionList(deliveryPersonId?: string): EntryTransaction[] {
    if (this.isDataChanged && this.getTransactionList()) {
      return (Object.values(this.getTransactionList()) as EntryTransaction[])
        .filter((obj: any) => obj?.data?.deliveryBoyList?.map((user: UserData) => user.userId).includes(deliveryPersonId))
        .sort((a, b) => a.data?.transactionId > b.data?.transactionId ? 1 : -1);
    }
    return [];
  }

  getSortedTransactionList(): EntryTransaction[] {
    if (this.isDataChanged && this.getTransactionList()) {
      return (Object.values(this.getTransactionList()) as EntryTransaction[])
        .sort((a, b) => a.data?.transactionId > b.data?.transactionId ? 1 : -1);
    }
    return [];
  }

  addNewEntry(entry: EntryTransaction, isEditing = false, isDuplicate = false) {
    this.firebaseService.setData(`transactionList/${entry.data?.transactionId}`, entry)
      .then(() => {
        const objects = this.transactionList.getValue() || {};
        objects[entry.data.transactionId] = entry;
        this.transactionList.next(objects);
        this.isDataChanged.next(true);

        this.notificationService.showNotification({
          heading: isEditing && !isDuplicate ? 'Entry edited.' : 'New entry added.',
          message: 'Data saved successfully.',
          duration: 5000,
          leftBarColor: this.notificationService.color?.green
        });
      }).catch(() => {
        this.isDataChanged.next(false);
        this.notificationService.somethingWentWrong('102');
      });
  }

  addNewEntryInCache(entry: EntryTransaction) {
    const objects = this.transactionList.getValue() || {};
    objects[entry.data.transactionId] = entry;
    this.transactionList.next(objects);
    this.isDataChanged.next(true);
  }

  deleteEntry(entry: EntryTransaction) {
    this.firebaseService.setData(`transactionList/${entry.data?.transactionId}`, null)
      .then(() => {
        const objects = this.transactionList.getValue() || {};
        delete objects[entry.data.transactionId];
        this.transactionList.next(objects);
        this.isDataChanged.next(true);

        this.notificationService.showNotification({
          heading: 'Entry deleted!',
          message: 'Data erased successfully.',
          duration: 5000,
          leftBarColor: this.notificationService.color?.green
        });
      }).catch(() => {
        this.notificationService.somethingWentWrong('103');
        this.isDataChanged.next(false);
      });
  }

  getInventoryDataObject() {
    return this.inventoryDataObject;
  }

  updateInventoryDataObject() {
    const transactionList = this.getSortedTransactionList();
    this.inventoryDataObject = transactionList.map((item: EntryTransaction, index) => this.transformItem(item, index)).reverse();
  }

  generateInventoryDataObjects() {
    this.updateInventoryDataObject();
    this.isDataChanged.next(true);
  }

  transformItem(item: EntryTransaction, index = 0) {
    const payment = item.data?.payment || 0;
    const totalAmt = item.data.total || 0;
    const tagList = item.data.tags || [];

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
      dueAmt: totalAmt - payment,
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

  getEntryData(transactionId: string): EntryTransaction {
    const objects = this.transactionList.getValue() || {};
    return objects[transactionId] as EntryTransaction;
  }

  updateMovedEntries(transactionList: EntryTransaction[]) {
    const objects = this.transactionList.getValue() || {};
    transactionList.forEach(entry => objects[entry.data.transactionId] = entry);

    this.transactionList.next(objects);
    this.isDataChanged.next(true);
    this.updateInventoryDataObject();
  }
}