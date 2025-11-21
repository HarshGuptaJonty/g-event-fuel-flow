import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LOCAL_STORAGE_KEYS } from '../shared/constants';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { NotificationService } from './notification.service';
import { AiWidgetService } from './ai-widget.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private authData = new BehaviorSubject<any>(null);
  authData$ = this.authData.asObservable();

  private userData = new BehaviorSubject<any>(null);
  userData$ = this.userData.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private router: Router,
    private notificationService: NotificationService,
    private aiWidgetService: AiWidgetService
  ) {
    const storedAuth = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_PROFILE);
    if (storedAuth)
      this.authData?.next(JSON.parse(storedAuth));

    const storedUser = sessionStorage.getItem(LOCAL_STORAGE_KEYS.USER_PROFILE);
    if (storedUser)
      this.userData?.next(JSON.parse(storedUser));
  }

  setAuthData(data: any) {
    this.authData?.next(data);
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(data));
  }

  getAuthData() {
    return this.authData?.value;
  }

  hasAuthData() {
    return !!this.authData?.value
  }

  setUserData(data: any) {
    this.userData?.next(data);
    sessionStorage.setItem(LOCAL_STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));
  }

  getUserData() {
    return this.userData?.value;
  }

  hasUserData() {
    return !!this.userData?.value;
  }

  //extra functions
  getUserId() {
    if (!this.authData?.value?.user?.uid) {
      this.signOut();
      this.notificationService.notAuthorized();
    } else
      return this.authData?.value?.user?.uid
  }

  signOut() {
    this.aiWidgetService.isWidgetVisible = false;
    this.afAuth.signOut();

    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_PROFILE);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.USER_PROFILE);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.CUSTOMER_DATA);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.DELIVERY_PERSON_DATA);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.SETTING);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.NAV_SETTING);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.TAG_DATA);
    sessionStorage.removeItem(LOCAL_STORAGE_KEYS.ATTENDANCE_DATA);

    this.authData?.next(null);
    this.userData?.next(null);

    this.router.navigate(['/auth']);
  }
}
