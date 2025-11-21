import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { BehaviorSubject, Subject } from 'rxjs';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {

  private adminList = new BehaviorSubject<any>(null); // this loads all the transaction of the current year and store in it for usage
  adminList$ = this.adminList.asObservable();

  isDataChanged = new Subject<any>();

  constructor(
    private afAuth: AngularFireAuth,
    private firebaseService: FirebaseService
  ) {
    this.initialize();
  }

  private async initialize() {
    const data = await this.firebaseService.getData('admin');
    if (Object.keys(data).length > 0) {
      this.adminList.next(data);
      this.isDataChanged.next(true);
    } else {
      this.adminList.next(null);
      this.isDataChanged.next(false);
    }
  }

  getAdminData(userId?: string) {
    if (!userId)
      return null;
    return Object(this.adminList.getValue())[userId];
  }

  getAdminName(userId?: string) {
    if (!userId)
      return 'NA';
    return this.getAdminData(userId)?.data?.fullName;
  }
}
