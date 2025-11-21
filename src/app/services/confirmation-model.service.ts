import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { ConfirmationModel } from '../../assets/models/ConfirmationModel';
import { generateRandomString } from '../shared/commonFunctions';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationModelService {

  confirmationModelData = new BehaviorSubject<ConfirmationModel[]>([]);
  confirmationModelData$ = this.confirmationModelData.asObservable();

  private confirmationStack: ConfirmationModel[] = [];

  CUSTOM_CLASS = {
    GREY: 'grey-btn',
    GREY_BLUE: 'grey-btn-blue',
    GREY_RED: 'grey-btn-red'
  }

  showModel(data: ConfirmationModel) {
    data.id = new Date().getTime() + generateRandomString(4); // if 2 popup are generated at the same time
    data.actionSubject = new Subject<any>();

    this.confirmationStack.push(data);
    this.confirmationModelData.next([...this.confirmationStack]);

    return data.actionSubject;
  }

  hideModel() {
    this.confirmationStack.pop();
    this.confirmationModelData.next([...this.confirmationStack]);
  }

  triggerAction(id?: string, action?: any) {
    const model = this.confirmationStack.find(obj => obj.id === id);
    model?.actionSubject?.next(action);
  }
}
