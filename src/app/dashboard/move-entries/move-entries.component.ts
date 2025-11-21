import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatFormFieldModule } from "@angular/material/form-field";
import { Customer } from "../../../assets/models/Customer";
import { MatInputModule } from "@angular/material/input";
import { CustomerDataService } from "../../services/customer-data.service";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { startWith, map, Observable, Subject, takeUntil } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { EntryTransaction } from "../../../assets/models/EntryTransaction";
import { EntryDataService } from "../../services/entry-data.service";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { EntryDataTableComponent } from "../entry-data-table/entry-data-table.component";
import { NotificationService } from "../../services/notification.service";
import { ConfirmationModelService } from "../../services/confirmation-model.service";
import { AccountService } from "../../services/account.service";
import { generateDateTimeKey, generateRandomString, getDateInDatepickerFormat } from "../../shared/commonFunctions";
import { MoveEntryPayload, MoveEntryService } from "../../services/move-entry.service";
import { AdminDataService } from "../../services/admin-data.service";
import { LoaderService } from "../../services/loader.service";

@Component({
    selector: 'app-move-entries',
    imports: [
        ReactiveFormsModule,
        MatInputModule,
        MatFormFieldModule,
        MatAutocompleteModule,
        MatCheckboxModule,
        EntryDataTableComponent,
        CommonModule
    ],
    templateUrl: './move-entries.component.html',
    styleUrl: './move-entries.component.scss'
})
export class MoveEntriesComponent implements OnInit, OnDestroy {

    accountsList: Customer[] = [];
    targetAccountsList?: Observable<Customer[]>;
    sourceAccountsList?: Observable<Customer[]>;

    accountForm: FormGroup = new FormGroup({
        targetAccount: new FormControl(''),
        sourceAccount: new FormControl(''),
        extraNote: new FormControl('')
    });

    selectedTargetAccount?: Customer;
    selectedSourceAccount?: Customer;

    canLoadEntries = true;
    showHistory = false;
    entriesToBeMoved: EntryTransaction[] = [];
    allEntries: EntryTransaction[] = [];
    history: MoveEntryPayload[] = [];
    expandedHistoryId: string = '';
    moveHistoryEntryList: any = {};
    openTransactionId: string = '';

    private destroy$ = new Subject<void>();

    constructor(
        private customerDataService: CustomerDataService,
        private router: Router,
        private route: ActivatedRoute,
        private entriesDataService: EntryDataService,
        private notificationService: NotificationService,
        private accountService: AccountService,
        private confirmationModelService: ConfirmationModelService,
        private moveEntryService: MoveEntryService,
        private adminDataService: AdminDataService,
        private loadingService: LoaderService
    ) { }

    ngOnInit(): void {
        this.accountsList = Object.values(this.customerDataService.getCustomerList() || {});

        this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            this.openTransactionId = params['transactionId'] || ''; // Extracts 'transactionId' from the URL, if it exists
            if (this.openTransactionId)
                this.loadingService.showWithLoadingText('Loading transaction history...', true, 2000);
        });

        this.targetAccountsList = this.accountForm.get('targetAccount')?.valueChanges.pipe(
            startWith(''),
            map(value => value ? this._deliveryBoyFilter(value as string) : this.accountsList),
        );
        this.sourceAccountsList = this.accountForm.get('sourceAccount')?.valueChanges.pipe(
            startWith(''),
            map(value => value ? this._deliveryBoyFilter(value as string) : this.accountsList),
        );

        setTimeout(() => {
            this.history = Object.values(this.moveEntryService.getMoveEntryHistory()).reverse();
            if (this.history.length > 0 && this.openTransactionId) {
                this.showHistory = true;
                this.loadingService.hide();
            }

            this.allEntries = Object.values(this.entriesDataService.getTransactionList() || {}) as EntryTransaction[];
        }, 1000);
    }

    moveEntries(entries: any) {
        if (entries instanceof Array && entries.length > 0) {
            this.confirmationModelService.showModel({
                heading: 'Are you sure?',
                message: `This will move ${entries.length} entries from ${this.selectedSourceAccount?.data.fullName} to ${this.selectedTargetAccount?.data.fullName}.`,
                leftButton: { text: 'Cancel', customClass: this.confirmationModelService.CUSTOM_CLASS.GREY },
                rightButton: { text: 'Move Entries', customClass: this.confirmationModelService.CUSTOM_CLASS.GREY_RED },
            }).subscribe(result => {
                this.confirmationModelService.hideModel();
                if (result !== 'left')  // confirmed
                    this.moveEntriesConfirmed(entries);
            });
        } else {
            this.notificationService.showNotification({
                heading: 'Invalid entries format.',
                message: 'Please contact developer.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red,
            });
        }
    }

    moveEntriesConfirmed(entries: any) {
        if (!this.selectedSourceAccount || !this.selectedTargetAccount) {
            this.notificationService.showNotification({
                heading: 'Invalid accounts.',
                message: 'Please contact developer.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red,
            });
            return;
        }

        const transactionIdList: string[] = entries.map((entry: any) => entry.transactionId);
        const payload: MoveEntryPayload = {
            fromUserId: this.selectedSourceAccount?.data.userId,
            toUserId: this.selectedTargetAccount?.data.userId,
            transactionIdList: transactionIdList,
            moveTime: Date.now(),
            movedBy: this.accountService.getUserId(),
            moveId: getDateInDatepickerFormat() + '_' + generateDateTimeKey() + '_' + generateRandomString(5), // unique id
            extraNote: this.accountForm.get('extraNote')?.value || ''
        }

        this.moveEntryService.moveEntries(payload, this.selectedTargetAccount, this.selectedSourceAccount);

        //reset all
        this.entriesToBeMoved = [];
        this.canLoadEntries = true;
        this.accountForm.reset();
        this.selectedSourceAccount = undefined;
        this.selectedTargetAccount = undefined;

        this.moveEntryService.initialize(); // refresh history
        setTimeout(() => this.history = Object.values(this.moveEntryService.getMoveEntryHistory()).reverse(), 1000);
    }

    getCustomerName(accountId: string) {
        return this.customerDataService.getName(accountId) || 'Unknown';
    }

    getAdminName(accountId: string) {
        return this.adminDataService.getAdminName(accountId) || 'Unknown';
    }

    getHistoryEntriesList(moveId: string, idList: String[]): EntryTransaction[] {
        if (!this.moveHistoryEntryList[moveId])
            this.moveHistoryEntryList[moveId] = this.allEntries.filter(entry => idList.includes(entry.data.transactionId));

        return this.moveHistoryEntryList[moveId];
    }

    loadEntries() {
        if (this.selectedSourceAccount?.data.userId === this.selectedTargetAccount?.data.userId) {
            this.notificationService.showNotification({
                heading: 'Invalid selection!',
                message: 'Source and Target accounts cannot be the same.',
                duration: 5000,
                leftBarColor: this.notificationService.color.red
            });
            return;
        }

        this.entriesToBeMoved = this.entriesDataService.getCustomerTransactionList(this.selectedSourceAccount?.data.userId);
        if (this.entriesToBeMoved.length === 0) {
            this.notificationService.showNotification({
                heading: 'No entries to move!',
                message: `${this.selectedSourceAccount?.data.fullName} has no entries to move.`,
                duration: 5000,
                leftBarColor: this.notificationService.color.red
            });
        }
        this.canLoadEntries = false;
    }

    openProfile(account: Customer | string) {
        const userId = typeof account === 'string' ? account : account.data.userId;
        this.router.navigate(['/dashboard/customers'], { queryParams: { userId } });
    }

    private _deliveryBoyFilter(search: string): Customer[] {
        const filterValue = search.toLowerCase();
        return this.accountsList.filter(person => {

            const name = person?.data?.fullName?.toLowerCase() || '';
            const number = person?.data?.phoneNumber || '';

            return name.includes(filterValue) || number.includes(filterValue);
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(); // Emit a value to complete all subscriptions
        this.destroy$.complete(); // Complete the Subject
    }
}