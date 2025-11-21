import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { BehaviorSubject, Subject } from "rxjs";
import { FirebaseService } from "./firebase.service";
import { LOCAL_STORAGE_KEYS } from "../shared/constants";
import { NotificationService } from "./notification.service";

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {

    private attendanceData = new BehaviorSubject<any>(null);
    attendanceData$ = this.attendanceData.asObservable();

    isDataChanged = new Subject<any>();

    constructor(
        private afAuth: AngularFireAuth,
        private firebaseService: FirebaseService,
        private notificationService: NotificationService
    ) {
        const storedAttendance = sessionStorage.getItem(LOCAL_STORAGE_KEYS.ATTENDANCE_DATA);
        if (storedAttendance)
            this.attendanceData?.next(JSON.parse(storedAttendance));
        else
            this.refreshData();
    }

    setAttendanceData(data: any) {
        this.attendanceData.next(data);
        sessionStorage.setItem(LOCAL_STORAGE_KEYS.ATTENDANCE_DATA, JSON.stringify(data));
    }

    async updateAttendanceData(userId: string, dateKey: string, value: any): Promise<boolean> {
        if (value == false)
            value = null;
        return this.firebaseService.setData(`attendance/${dateKey}/${userId}`, value).then(() => {
            const objects = this.getAttendanceDataList();
            if (!objects[dateKey])
                objects[dateKey] = {};
            objects[dateKey][userId] = value;
            this.setAttendanceData({
                attendanceDataList: objects,
                others: {
                    lastRefreshed: Date.now()
                }
            });
            this.isDataChanged.next(true);

            return true;
        }).catch(() => {
            this.isDataChanged.next(false);
            this.notificationService.somethingWentWrong('126');

            return false;
        });
    }

    async refreshData(showNotification = false) {
        const latestData = await this.firebaseService.getData('attendance');
        const data = {
            attendanceDataList: latestData,
            others: {
                lastRefreshed: Date.now()
            }
        }
        this.setAttendanceData(data);
        this.isDataChanged.next(true);

        if (Object.keys(latestData).length === 0)
            this.notificationService.showNotification({
                heading: 'No attendance recorded!',
                duration: 5000,
                leftBarColor: this.notificationService.color.red
            });
        else if (showNotification)
            this.notificationService.showNotification({
                heading: 'Attendance list refreshed.',
                duration: 5000,
                leftBarColor: this.notificationService.color.green
            });
    }

    lastRefreshed() {
        return this.attendanceData?.value?.others?.lastRefreshed || 0;
    }

    getAttendanceData() {
        return this.attendanceData?.value || {};
    }

    getAttendanceDataList() {
        return this.attendanceData?.value?.attendanceDataList || {};
    }

    hasAttendanceData() {
        return Object.values(this.attendanceData?.value?.attendanceDataList || {}).length > 0;
    }
}
