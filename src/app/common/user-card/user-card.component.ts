import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { copyData, getNumberInformat } from '../../shared/commonFunctions';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-user-card',
  imports: [
    CommonModule
  ],
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.scss'
})
export class UserCardComponent implements OnInit {

  constructor(
    private notificationService: NotificationService
  ) { }

  @Input() userObject: any;
  @Input() selected = false;

  data: any;

  ngOnInit(): void {
    this.data = this.userObject?.data;
  }

  copyData(event: any, data: string) {
    event.stopPropagation();
    copyData(data, this.notificationService);
  }

  getNumberInformat(arg0: any) {
    return getNumberInformat(arg0);
  }
}
