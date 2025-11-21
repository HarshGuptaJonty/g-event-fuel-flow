import { Injectable } from "@angular/core";
import { AccountService } from "../services/account.service";
import { Router } from "@angular/router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FirebaseService } from "../services/firebase.service";
import { NotificationService } from "../services/notification.service";

@Injectable({
  providedIn: 'root'
})
export class authGuard {
  constructor(
    private accountService: AccountService,
    private firebaseService: FirebaseService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  // canActivate() { // return false when user is not logged in and open auth page
  //   if (this.accountService.hasUserData()) {
  //     return true;
  //   } else {
  //     this.router.navigate(['/auth']);
  //     return false;// this will disable the route in route.ts file if user is not logged in and application will navigate to /auth
  //   }
  // }

  canActivate(): Promise<boolean> { // return false when user is not logged in and open auth page
    if (this.accountService.hasUserData()) {
      return Promise.resolve(true);
    }

    const auth = getAuth();
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user: any) => {
        if (user) {
          const userId = user.uid;
          this.firebaseService.getloggedInUserData(userId).then(userData => {
            if (userData) {
              this.accountService.setUserData(userData);
              this.notificationService.welcomeBack(userData.data.fullName); // welcome back notification
              this.accountService.setAuthData({
                user: {
                  uid: user.uid,
                  createdAt: user.metadata.createdAt,
                  lastLoginAt: user.metadata.lastLoginAt
                }
              });
              resolve(true);
            } else {
              this.router.navigate(['/auth']);
              resolve(false); // no data found in database // this will disable the route in route.ts file if user is not logged in and application will navigate to /auth
            }
          });
        } else {
          this.router.navigate(['/auth']);
          resolve(false); // no user logged in // this will disable the route in route.ts file if user is not logged in and application will navigate to /auth
        }
      });
    });
  }
}