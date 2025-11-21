import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { BehaviorSubject, Subject } from "rxjs";
import { FirebaseService } from "./firebase.service";
import { NotificationService } from "./notification.service";
import { DepositEntry } from "../../assets/models/EntryTransaction";

@Injectable({
	providedIn: 'root'
})
export class DepositDataService {
	private depositObjectList = new BehaviorSubject<any>(null);
	depositObjectList$ = this.depositObjectList.asObservable();

	isDataChanged = new Subject<any>();

	constructor(
		private afAuth: AngularFireAuth,
		private firebaseService: FirebaseService,
		private notificationService: NotificationService
	) {
		this.initialize();
	}

	private async initialize(showNotification = false) {
		const data = await this.firebaseService.getData('depositObjectList');
		if (Object.keys(data).length > 0) {
			this.depositObjectList.next(data);
			this.isDataChanged.next(true);

			if (showNotification)
				this.notificationService.depositListRefreshed();
		} else {
			this.depositObjectList.next(null);
			this.isDataChanged.next(false);

			if (showNotification) {
				this.notificationService.showNotification({
					heading: 'No entry to show!',
					duration: 5000,
					leftBarColor: this.notificationService.color.red
				});
			}
		}
	}

	hardRefresh() {
		this.initialize(true);
	}

	getDepositObjectList() {
		return this.depositObjectList.value || {};
	}

	hasDepositData() {
		return !!this.depositObjectList?.value;
	}

	customerHasData(customerId: string): boolean {
		if (this.isDataChanged && this.getDepositObjectList()) {
			return !!this.getDepositObjectList()?.[customerId];
		}
		return false;
	}

	getCustomerDepositList(customerId: string): DepositEntry[] {
		if (this.isDataChanged && this.getDepositObjectList()) {
			return Object.values(this.getDepositObjectList()?.[customerId] || {}) as DepositEntry[]
		}
		return [];
	}

	addNewDeposit(entry: DepositEntry, isEditing = false, isDuplicate = false) {
		this.firebaseService.setData(`depositObjectList/${entry.data.customer.userId}/${entry.data?.transactionId}`, entry)
			.then(() => {
				const objects = this.depositObjectList.getValue() || {};

				if (!objects[entry.data.customer.userId])
					objects[entry.data.customer.userId] = {};
				objects[entry.data.customer.userId][entry.data.transactionId] = entry;

				this.depositObjectList.next(objects);
				this.isDataChanged.next(true);

				this.notificationService.showNotification({
					heading: isEditing && !isDuplicate ? 'Entry edited.' : 'New deposit added.',
					message: 'Data saved successfully.',
					duration: 5000,
					leftBarColor: this.notificationService.color?.green
				});
			}).catch(() => {
				this.isDataChanged.next(false);
				this.notificationService.somethingWentWrong('116');
			});
	}

	deleteEntry(entry: DepositEntry) {
		this.firebaseService.setData(`depositObjectList/${entry.data.customer.userId}/${entry.data?.transactionId}`, null)
			.then(() => {
				const objects = this.depositObjectList.getValue() || {};
				delete objects[entry.data.customer.userId][entry.data.transactionId];
				this.depositObjectList.next(objects);
				this.isDataChanged.next(true);

				this.notificationService.showNotification({
					heading: 'Entry deleted!',
					message: 'Data erased successfully.',
					duration: 5000,
					leftBarColor: this.notificationService.color?.green
				});
			}).catch(() => {
				this.notificationService.somethingWentWrong('117');
				this.isDataChanged.next(false);
			});
	}
}