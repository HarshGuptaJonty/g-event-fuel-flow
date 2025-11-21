import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { CustomerDataService } from '../../services/customer-data.service';
import { AccountService } from '../../services/account.service';
import { generateRandomString } from '../../shared/commonFunctions';
import { DeliveryPersonDataService } from '../../services/delivery-person-data.service';
import { ConfirmationModelService } from '../../services/confirmation-model.service';
import { Customer } from '../../../assets/models/Customer';
import { DeliveryPerson } from '../../../assets/models/DeliveryPerson';
import { devices, WindowResizeService } from '../../services/window-resize.service';

@Component({
  selector: 'app-new-account',
  imports: [
    CommonModule,
    NgxMaskDirective,
    MatButtonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  providers: [
    provideNgxMask(),
    AngularFireAuth
  ],
  templateUrl: './new-account.component.html',
  styleUrl: './new-account.component.scss'
})
export class NewAccountComponent implements OnInit, AfterViewInit {

  @Output() onCancel = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();

  @Input() editProfileId = '';
  @Input() userType = '';
  @Input() isEditingProfile = false;

  @ViewChild('nameInput') nameInput!: ElementRef;

  userId?: string;
  accountId?: string;
  accountList?: any;
  disableSave = false;
  phoneNumbers: string[] = [];
  isCustomerType = false;
  shippingAddressCount = 1;
  devices!: devices

  accountForm: FormGroup = new FormGroup({
    fullName: new FormControl('', [Validators.required, Validators.minLength(3)]),
    phoneNumber: new FormControl(''),
    address: new FormControl(''),
    shippingAddress1: new FormControl(''),
    extraNote: new FormControl(''),
    userId: new FormControl('')
  });

  constructor(
    private afAuth: AngularFireAuth,
    private accountService: AccountService,
    private customerService: CustomerDataService,
    private deliveryPersonDataService: DeliveryPersonDataService,
    private confirmationModelService: ConfirmationModelService,
    private cdr: ChangeDetectorRef,
    private windowResizeService: WindowResizeService,
  ) { }

  ngOnInit(): void {
    this.windowResizeService.checkForWindowSize().subscribe((devicesObj: any) => this.devices = devicesObj);
    this.isCustomerType = this.userType === 'customer';

    this.accountList = {};
    this.userId = this.accountService.getUserId();

    if (this.userType === 'customer' && this.customerService.hasCustomerData())
      this.accountList = this.customerService.getCustomerList();
    else if (this.userType === 'deliveryPerson' && this.deliveryPersonDataService.hasDeliveryPersonData())
      this.accountList = this.deliveryPersonDataService.getDeliveryPersonList();
    this.phoneNumbers = Object.values(this.accountList).map((user: any) => user?.data?.phoneNumber).filter(number => number.length > 0);

    this.setupForm();

    if (this.isEditingProfile)
      this.accountId = this.editProfileId;
    else
      this.accountId = generateRandomString();
  }

  ngAfterViewInit(): void {
    this.nameInput.nativeElement.focus();
    this.cdr.detectChanges();
  }

  setupForm() {
    const accountData = this.accountList?.[this.editProfileId];

    if (accountData && this.isEditingProfile) {
      const data = accountData.data;
      this.accountForm = new FormGroup({
        fullName: new FormControl(data.fullName, [Validators.required, Validators.minLength(3)]),
        phoneNumber: new FormControl(data.phoneNumber),
        address: new FormControl(data.address),
        extraNote: new FormControl(data.extraNote),
        userId: new FormControl(data.userId)
      });

      this.shippingAddressCount = data.shippingAddress?.length || 1;
      for (let i = 0; i < this.shippingAddressCount; i++)
        this.accountForm.addControl('shippingAddress' + (i + 1), new FormControl(data.shippingAddress?.[i] || ''));
    } else
      this.isEditingProfile = false;
  }

  useCustomerAddressAsShipping() {
    const pastValue = this.accountForm.get('shippingAddress1')?.value || '';
    if (pastValue.length > 0) {
      this.confirmationModelService.showModel({
        heading: 'Replace existing address?',
        message: 'You have already entered some data in Shipping Address 1, do you want to replace it with Customer Address?',
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
          this.accountForm.get('shippingAddress1')?.setValue(this.accountForm.get('address')?.value);
      });
    } else {
      this.accountForm.get('shippingAddress1')?.setValue(this.accountForm.get('address')?.value);
    }
  }

  getErrorMessage(controlName: string) {
    if (controlName === 'phoneNumber') {
      if (this.accountForm?.controls[controlName].hasError('required'))
        return 'Please enter phone number.';
      else if (this.accountForm?.controls[controlName].hasError('minlength'))
        return 'Please enter 10 digit phone number.';
      else if (this.accountForm?.controls[controlName].hasError('duplicate'))
        return 'Account with this number already present.';
      else if (this.accountForm?.controls[controlName].hasError('pattern'))
        return 'Please enter a valid Indian phone number.';
    }
    return '';
  }

  saveAccountData() {
    if (!this.isEditingProfile)
      this.accountForm.get('userId')?.setValue(this.accountId);

    if (this.userType === 'customer') {
      const addressArray = []

      for (let i = 0; i < this.shippingAddressCount; i++) {
        const data: string = this.accountForm?.get('shippingAddress' + (i + 1))?.value || '';
        if (data.length > 0) // add address only if there is data
          addressArray.push(data)
      }

      if (addressArray.length == 0)
        addressArray.push(''); // add atleast one address with empty data

      const customerData = {
        fullName: this.accountForm.get('fullName')?.value,
        phoneNumber: this.accountForm.get('phoneNumber')?.value,
        address: this.accountForm.get('address')?.value,
        shippingAddress: addressArray,
        extraNote: this.accountForm.get('extraNote')?.value,
        userId: this.accountForm.get('userId')?.value
      }

      const newAccount: any = {
        data: customerData,
        others: {
          createdBy: this.userId,
          createdTime: Date.now()
        }
      }

      this.createNewCustomerAccount(newAccount);
    } else {
      const newAccount: any = {
        data: this.accountForm?.value,
        others: {
          createdBy: this.userId,
          createdTime: Date.now()
        }
      }

      newAccount.data.shippingAddress1 = null;
      this.createNewDeliveryPersonAcconut(newAccount);
    }
  }

  async createNewCustomerAccount(newCustomer: Customer) {
    if (await this.customerService.addNewCustomerFull(newCustomer, this.isEditingProfile)) {
      this.onCancel.emit();
    }
  }

  async createNewDeliveryPersonAcconut(newDeliveryPerson: DeliveryPerson) {
    if (await this.deliveryPersonDataService.addNewDeliveryPersonFull(newDeliveryPerson)) {
      this.onCancel.emit();
    }
  }

  getAccountMessage(): string {
    if (this.isEditingProfile && this.isCustomerType)
      return 'Updated customer profile';
    else if (this.isEditingProfile && !this.isCustomerType)
      return 'Updated delivery person account';
    else if (this.isCustomerType)
      return 'New customer added';
    else
      return 'New delivery person added';
  }

  cancelClicked() {
    this.onCancel.emit();
  }

  deleteClicked() {
    let message = 'You are trying to delete an account, once done, cannot be retrived, are you sure?';
    if (!this.isCustomerType)
      message = 'You are trying to delete a delivery person account, once deleted, cannot be retrived, are you sure? All the entries having this delivery person wont be affected!';

    this.confirmationModelService.showModel({
      heading: 'Delete account?',
      message: message,
      leftButton: {
        text: 'Confirm',
        customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_RED,
      }, rightButton: {
        text: 'Cancel',
        customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
      }
    }).subscribe(result => {
      if (result === 'left') {
        this.confirmationModelService.hideModel();
        this.onCancel.emit();
        this.onDelete.emit();
      } else
        this.confirmationModelService.hideModel();
    });
  }

  duplicateNumberValidator(control: AbstractControl) {
    const numberToSearch = control.value;
    if (!this.isEditingProfile && this.phoneNumbers?.includes(numberToSearch))
      return { duplicate: true };
    return null;
  }

  addMoreShippingAddress() {
    ++this.shippingAddressCount;
    this.accountForm.addControl('shippingAddress' + this.shippingAddressCount, new FormControl(''));
  }

  removeThisAddress(index: number) {
    const val = this.accountForm.get('shippingAddress' + (index + 1))?.value || '';
    if (val.length > 0) {
      this.confirmationModelService.showModel({
        heading: 'Delete Address Line ' + (index + 1) + ' ?',
        message: 'Once deleted, it cannot be retrived!',
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
          this.removeAddress(index);
      });
    } else
      this.removeAddress(index);
  }

  removeAddress(index: number) {
    for (let i = index; i < this.shippingAddressCount - 1; i++)
      this.accountForm.get('shippingAddress' + (i + 1))?.setValue(this.accountForm.get('shippingAddress' + (i + 2))?.value);
    this.accountForm.removeControl('shippingAddress' + this.shippingAddressCount);
    --this.shippingAddressCount;
  }

  capitalizeWords(formName: string): void {
    const value = this.accountForm.get(formName)?.value;
    if (value) {
      const capitalizedValue = value.split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      this.accountForm.get(formName)?.setValue(capitalizedValue, { emitEvent: false });
    }
  }

  capitalizeSentence(formName: string): void {
    const value = this.accountForm.get(formName)?.value;
    if (value) {
      const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
      this.accountForm.get(formName)?.setValue(capitalizedValue, { emitEvent: false });
    }
  }
}
