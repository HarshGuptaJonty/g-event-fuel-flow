import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { FirebaseService } from "./firebase.service";
import { NotificationService } from "./notification.service";
import { Customer } from "../../assets/models/Customer";
import { EntryDataService } from "./entry-data.service";
import { EntryTransaction } from "../../assets/models/EntryTransaction";

@Injectable({
    providedIn: 'root'
})
export class MoveEntryService {

    private moveEntryHistory: MoveEntryPayload[] = [];

    constructor(
        private afAuth: AngularFireAuth,
        private firebaseService: FirebaseService,
        private notificationService: NotificationService,
        private entryDataService: EntryDataService
    ) {
        this.initialize();
    }

    async initialize() {
        const data = await this.firebaseService.getData('moveEntryHistory');
        this.moveEntryHistory = data || [];
    }

    getMoveEntryHistory(): MoveEntryPayload[] {
        return this.moveEntryHistory;
    }

    moveEntries(data: MoveEntryPayload, targetAccount: Customer, sourceAccount: Customer) {
        let successCount = 0;
        let failureCount = 0;
        let successfulMoves: EntryTransaction[] = [];

        data.transactionIdList.forEach((transactionId: string) => {
            const entryData = this.entryDataService.getEntryData(transactionId);
            if (!entryData)
                failureCount++;
            else {
                entryData.data.customer = {
                    fullName: targetAccount.data.fullName || sourceAccount.data.fullName,
                    phoneNumber: targetAccount.data.phoneNumber || sourceAccount.data.phoneNumber,
                    userId: targetAccount.data.userId
                };
                entryData.others = {
                    ...entryData.others,
                    movedBy: data.movedBy,
                    movedTime: data.moveTime,
                    moveIds: [...(entryData.others?.moveIds || []), data.moveId]
                };

                this.firebaseService.setData(`transactionList/${transactionId}`, entryData).then(() => {
                    successCount++;
                    successfulMoves.push(entryData);
                }).catch(() => {
                    failureCount++;
                }).finally(() => {
                    if (successCount + failureCount === data.transactionIdList.length) {
                        this.entryDataService.updateMovedEntries(successfulMoves); // update local data after moving

                        this.notificationService.showNotification({
                            heading: `Entries moved successfully!`,
                            message: `${successCount} entries moved successfully, ${failureCount} entries failed to move.`,
                            duration: 5000,
                            leftBarColor: failureCount === 0 ? this.notificationService.color.green : successCount === 0 ? this.notificationService.color.red : this.notificationService.color.yellow
                        });
                    }
                });
            }
        });

        // log this move in move history
        this.firebaseService.setData(`moveEntryHistory/${data.moveId}`, data);
    }
}

export interface MoveEntryPayload {
    fromUserId: string;
    toUserId: string;
    transactionIdList: string[];
    moveTime: number;
    movedBy: string;
    moveId: string;
    extraNote?: string;
}