import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EntryTransaction } from '../../assets/models/EntryTransaction';
import { AdminDataService } from './admin-data.service';
import { formatDateAndTime } from '../shared/commonFunctions';

@Injectable({
  providedIn: 'root'
})
export class EntryDetailModelService {

  private entryData = new BehaviorSubject<any>(null);
  entryData$ = this.entryData.asObservable();

  constructor(
    private adminDataService: AdminDataService
  ) { }

  showModel(data: EntryTransaction) {
    this.entryData.next(this.formatData(data));
  }

  hideModel() {
    this.entryData.next(null);
  }

  formatData(entry: EntryTransaction) {
    return {
      transactionId: entry.data.transactionId,
      shippingAddress: entry.data.shippingAddress,
      cName: entry.data.customer?.fullName,
      cNumber: entry.data.customer?.phoneNumber?.toString().replace(/(\d{5})(\d{5})/, '$1 $2'),
      date: this.formatDate(entry.data.date),
      totalAmt: entry.data?.total,
      paymentAmt: entry.data.payment,
      paymentDueAmt: (entry.data?.total || 0) - (entry.data.payment || 0),
      deliveryBoyList: entry.data.deliveryBoyList,
      extraDetails: entry.data.extraDetails,
      status: entry.data.status,
      createdBy: this.adminDataService.getAdminName(entry.others?.createdBy),
      createdTime: formatDateAndTime(entry.others?.createdTime),
      editedBy: this.adminDataService.getAdminName(entry.others?.editedBy),
      editedTime: formatDateAndTime(entry.others?.editedTime),
      productDetail: entry.data.selectedProducts,
      movedTime: entry.others?.movedTime ? formatDateAndTime(entry.others?.movedTime) : null,
      movedBy: entry.others?.movedBy ? this.adminDataService.getAdminName(entry.others.movedBy) : null,
      moveCount: entry.others?.moveIds?.length || 0
    }
  }

  formatDate(dateStr?: string) {
    if (!dateStr)
      return null;

    const [day, month, year] = dateStr.split('/');
    const date = new Date(`${year}-${month}-${day}`);

    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
