import { CommonModule } from "@angular/common";
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { Product, ProductQuantity } from "../../../assets/models/Product";
import { NotificationService } from "../../services/notification.service";
import { DepositEntry, UserData } from "../../../assets/models/EntryTransaction";
import { Customer } from "../../../assets/models/Customer";
import { MatInputModule } from "@angular/material/input";
import { ConfirmationModelService } from "../../services/confirmation-model.service";
import { ProductService } from "../../services/product.service";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";
import { DepositDataService } from "../../services/depositData.service";
import { generateDateTimeKey, generateRandomString } from "../../shared/commonFunctions";
import { AccountService } from "../../services/account.service";
import moment from "moment";
import { SettingService } from "../../services/setting.service";

@Component({
	selector: 'app-new-deposit-entry',
	imports: [
		CommonModule,
		ReactiveFormsModule,
		MatDatepickerModule,
		MatFormFieldModule,
		MatInputModule,
		MatButtonModule,
	],
	templateUrl: './new-deposit-entry.component.html',
	styleUrl: './new-deposit-entry.component.scss'
})
export class NewDepositEntryComponent implements OnInit {

	@Input() openTransaction?: DepositEntry;
	@Input() customerObject?: Customer;
	@Input() isDuplicate = false;

	@Output() onCancel = new EventEmitter<any>();
	@Output() onDelete = new EventEmitter<any>();
	@Output() onSubmit = new EventEmitter<DepositEntry>();

	@ViewChild('formSection') formSection!: ElementRef;

	entryForm: FormGroup = new FormGroup({
		date: new FormControl(''),
		paidAmt: new FormControl(''),
		returnAmt: new FormControl(''),

		extraDetails: new FormControl(''),
	});

	disableSave = true;
	isEditing = false;
	isRefreshedForProduct = false;
	allowAddProduct = false;
	errorMessage?: string;
	focusedFormName = '';
	transactionId?: string = '';

	productList: Product[] = [];
	selectedProductList: ProductQuantity[] = [];

	constructor(
		private accountService: AccountService,
		private depositDataService: DepositDataService,
		private confirmationModelService: ConfirmationModelService,
		private productService: ProductService,
		private notificationService: NotificationService,
		private router: Router,
		private settingService: SettingService
	) { }

	ngOnInit(): void {
		this.isEditing = !!this.openTransaction;
		this.transactionId = this.openTransaction?.data.transactionId || '';
		if (this.isDuplicate) this.transactionId = undefined

		this.productService.isDataChanged?.subscribe(flag => {
			if (flag)
				this.productList = Object.values(this.productService.getProductList());
		});
		this.productList = Object.values(this.productService.getProductList());

		if (this.isEditing) {
			this.entryForm = new FormGroup({
				date: new FormControl({ value: moment(this.openTransaction?.data.date || '', 'DD/MM/YYYY').toDate(), disabled: false }),
				paidAmt: new FormControl(this.openTransaction?.data.paymentAmt || 0),
				returnAmt: new FormControl(this.openTransaction?.data.returnAmt || 0),

				extraDetails: new FormControl(this.openTransaction?.data.extraDetails || ''),
			});

			this.selectedProductList = this.openTransaction?.data.selectedProducts || [];
		} else {
			this.entryForm = new FormGroup({
				date: new FormControl({ value: moment(this.settingService.getNewEntryDate() || '', 'DDMMYYYY').toDate(), disabled: false }),
				paidAmt: new FormControl(''),
				returnAmt: new FormControl(''),

				extraDetails: new FormControl(''),
			});
		}

		this.entryForm.valueChanges.subscribe((value) => this.checkForDataValidation(value));
	}

	@HostListener('document:click', ['$event'])
	clickout(event: Event) {
		if (this.formSection && !this.formSection.nativeElement.contains(event.target))
			this.focusedFormName = '';
	}

	onRefreshData() {
		this.notificationService.showNotification({
			heading: 'Data Refreshing...',
			message: 'Downloading new data!',
			duration: 1000,
			leftBarColor: this.notificationService.color.green
		});
		this.productList = Object.values(this.productService.getProductList());
	}

	onSaveClick() {
		const value = this.entryForm.value;

		this.disableSave = true; // to prevent multiple save of same entry
		this.depositDataService.isDataChanged.subscribe((result) => {
			if (result === false)  // if save entry failed due to backend error then enable save for retry but by checking the values
				this.checkForDataValidation(value);
		});

		let createdBy = this.openTransaction?.others?.createdBy || this.accountService.getUserId();
		let createdTime = this.openTransaction?.others?.createdTime || Date.now();
		let transactionId = this.openTransaction?.data.transactionId ||
			this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5);

		if (this.isDuplicate) {
			createdBy = this.accountService.getUserId();
			createdTime = Date.now();
			transactionId = this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5);
		} else if (this.isEditing) {
			if (this.openTransaction && this.openTransaction?.data.date !== this.getFormattedDate('DD/MM/YYYY')) {

				if (this.settingService.setting.oldEntryWhenDateEdited === 'ask') {
					this.confirmationModelService.showModel({
						heading: 'Delete old entry?',
						message: 'Dear admin, each entry is linked to its date, and you have edited the date, do you wish to keep or delete the old entry? This cannot be undone!',
						leftButton: {
							text: 'Delete old entry',
							customClass: this.confirmationModelService.CUSTOM_CLASS.GREY_RED
						}, rightButton: {
							text: 'Keep old entry',
							customClass: this.confirmationModelService.CUSTOM_CLASS.GREY_BLUE
						}
					}).subscribe(result => {
						this.confirmationModelService.hideModel();
						if (result === 'left' && this.openTransaction)
							this.depositDataService.deleteEntry(this.openTransaction);
					});
				} else if (this.settingService.setting.oldEntryWhenDateEdited === 'yes')
					this.depositDataService.deleteEntry(this.openTransaction);

				transactionId = this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5);
			}
		}

		if (!this.customerObject?.data.userId) {
			this.notificationService.showNotification({
				heading: 'Customer object not found',
				message: 'Please select a customer before saving.',
				duration: 5000,
				leftBarColor: this.notificationService.color.red
			});
			return;
		}

		const customer: UserData = {
			fullName: this.customerObject?.data.fullName,
			phoneNumber: this.customerObject?.data.phoneNumber,
			userId: this.customerObject?.data.userId,
		};

		const data: DepositEntry = {
			data: {
				date: this.getFormattedDate('DD/MM/YYYY'),
				customer: customer,
				paymentAmt: parseInt(value.paidAmt || 0),
				returnAmt: parseInt(value.returnAmt || 0),
				transactionId: transactionId,
				extraDetails: value.extraDetails,
				selectedProducts: this.selectedProductList
			}, others: {
				createdBy: createdBy,
				createdTime: createdTime,
				editedBy: this.accountService.getUserId(),
				editedTime: Date.now()
			}
		};
		this.onSubmit.emit(data);
	}

	onDeleteClick() {
		this.confirmationModelService.showModel({
			heading: 'Delete entry?',
			message: 'You are trying to delete a deposit entry, once done, cannot be retrived, are you sure?',
			leftButton: {
				text: 'Confirm',
				customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_RED,
			}, rightButton: {
				text: 'Cancel',
				customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
			}
		}).subscribe(result => {
			this.confirmationModelService.hideModel();
			if (result === 'left')
				this.onDelete.emit();
		});
	}

	onCancelClick() {
		this.onCancel.emit();
	}

	checkForDataValidation(value: any) {
		this.disableSave = false;
		this.errorMessage = undefined;

		// if (value.paidAmt == 0 && value.returnAmt == 0) {
		// 	this.disableSave = true;
		// 	this.errorMessage = 'Either payment amount or return amount is required.';
		// } else 
		if (this.getFormattedDate('DD/MM/YYYY', value.date).length == 0) {
			this.disableSave = true;
			this.errorMessage = 'Please enter date of entry.';
		}
	}

	removeProduct(event: any, index: number) {
		event.stopPropagation();

		this.selectedProductList.splice(index, 1);
		this.checkForDataValidation(this.entryForm.value);
	}

	submitProductSelection() {
		this.selectedProductList = [];
		let paymentSum = 0;

		for (const item of this.productList) {
			const rateElement = document.getElementById(`rate_${item.data.productId}`) as HTMLInputElement;
			const sentElement = document.getElementById(`sent_${item.data.productId}`) as HTMLInputElement;
			const recievedElement = document.getElementById(`recieved_${item.data.productId}`) as HTMLInputElement;
			const paymentElement = document.getElementById(`payment_${item.data.productId}`) as HTMLInputElement;

			if (rateElement && sentElement && recievedElement) {
				const rate = parseInt(rateElement.value);
				const sentUnits = parseInt(sentElement.value);
				const recievedUnits = parseInt(recievedElement.value);
				const paymentAmt = parseInt(paymentElement?.value || '0');

				if (sentUnits > 0 || recievedUnits > 0 || paymentAmt > 0) {
					this.selectedProductList.push({
						productData: {
							name: item.data.name,
							rate: rate,
							productId: item.data.productId,
							productReturnable: item.data.productReturnable || false
						},
						sentUnits: sentUnits,
						recievedUnits: recievedUnits,
						paymentAmt: paymentAmt
					})
					paymentSum += paymentAmt;
				}
			}
		}

		if (paymentSum > 0)
			this.entryForm.get('paidAmt')?.setValue(paymentSum);
		this.focusedFormName = '';
		this.checkForDataValidation(this.entryForm.value);
	}

	getFormattedDate(format: string, date = this.entryForm.get('date')?.value): string {
		const formatted = date ? moment(date).format(format) : '';
		if (formatted === 'Invalid date')
			return '';
		return formatted;
	}

	addProduct() {
		this.onCancel.emit();
		this.router.navigate(['/dashboard/warehouse'], { queryParams: { addProduct: true } });
	}

	onfocus(formName: string) {
		this.focusedFormName = formName;

		if (formName === 'productSelect') {
			if (this.productList.length === 0) {
				if (this.isRefreshedForProduct === false) {
					this.notificationService.showNotification({
						heading: 'No product found',
						message: 'No product list found, please refresh and try again.',
						duration: 4000,
						leftBarColor: this.notificationService.color.yellow
					})
					this.isRefreshedForProduct = true;
				} else {
					this.notificationService.showNotification({
						heading: 'No product found',
						message: 'Please add products before making any entry.',
						duration: 4000,
						leftBarColor: this.notificationService.color.red
					})
					this.allowAddProduct = true;
				}
				this.focusedFormName = '';
			} else {
				this.isRefreshedForProduct = false;
				this.allowAddProduct = false;
			}

			setTimeout(() => {
				for (const item of this.selectedProductList) {
					const rateElement = document.getElementById(`rate_${item.productData.productId}`) as HTMLInputElement;
					const sentElement = document.getElementById(`sent_${item.productData.productId}`) as HTMLInputElement;
					const recievedElement = document.getElementById(`recieved_${item.productData.productId}`) as HTMLInputElement;
					const paymentElement = document.getElementById(`payment_${item.productData.productId}`) as HTMLInputElement;

					if (rateElement)
						rateElement.value = item.productData.rate.toString();
					if (sentElement)
						sentElement.value = item.sentUnits.toString();
					if (recievedElement)
						recievedElement.value = item.recievedUnits.toString();
					if (paymentElement)
						paymentElement.value = item.paymentAmt.toString();
				}
			}, 100);
		}
	}
}