import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { Customer } from '../../../assets/models/Customer';
import { CommonModule } from '@angular/common';
import { copyData, getNumberInformat, timeAgoWithMsg } from '../../shared/commonFunctions';
import { MatButtonModule } from '@angular/material/button';
import { NotificationService } from '../../services/notification.service';
import { DeliveryPerson } from '../../../assets/models/DeliveryPerson';

@Component({
  selector: 'app-user-details',
  imports: [
    CommonModule,
    MatButtonModule,
  ],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss'
})
export class UserDetailsComponent implements OnChanges {

  constructor(
    private notificationService: NotificationService
  ) { }

  @Input() userObject?: Customer | DeliveryPerson;
  @Input() userId: any;
  @Input() isCustomer = false;
  @Input() isUpdated = false;
  @Input() depositOverview: any[] = [];
  @Input() depositPending = 0;

  @Output() onProfileEdit = new EventEmitter<any>();
  @Output() onStatusUpdate = new EventEmitter<any>();

  data: any;
  others: any;
  computedData: any = {
    createdOn: 0
  };
  showMoreAddress = false;
  showDepositOverview = false;

  ngOnChanges(): void {
    this.data = this.userObject?.data;
    this.others = this.userObject?.others;
    this.showMoreAddress = false;
    this.showDepositOverview = false;

    this.computedData.createdOn = timeAgoWithMsg(this.others?.createdTime);
  }

  getNumberInformat(arg0: any) {
    return getNumberInformat(arg0);
  }

  copyData(data: string) {
    copyData(data, this.notificationService);
  }

  editProfile() {
    this.onProfileEdit.emit();
  }

  toggleUpdateStatus() {
    this.onStatusUpdate.emit(!this.isUpdated);
  }
}
