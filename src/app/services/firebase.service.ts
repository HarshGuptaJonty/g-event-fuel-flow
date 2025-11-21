import { Injectable } from '@angular/core';
import { child, Database, get, ref, set } from '@angular/fire/database';
import { NotificationService } from './notification.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { DEVELOPER } from '../shared/constants';
import { EfficiencyTrackerService } from './efficiencyTracker.service';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  constructor(
    private afAuth: AngularFireAuth,
    private db: Database,
    private notificationService: NotificationService,
    private efficiencyTrackerService: EfficiencyTrackerService,
    private httpClient: HttpClient
  ) { }

  async getData(path: string, showNotification = false) {
    if (DEVELOPER.IS_DEV_ENVIRONMENT)
      path = DEVELOPER.DEV_PATH_PREFIX + path;
    if (DEVELOPER.IS_STAGE_ENVIRONMENT)
      path = DEVELOPER.STAGE_PATH_PREFIX + path;

    if (DEVELOPER.USE_LOCAL_DATABASE && !path.includes('admin'))
      return this.getDataFromLocalJson(path);

    const dbRef = ref(this.db);

    try {
      const snapshot = await get(child(dbRef, path));
      if (snapshot.exists()) {

        const data = snapshot.val();
        const dataSizeBytes = new Blob([JSON.stringify(data)]).size; // Calculate size in bytes
        this.efficiencyTrackerService.dataDownloaded(path, dataSizeBytes);

        return data;
      } else {

        if (showNotification)
          this.notificationService.showNotification({
            heading: 'Something Went Wrong!',
            message: 'Please Contact IT Support!',
            duration: 5000,
            leftBarColor: '#ff0000'
          });

        return {};
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      this.notificationService.somethingWentWrong('104');
      return {};
    }
  }

  setData(path: string, data: any) {
    if (DEVELOPER.USE_LOCAL_DATABASE) {
      alert('Using local database, new data will not persist changes.');
      return Promise.resolve(); // No-op for local database
    }

    if (DEVELOPER.IS_DEV_ENVIRONMENT)
      path = DEVELOPER.DEV_PATH_PREFIX + path;
    if (DEVELOPER.IS_STAGE_ENVIRONMENT)
      path = DEVELOPER.STAGE_PATH_PREFIX + path;

    return set(ref(this.db, path), data);
  }

  setAuthPersistence() {
    const auth = getAuth();
    return setPersistence(auth, browserLocalPersistence)
      .then(() => {
        if (DEVELOPER.IS_DEV_ENVIRONMENT || DEVELOPER.IS_STAGE_ENVIRONMENT)
          console.log('Persistence set to browser local storage');
      })
      .catch((error) => {
        console.error('Error setting persistence:', error);
      });
  }

  getloggedInUserData(userId: string): Promise<any> {
    return this.getData(`admin/${userId}`).then((data) => {
      if (data && data.data) {
        return data;
      } else {
        this.notificationService.notAuthorized();
        return null;
      }
    }).catch(() => {
      this.notificationService.somethingWentWrong('125');
      return null;
    });
  }

  private async getDataFromLocalJson(path: string) {
    try {
      const pathSegments = path.split('/').filter(p => p);
      let currentData = await firstValueFrom(this.httpClient.get<any>(DEVELOPER.LOCAL_DATABASE_URL));

      for (const segment of pathSegments) {
        if (currentData && typeof currentData === 'object' && segment in currentData) {
          currentData = currentData[segment];
        } else {
          console.warn(`Path not found in '${DEVELOPER.LOCAL_DATABASE_URL}'. Failed at segment: '${segment}'`);
          return {}; // Return empty object if path is invalid
        }
      }

      const dataSizeBytes = new Blob([JSON.stringify(currentData)]).size; // Calculate size in bytes
      this.efficiencyTrackerService.dataDownloaded(path, dataSizeBytes, true);

      return currentData;
    } catch (error) {
      console.error('Error reading or processing local database file!', error);
      return {}; // Return empty object on error
    }
  }
}
