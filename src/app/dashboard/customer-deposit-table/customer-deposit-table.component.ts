import { CommonModule } from "@angular/common";
import { AfterViewChecked, AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, TemplateRef, ViewChild } from "@angular/core";
import { Customer } from "../../../assets/models/Customer";
import { MatPaginator, MatPaginatorModule } from "@angular/material/paginator";
import { MatTableDataSource, MatTableModule } from "@angular/material/table";
import { DepositEntry } from "../../../assets/models/EntryTransaction";
import { ShortcutService } from "../../services/shortcut.service";
import { Router } from "@angular/router";
import { NewDepositEntryComponent } from "../../common/new-deposit-entry/new-deposit-entry.component";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { DepositDataService } from "../../services/depositData.service";
import { NotificationService } from "../../services/notification.service";
import { dateConverter } from "../../shared/commonFunctions";
import { SettingService } from "../../services/setting.service";
import { ConfirmationModelService } from "../../services/confirmation-model.service";

@Component({
	selector: 'app-customer-deposit-table',
	imports: [
		CommonModule,
		MatTableModule,
		MatPaginatorModule,
		NewDepositEntryComponent
	],
	templateUrl: './customer-deposit-table.component.html',
	styleUrl: './customer-deposit-table.component.scss'
})
export class CustomerDepositTableComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked {

	@Input() customerObject?: Customer;

	@Output() updateDataSource = new EventEmitter<any>();
	@Output() updateDueAmount = new EventEmitter<number>();
	@Output() hideDeposit = new EventEmitter<any>();

	@ViewChild('plainText', { static: true }) plainText!: TemplateRef<any>;
	@ViewChild('amountText', { static: true }) amountText!: TemplateRef<any>;
	@ViewChild('actionText', { static: true }) actionText!: TemplateRef<any>;
	@ViewChild('productDetail', { static: true }) productDetail!: TemplateRef<any>;

	@ViewChild(MatPaginator) paginator!: MatPaginator;

	tableStructure = [
		{
			key: 'date',
			label: 'Date',
			dataType: 'plainText'
		}, {
			key: 'productData.name',
			label: 'Product',
			customClass: 'witdh-limit-200',
			dataType: 'productDetail',
			isLink: true
		}, {
			key: 'sentUnits',
			label: 'Sent',
			customClass: 'text-right',
			dataType: 'productDetail'
		}, {
			key: 'recievedUnits',
			label: 'Recieved',
			customClass: 'text-right',
			dataType: 'productDetail'
		}, {
			key: 'paymentAmt',
			label: 'Payment Amt',
			customClass: 'text-right',
			dataType: 'amountText'
		}, {
			key: 'returnAmt',
			label: 'Return Amt',
			customClass: 'text-right',
			dataType: 'amountText'
		}, {
			key: 'dueAmt',
			label: 'Balane',
			customClass: 'text-right',
			dataType: 'amountText'
		}, {
			key: 'action',
			label: 'Action',
			customClass: 'text-right',
			dataType: 'actionText'
		}
	];

	dueAmount = 0;
	processedTableData?: any;
	rawTransactionList: DepositEntry[] = [];
	newEntry = false;
	isDuplicate = false;
	entryDataAvaliable = false;
	openTransaction?: DepositEntry;
	isRefreshing = false;

	dataSource = new MatTableDataSource<any>([]);

	constructor(
		private afAuth: AngularFireAuth,
		private depositDataService: DepositDataService,
		private notificationService: NotificationService,
		private confirmationModelService: ConfirmationModelService,
		private router: Router,
		private shortcutService: ShortcutService,
		private settingService: SettingService
	) { }

	ngOnInit(): void {
		this.shortcutService.shortcutTriggered.subscribe(key => {
			if (key === this.shortcutService.SHORTCUT.NEW_ENTRY)
				this.newEntry = true;
		});
	}

	ngOnChanges(): void {
		this.refreshEntryData(); // to refersh first time
		this.entryDataAvaliable = this.rawTransactionList.length > 0;

		this.depositDataService.isDataChanged?.subscribe(flag => {
			if (flag) {
				this.entryDataAvaliable = true;
				this.refreshEntryData(); // to refresh when there is data change
				this.newEntry = false;
				this.isRefreshing = false;
			}
		});
	}

	ngAfterViewInit(): void {
		this.dataSource.paginator = this.paginator;
	}

	ngAfterViewChecked(): void {
		if (this.paginator && this.dataSource.paginator !== this.paginator) {
			this.dataSource.paginator = this.paginator;
		}
	}

	refreshData() {
		if (this.isRefreshing)
			return;
		this.isRefreshing = true;

		setTimeout(() => {
			if (this.entryDataAvaliable) {
				this.refreshEntryData();
				this.notificationService.transactionListRefreshed();
			} else {
				this.depositDataService.hardRefresh();

				this.notificationService.showNotification({
					heading: 'No data found!',
					message: 'Initiating hard refresh.',
					duration: 4000,
					leftBarColor: this.notificationService.color.yellow
				});
			}
			this.isRefreshing = false;
		}, 1000);
	}

	async refreshEntryData() {
		this.newEntry = false;
		this.dueAmount = 0;
		this.rawTransactionList = [];
		this.processedTableData = null;
		this.openTransaction = undefined;

		this.rawTransactionList = this.depositDataService.getCustomerDepositList(this.customerObject?.data.userId || '');
		this.processedTableData = this.rawTransactionList.map((item: DepositEntry, index) => this.transformItem(item, index)).reverse();

		this.dataSource.data = this.processedTableData;
		this.resetPaginator();
		this.updateDataSource.emit(this.processedTableData);
		this.updateDueAmount.emit(this.dueAmount);
	}

	resetPaginator() {
		if (this.paginator) {
			this.paginator.pageIndex = 0;
			this.dataSource.paginator = this.paginator;
		}
	}

	transformItem(item: DepositEntry, index = 0) {
		const paymentAmt = item.data.paymentAmt || 0;
		const returnAmt = item.data.returnAmt || 0;
		this.dueAmount += paymentAmt - returnAmt;

		return {
			index: index,
			date: dateConverter(item.data?.date || ''),
			customerId: item.data.customer.userId,
			paymentAmt: paymentAmt,
			returnAmt: returnAmt,
			dueAmt: this.dueAmount,
			transactionId: item.data?.transactionId,
			productDetail: item.data.selectedProducts,

			extraNote: item.data.extraDetails,
			hasExtraNote: item.data.extraDetails && item.data.extraDetails.length > 0
		};
	}

	hasExtraNote = (index: number, row: any) => row.hasExtraNote;

	saveEntry(event: DepositEntry) {
		this.depositDataService.addNewDeposit(event, !!this.openTransaction, this.isDuplicate);
		this.isDuplicate = false;
	}

	editEntry(object: any) {
		if (this.settingService.setting.askForConfirmationOnEdit === 'yes') {
			this.confirmationModelService.showModel({
				heading: 'Edit Entry?',
				message: 'You are trying to edit an existing entry, are you sure?',
				leftButton: {
					text: 'Yes',
					customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_BLUE,
				}, rightButton: {
					text: 'Cancel',
					customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
				}
			}).subscribe(result => {
				this.confirmationModelService.hideModel();
				if (result === 'left') {
					this.openTransaction = this.depositDataService.getDepositObjectList()?.[object?.customerId]?.[object?.transactionId];
					this.newEntry = true;
				}
			});
		} else {
			this.openTransaction = this.depositDataService.getDepositObjectList()?.[object?.customerId]?.[object?.transactionId];
			this.newEntry = true;
		}
	}

	duplicate(object: any) {
		if (this.settingService.setting.askForConfirmationOnDuplicate === 'yes') {
			this.confirmationModelService.showModel({
				heading: 'Duplicate Entry?',
				message: 'You are trying to duplicate from an existing entry, are you sure?',
				leftButton: {
					text: 'Yes',
					customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_BLUE,
				}, rightButton: {
					text: 'Cancel',
					customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
				}
			}).subscribe(result => {
				this.confirmationModelService.hideModel();
				if (result === 'left') {
					this.isDuplicate = true;
					this.openTransaction = this.depositDataService.getDepositObjectList()?.[object?.customerId]?.[object?.transactionId];
					this.newEntry = true;
				}
			});
		} else {
			this.isDuplicate = true;
			this.openTransaction = this.depositDataService.getDepositObjectList()?.[object?.customerId]?.[object?.transactionId];
			this.newEntry = true;
		}
	}

	deleteEntry(object: any) {
		this.isDuplicate = false;
		if (!object) {
			this.notificationService.somethingWentWrong('118');
			return;
		}
		this.depositDataService.deleteEntry(object);
	}

	openProduct(product: any) {
		this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId: product.productData.productId } });
	}

	getTemplate(dataType: string) {
		if (dataType === 'amountText') return this.amountText;
		if (dataType === 'actionText') return this.actionText;
		if (dataType === 'productDetail') return this.productDetail;
		return this.plainText;
	}

	displayedColumns(): string[] {
		return this.tableStructure.map(item => item.key);
	}

	getValue(obj: any, path: string): any {
		const returnable = obj?.productData?.productReturnable || false;

		if (path === 'recievedUnits')
			if (returnable)
				return path.split('.').reduce((acc, part) => acc && acc[part], obj);
			else
				return '-';

		return path.split('.').reduce((acc, part) => acc && acc[part], obj);
	}

	hideDepositData() {
		this.hideDeposit.emit();
	}
}