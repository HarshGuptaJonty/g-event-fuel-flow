import { ENTER, COMMA } from "@angular/cdk/keycodes";
import { CommonModule } from "@angular/common";
import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from "@angular/core";
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl } from "@angular/forms";
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatChipsModule, MatChipInputEvent } from "@angular/material/chips";
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { provideNgxMask } from "ngx-mask";
import { Customer } from "../../../assets/models/Customer";
import { DeliveryPerson } from "../../../assets/models/DeliveryPerson";
import { DeliveryData, DeliveryDone, EntryTransaction } from "../../../assets/models/EntryTransaction";
import { Product, ProductQuantity } from "../../../assets/models/Product";
import { Tags } from "../../../assets/models/Tags";
import { AccountService } from "../../services/account.service";
import { ConfirmationModelService } from "../../services/confirmation-model.service";
import { CustomerDataService } from "../../services/customer-data.service";
import { DeliveryPersonDataService } from "../../services/delivery-person-data.service";
import { EntryDataService } from "../../services/entry-data.service";
import { NotificationService } from "../../services/notification.service";
import { ProductService } from "../../services/product.service";
import { SettingService } from "../../services/setting.service";
import { TagService } from "../../services/tag.service";
import { generateRandomString, generateDateTimeKey } from "../../shared/commonFunctions";
import { map, Observable, startWith } from "rxjs";
import { MatDividerModule } from '@angular/material/divider'
import { Router } from "@angular/router";
import moment from "moment";

@Component({
  selector: 'app-new-entry',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatDividerModule
  ],
  providers: [
    provideNgxMask()
  ],
  templateUrl: './new-entry.component.html',
  styleUrl: './new-entry.component.scss'
})
export class NewEntryComponent implements OnInit {

  @Input() openTransaction?: EntryTransaction;
  @Input() customerObject?: Customer;
  @Input() isDuplicate = false;
  @Input() isEditing = false;
  @Input() isImporting = false;

  @Output() onCancel = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onSubmit = new EventEmitter<EntryTransaction>();

  @ViewChild('tagInput') tagInput!: ElementRef<HTMLInputElement>;

  customerForm: FormGroup = new FormGroup({
    name: new FormControl('', Validators.required),
    number: new FormControl(''),
    address: new FormControl('', Validators.required),
    userId: new FormControl('', Validators.required),
  });

  otherDetailForm: FormGroup = new FormGroup({
    date: new FormControl('', Validators.required),
    paidAmt: new FormControl(''),
    status: new FormControl(''),
    extraDetails: new FormControl(''),
    tagName: new FormControl(''),
  });

  productForm: FormGroup = new FormGroup({});
  deliveryForm: FormGroup = new FormGroup({});

  deliveryPersonForm: FormGroup = new FormGroup({
    deliveryBoyName: new FormControl(''),
  });

  cNameFilter?: Observable<Customer[]>;
  cNumberFilter?: Observable<Customer[]>;
  addressFilters?: Observable<string[]>;
  deliveryBoyFilters?: Observable<DeliveryPerson[]>;

  disableSave = false;
  transactionId?: string = '';
  totalSum = 0;

  customerPhoneNumbers: string[] = [];
  customerList: Customer[] = [];
  customerSelected = false;

  shippingAddressList: string[] = [];
  shippingAddressSelected = false;

  deliveryPersonDataJSON: any;
  deliveryBoysSearchList: DeliveryPerson[] = [];
  deliveryBoySelectedList: DeliveryPerson[] = [];

  productDataJSON: any;
  productList: Product[] = [];

  tagObject: any = {};
  tagList: Tags[] = [];
  newTagList: Tags[] = [];
  selectedTags: string[] = [];
  tagSearchList: Tags[] = []
  hasNewTags = false;

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  productFormPrefix = ['rate-', 'sent-', 'received-', 'payment-'];
  // extraDetailsOptions: string[] = ['Paid', 'Due'];

  constructor(
    private accountService: AccountService,
    private entryDataService: EntryDataService,
    private confirmationModelService: ConfirmationModelService,
    private deliveryPersonDataService: DeliveryPersonDataService,
    private customerDataService: CustomerDataService,
    private productService: ProductService,
    private notificationService: NotificationService,
    private router: Router,
    private settingService: SettingService,
    private tagService: TagService
  ) { }

  ngOnInit(): void {
    this.cNameFilter = this.customerForm.get('name')?.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.name;
        return name ? this._customerNameFilter(name as string) : this.customerList;
      }),
    );

    this.cNumberFilter = this.customerForm.get('number')?.valueChanges.pipe(
      startWith(''),
      map(value => {
        const number = typeof value === 'string' ? value : value?.number;
        return number ? this._customerNumberFilter(number as string) : this.customerList;
      }),
    );

    this.addressFilters = this.customerForm.get('address')?.valueChanges.pipe(
      startWith(''),
      map(value => {
        const address = typeof value === 'string' ? value : value?.address;
        return address ? this._addressFilter(address as string) : this.shippingAddressList;
      }),
    );

    this.deliveryBoyFilters = this.deliveryPersonForm.get('deliveryBoyName')?.valueChanges.pipe(
      startWith(''),
      map(value => {
        const search = typeof value === 'string' ? value : value?.name;
        return search ? this._deliveryBoyFilter(search as string) : this.deliveryBoysSearchList;
      }),
    );

    this.productService.isDataChanged?.subscribe(flag => {
      if (flag) {
        this.productDataJSON = this.productService.getProductList();
        this.productList = Object.values(this.productDataJSON);
        this.generateProductForm();
      }
    });
    this.productDataJSON = this.productService.getProductList();
    this.productList = Object.values(this.productDataJSON);
    this.generateProductForm();

    this.transactionId = this.openTransaction?.data.transactionId;
    if (this.isDuplicate) this.transactionId = undefined;

    this.tagService.isDataChanged?.subscribe(flag => {
      if (flag) {
        this.tagObject = this.tagService.getTagObject();
        this.tagList = Object.values(this.tagObject);
        this.tagSearchList = this.tagList;
      }
    });
    this.tagObject = this.tagService.getTagObject();
    this.tagList = Object.values(this.tagObject);
    this.tagSearchList = this.tagList;

    this.otherDetailForm.get('date')?.setValue(moment(this.settingService.getNewEntryDate() || '', 'DDMMYYYY').toDate());
    this.otherDetailForm.markAllAsTouched();

    if (this.isEditing || this.isImporting) {
      this.customerForm.get('name')?.setValue(this.openTransaction?.data.customer?.fullName || '');
      this.customerForm.get('number')?.setValue(this.openTransaction?.data.customer?.phoneNumber || '');
      this.customerForm.get('address')?.setValue(this.openTransaction?.data.shippingAddress || '');
      this.customerForm.get('userId')?.setValue(this.openTransaction?.data.customer?.userId || '');
      this.customerForm.markAllAsTouched();

      this.otherDetailForm.get('date')?.setValue(moment(this.openTransaction?.data.date || '', 'DD/MM/YYYY').toDate());
      this.otherDetailForm.get('paidAmt')?.setValue(this.openTransaction?.data.payment || '');
      this.otherDetailForm.get('extraDetails')?.setValue(this.openTransaction?.data.extraDetails || '');

      if (this.openTransaction?.data.status)
        this.otherDetailForm.get('status')?.setValue(this.openTransaction?.data.status);
      else {
        const extraDetails = this.openTransaction?.data.extraDetails?.toLowerCase() || '';
        if (extraDetails.includes('paid'))
          this.otherDetailForm.get('status')?.setValue('Paid');
        else if (extraDetails.includes('due'))
          this.otherDetailForm.get('status')?.setValue('Due');
      }
      
      this.otherDetailForm.markAllAsTouched();

      this.selectedTags = this.openTransaction?.data.tags || [];
      this.totalSum = this.openTransaction?.data.total || 0;
      this.customerSelected = !!this.openTransaction?.data.customer?.userId;
      this.shippingAddressSelected = !!this.openTransaction?.data.shippingAddress;
    }

    this.loadCustomerData();
    this.loadDeliveryPersonData();

    this.deliveryForm.addValidators(this.deliveryFormValidator.bind(this));
    this.customerForm.get('number')?.valueChanges.subscribe((value: string) => {
      this.customerSelected = this.customerPhoneNumbers.includes(value);
      if (!this.customerSelected && this.shippingAddressSelected) {
        this.shippingAddressList = [];
        this.shippingAddressSelected = false;
        this.customerForm.get('address')?.setValue('');
      }
    });
    this.customerForm.get('address')?.valueChanges.subscribe((value: string) => this.shippingAddressSelected = this.shippingAddressList.includes(value));

    if (this.customerObject && !this.isEditing)
      this.onSelectCustomer(this.customerObject, false);
  }

  generateProductForm() {
    if (this.productList.length > 0) {
      this.productList.forEach(product => {
        this.productFormPrefix.forEach(prefix => {
          this.productForm.addControl(prefix + product.data.productId,
            new FormControl({ value: prefix === 'rate-' ? parseInt(product.data.rate?.toString() || '0') : NaN, disabled: prefix === 'received-' && !product.data.productReturnable }));
        });
      });
      this.productForm.addValidators(this.productFormValidator.bind(this));
    }

    if (this.isEditing || this.isImporting) {
      const selectedProductList = (this.openTransaction?.data.selectedProducts || []) as ProductQuantity[];
      selectedProductList.forEach(product => {
        const productId = product.productData.productId;
        this.productForm.get(`rate-${productId}`)?.setValue(product.productData.rate || NaN);
        this.productForm.get(`sent-${productId}`)?.setValue(product.sentUnits || NaN);
        this.productForm.get(`received-${productId}`)?.setValue(product.recievedUnits || NaN);
        this.productForm.get(`payment-${productId}`)?.setValue(product.paymentAmt || NaN);
      });
      this.productForm.markAllAsTouched();
    }
  }

  loadCustomerData(showNotification = false) {
    if (this.customerDataService.getCustomerData()) {
      this.customerList = Object.values(this.customerDataService.getCustomerList());
      this.customerPhoneNumbers = this.customerList.map((user: any) => user?.data?.phoneNumber);

      //id user is editing from inventory page then get customer object
      let customerObject = undefined;
      if ((this.isEditing || this.isImporting) && this.openTransaction?.data.customer?.userId) {
        customerObject = this.customerDataService.getCustomerList()[this.openTransaction.data.customer.userId];
        if (customerObject)
          this.shippingAddressList = customerObject?.data?.shippingAddress || [];
      }

    } else if (showNotification) {
      this.notificationService.showNotification({
        heading: 'No Customer data found!',
        duration: 5000,
        leftBarColor: this.notificationService.color.yellow
      });
    }
  }

  loadDeliveryPersonData(showNotification = false) {
    if (this.deliveryPersonDataService.hasDeliveryPersonData()) {
      this.deliveryPersonDataJSON = this.deliveryPersonDataService.getDeliveryPersonList();
      this.deliveryBoysSearchList = Object.values(this.deliveryPersonDataJSON);

      if (this.isEditing || this.isImporting) {
        const deliveryBoyList = (this.openTransaction?.data.deliveryBoyList || []) as DeliveryDone[];
        deliveryBoyList.forEach(deliveryDone => {
          const deliveryBoy = this.deliveryPersonDataJSON[deliveryDone.userId];
          if (deliveryBoy)
            this.onSelectDeliveryBoy(deliveryBoy, false, deliveryDone.deliveryDone);
        });
        this.deliveryForm.markAllAsTouched();
      }
    } else if (showNotification) {
      this.notificationService.showNotification({
        heading: 'No Delivery person data found!',
        duration: 5000,
        leftBarColor: this.notificationService.color.yellow
      });
    }
  }

  onRefreshData() {
    this.notificationService.showNotification({
      heading: 'Data Refreshing...',
      message: 'Downloading new data!',
      duration: 1000,
      leftBarColor: this.notificationService.color.green
    });
    this.productDataJSON = this.productService.getProductList();
    this.productList = Object.values(this.productDataJSON);
    this.tagObject = this.tagService.getTagObject();
    this.tagList = Object.values(this.tagObject);
    this.tagSearchList = this.tagList;
    this.loadCustomerData(true);
    this.loadDeliveryPersonData(true);
  }

  onSelectCustomer(customer: Customer, isUserSelect = true) {
    this.customerForm.get('name')?.setValue(customer.data?.fullName);
    this.customerForm.get('number')?.setValue(customer.data?.phoneNumber);
    this.customerForm.get('userId')?.setValue(customer.data?.userId);
    this.customerForm.markAllAsTouched();

    this.shippingAddressList = customer.data?.shippingAddress || [];
    this.shippingAddressSelected = false;

    if (isUserSelect) // dont remove address when user is editing from customer page
      this.customerForm.get('address')?.setValue('');

    if (this.shippingAddressList.length === 1) {
      this.customerForm.get('address')?.setValue(this.shippingAddressList[0]);
      this.shippingAddressSelected = true;
    }
  }

  addTag(event: MatChipInputEvent): void {
    const newTagName = (event.value || '').trim();

    const newTagObject: Tags = {
      data: {
        name: newTagName,
        colorCode: '000000',
        tagId: generateDateTimeKey() + '_' + generateRandomString(5)
      }
    }

    if (newTagName) {
      this.tagObject[newTagObject.data.tagId] = newTagObject;
      this.newTagList.push(newTagObject);
      this.selectedTags.push(newTagObject.data.tagId);

      this.hasNewTags = true;
      this.tagInput.nativeElement.value = '';
      this.otherDetailForm.get('tagName')?.setValue('');
    }
  }

  removeDeliveryPersonFromList(deliveryPersonObj: DeliveryPerson): void {
    this.productList.forEach(product => {
      const productId = product.data.productId;
      this.deliveryForm.removeControl(`s-${deliveryPersonObj.data.userId}-${productId}`);
      this.deliveryForm.removeControl(`r-${deliveryPersonObj.data.userId}-${productId}`);
    });
    this.deliveryForm.addValidators(this.deliveryFormValidator.bind(this));

    this.deliveryBoysSearchList.push(deliveryPersonObj);
    this.deliveryBoySelectedList = this.deliveryBoySelectedList.filter(person => person.data.userId !== deliveryPersonObj.data.userId);
  }

  removeTagFromList(tagIdToRemove: string): void {
    this.selectedTags = this.selectedTags.filter(tagId => tagId !== tagIdToRemove);
    this.newTagList = this.newTagList.filter(tag => tag.data.tagId !== tagIdToRemove);
    this.hasNewTags = this.newTagList.length > 0;
  }

  onSelectDeliveryBoy(deliveryBoy: DeliveryPerson, isUserSelected = true, deliveryDone?: DeliveryData[]): void {
    const deliveryDoneJSON: any = deliveryDone?.reduce((acc: any, curr: DeliveryData) => {
      acc[curr.productId] = [curr.sentUnits || NaN, curr.recievedUnits || NaN];
      return acc;
    }, {}) || {};

    if (isUserSelected && this.deliveryBoySelectedList.length === 0) {
      const productValue = this.productForm.value;
      Object.entries(productValue).forEach(([key, value]: [string, any]) => {
        const [type, productId] = key.split('-');
        const parsedValue = parseInt(value || '0');

        if (!deliveryDoneJSON[productId])
          deliveryDoneJSON[productId] = [0, 0]; // Initialize if not present

        if (type === 'sent')
          deliveryDoneJSON[productId][0] += parsedValue;
        else if (type === 'received')
          deliveryDoneJSON[productId][1] += parsedValue;
      });
    }

    this.productList.forEach(product => {
      const productId = product.data.productId;
      this.deliveryForm.addControl(`s-${deliveryBoy.data.userId}-${productId}`, new FormControl(deliveryDoneJSON?.[productId]?.[0] || NaN));
      this.deliveryForm.addControl(`r-${deliveryBoy.data.userId}-${productId}`, new FormControl(deliveryDoneJSON?.[productId]?.[1] || NaN));
    });

    this.deliveryBoySelectedList.push(deliveryBoy);
    setTimeout(() => this.deliveryPersonForm.get('deliveryBoyName')?.setValue(''), 1);
    this.deliveryBoysSearchList.splice(this.deliveryBoysSearchList.indexOf(deliveryBoy), 1);
  }

  selectedTag(event: MatAutocompleteSelectedEvent): void {
    const tagId: string = event.option.value;

    this.selectedTags.push(tagId);
    this.tagInput.nativeElement.value = '';
    this.otherDetailForm.get('tagName')?.setValue('');

    event.option.deselect();
  }

  onSaveClick() {
    if (this.disableSave) return;

    const customerValue = this.customerForm.value;
    const otherDetailValue = this.otherDetailForm.value;
    const productValue = this.productForm.value;
    const deliveryValue = this.deliveryForm.value;

    this.disableSave = true; // to prevent multiple save of same entry

    let createdBy = this.openTransaction?.others?.createdBy || this.accountService.getUserId();
    let createdTime = this.openTransaction?.others?.createdTime || Date.now();
    let transactionId = this.openTransaction?.data.transactionId || this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5);

    if (this.isDuplicate || this.isImporting) {
      transactionId = this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5);
      createdBy = this.accountService.getUserId();
      createdTime = Date.now();
    }

    this.entryDataService.isDataChanged.subscribe((result) => {
      if (result === false) // if save entry failed due to backend error then enable save for retry but by checking the values
        this.disableSave = false;
    });

    if (this.isEditing) { // user editing old transaction and date is updated
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
              this.entryDataService.deleteEntry(this.openTransaction);
          });
        } else if (this.settingService.setting.oldEntryWhenDateEdited === 'yes')
          this.entryDataService.deleteEntry(this.openTransaction);

        transactionId = this.getFormattedDate('YYYYMMDD') + '_' + generateDateTimeKey() + '_' + generateRandomString(5); // update id if user edited date
      }
    }

    const customer: any = {
      fullName: customerValue.name,
      phoneNumber: customerValue.number,
      userId: customerValue.userId || generateRandomString()
    };

    let checks = true;
    if (!customer?.fullName || customer?.fullName.length === 0) {
      this.customerForm.markAsTouched();
      this.customerForm.get('name')?.markAsTouched();
      checks = false;
    }
    if (!customerValue.address || customerValue.address.length === 0) {
      this.customerForm.markAsTouched();
      this.customerForm.get('address')?.markAsTouched();
      checks = false;
    }
    if (!checks) {
      this.disableSave = false;
      this.notificationService.showNotification({
        heading: 'Invalid customer data!',
        message: 'Please fill all the customer required fields.',
        duration: 5000,
        leftBarColor: this.notificationService.color.red
      });
      return;
    }

    if (!this.customerSelected)
      this.customerDataService.addNewCustomer(customer.userId, customer.fullName, customer.phoneNumber);

    if (!this.shippingAddressSelected) {
      const address = customerValue.address.trim();
      if (this.settingService.setting.askForConfirmationOnNewAddress === 'yes') {
        this.confirmationModelService.showModel({
          heading: 'Add New Shipping Address?',
          message: `Dear user, ${address} is not present in ${customer.fullName}'s profile. Do you want to add this in the profile?`,
          leftButton: {
            text: 'Confirm',
            customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY_BLUE,
          }, rightButton: {
            text: 'Cancel',
            customClass: this.confirmationModelService.CUSTOM_CLASS?.GREY,
          }
        }).subscribe(result => {
          this.confirmationModelService.hideModel();
          if (result === 'left' && address && customer.userId)
            this.customerDataService.addNewAddress(address, customer.userId);
        });
      } else {
        if (address && customer.userId)
          this.customerDataService.addNewAddress(address, customer.userId);
      }
    }

    if (this.hasNewTags)
      this.newTagList.forEach((newTag: Tags) => this.tagService.createAndAddNewTags(newTag));

    const deliveryCountPerProduct: any = {};
    const deliveryDoneJSON: any = {};

    Object.entries(deliveryValue).forEach(([key, value]: [string, any]) => {
      const [type, userId, productId] = key.split('-');
      const parsedValue = parseInt(value || '0');
      if (parsedValue > 0) {
        const deliveryPerson = this.deliveryPersonDataJSON[userId] as DeliveryPerson;

        if (!deliveryDoneJSON[userId]) {
          deliveryDoneJSON[userId] = {
            fullName: deliveryPerson?.data?.fullName,
            phoneNumber: deliveryPerson?.data?.phoneNumber,
            userId: userId,
            deliveryDone: {}
          }
        }

        if (!deliveryDoneJSON[userId].deliveryDone[productId]) {
          deliveryDoneJSON[userId].deliveryDone[productId] = {
            productId: productId,
            sentUnits: 0,
            recievedUnits: 0
          };
        }

        if (type === 's') {
          deliveryDoneJSON[userId].deliveryDone[productId].sentUnits += parsedValue;
        } else if (type === 'r') {
          deliveryDoneJSON[userId].deliveryDone[productId].recievedUnits += parsedValue;
        }

        deliveryCountPerProduct[productId] = (deliveryCountPerProduct[productId] || 0) + (parsedValue * (type === 's' ? 1 : -1));
      }
    });

    const deliveryDone: DeliveryDone[] = Object.values(deliveryDoneJSON).map((delivery: any) => {
      return {
        fullName: delivery.fullName,
        phoneNumber: delivery.phoneNumber,
        userId: delivery.userId,
        deliveryDone: Object.values(delivery.deliveryDone),
      } as DeliveryDone;
    });

    const selectedProductJSON: any = {};

    Object.entries(productValue).forEach(([key, value]: [string, any]) => {
      const [type, productId] = key.split('-');
      const parsedValue = parseInt(value || '0');
      const product = this.productDataJSON[productId] as Product;

      if (!selectedProductJSON[productId]) {
        selectedProductJSON[productId] = {
          paymentAmt: 0,
          productData: {
            name: product.data.name,
            productId: product.data.productId,
            productReturnable: product.data.productReturnable,
            rate: product.data.rate
          },
          recievedUnits: 0,
          sentUnits: 1
        };
      }

      if (type === 'rate')
        selectedProductJSON[productId].productData.rate = parsedValue;
      else if (type === 'sent') {
        selectedProductJSON[productId].sentUnits = parsedValue;
        deliveryCountPerProduct[productId] = (deliveryCountPerProduct[productId] || 0) - parsedValue;
      } else if (type === 'received') {
        selectedProductJSON[productId].recievedUnits = parsedValue;
        deliveryCountPerProduct[productId] = (deliveryCountPerProduct[productId] || 0) + parsedValue;
      } else if (type === 'payment')
        selectedProductJSON[productId].paymentAmt = parsedValue;
    });

    if (Object.keys(deliveryCountPerProduct).length > 0 && Object.values(deliveryCountPerProduct).some(count => count !== 0)) {
      this.notificationService.showNotification({
        heading: 'Total units mismatch!',
        message: 'The total units from products and delivery persons do not match. Please check the values.',
        duration: 7000,
        leftBarColor: this.notificationService.color.red
      });
      this.deliveryForm.markAsTouched();
      this.deliveryForm.setErrors({ atLeastOneRequired: true });
      this.disableSave = false;
      return;
    }

    let selectedProductsList: ProductQuantity[] = Object.values(selectedProductJSON) as ProductQuantity[];
    selectedProductsList = selectedProductsList.filter((product: ProductQuantity) => product.sentUnits > 0 || product.recievedUnits > 0);
    this.totalSum = selectedProductsList.reduce((sum, product) => sum + (product.sentUnits * product.productData.rate), 0);

    const data: EntryTransaction = {
      data: {
        date: this.getFormattedDate('DD/MM/YYYY'),
        customer: customer,
        deliveryBoyList: deliveryDone,
        total: this.totalSum,
        payment: parseInt(otherDetailValue.paidAmt || '0'),
        transactionId: transactionId,
        importIndex: this.isImporting ? this.openTransaction?.data.importIndex : 0,
        extraDetails: otherDetailValue.extraDetails,
        status: otherDetailValue.status,
        shippingAddress: customerValue.address.trim(),
        selectedProducts: selectedProductsList,
        tags: this.selectedTags
      }, others: {
        createdBy: createdBy,
        createdTime: createdTime,
        editedBy: this.accountService.getUserId(),
        editedTime: Date.now(),
        movedBy: this.openTransaction?.others?.movedBy || null,
        movedTime: this.openTransaction?.others?.movedTime || null,
        moveIds: this.openTransaction?.others?.moveIds || []
      }
    };

    checks = true;
    if (!data.data.date || data.data.date === 'Invalid date' || data.data.date.length === 0) {
      this.otherDetailForm.markAsTouched();
      this.otherDetailForm.get('date')?.markAsTouched();
      checks = false;
    }
    if (!data.data.customer?.fullName || data.data.customer?.fullName.length === 0) {
      this.customerForm.markAsTouched();
      this.customerForm.get('name')?.markAsTouched();
      checks = false;
    }
    if (!data.data.shippingAddress || data.data.shippingAddress.length === 0) {
      this.customerForm.markAsTouched();
      this.customerForm.get('address')?.markAsTouched();
      checks = false;
    }
    if (data.data.selectedProducts?.length === 0) {
      this.productForm.markAsTouched();
      this.productForm.setErrors({ atLeastOneRequired: true });
      checks = false;
    }
    if (data.data.deliveryBoyList?.length === 0) {
      this.deliveryPersonForm.markAsTouched();
      this.deliveryForm.markAsTouched();
      this.deliveryForm.setErrors({ atLeastOneRequired: true });
      checks = false;
    }

    if (checks) {
      this.onSubmit.emit(data);
      this.onCancel.emit();
    } else {
      this.notificationService.showNotification({
        heading: 'Invalid Entry',
        message: 'Please fill all the required fields before saving.',
        duration: 5000,
        leftBarColor: this.notificationService.color.red
      });
      this.disableSave = false; // re-enable save button if checks fails
    }
  }

  onDeleteClick() {
    this.confirmationModelService.showModel({
      heading: 'Delete entry?',
      message: 'You are trying to delete an entry, once done, cannot be retrived, are you sure?',
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
        this.onDelete.emit();
      } else
        this.confirmationModelService.hideModel();
    });
  }

  onCancelClick() {
    this.onCancel.emit();
  }

  getFormattedDate(format: string, date = this.otherDetailForm.get('date')?.value): string {
    const formatted = date ? moment(date).format(format) : '';
    if (formatted === 'Invalid date')
      return '';
    return formatted;
  }

  addProduct() {
    this.onCancel.emit();
    this.router.navigate(['/dashboard/warehouse'], { queryParams: { addProduct: true } });
  }

  deliveryFormValidator(control: AbstractControl) {
    if (!(control instanceof FormGroup))
      return null;

    const formGroup = control as FormGroup;
    let allFieldsEmpty = true;

    for (const key in formGroup.controls) {
      const formControl = formGroup.get(key);
      if (formControl && formControl.value)
        allFieldsEmpty = false;
    }

    if (allFieldsEmpty)
      return { 'atLeastOneRequired': true };

    return null;
  }

  productFormValidator(control: AbstractControl) {
    if (!(control instanceof FormGroup))
      return null;

    const formGroup = control as FormGroup;
    let allFieldsEmpty = true;

    for (const key in formGroup.controls) {
      if (key.startsWith('sent-') || key.startsWith('received-')) {
        const formControl = formGroup.get(key);
        if (formControl)
          if (formControl.value)
            allFieldsEmpty = false;
      }
    }

    if (allFieldsEmpty)
      return { 'atLeastOneRequired': true };

    return null;
  }

  isDarkColor(color: string): boolean {
    if (!color || color.length !== 6) return false;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) < 186;
  }

  private _customerNameFilter(name: string): Customer[] {
    const filterValue = name.toLowerCase();
    return this.customerList.filter(customer => customer?.data?.fullName?.toLowerCase().includes(filterValue));
  }

  private _customerNumberFilter(number: string): Customer[] {
    return this.customerList.filter(customer => customer?.data?.phoneNumber?.includes(number));
  }

  private _addressFilter(address: string): string[] {
    const filterValue = address.toLowerCase();
    return this.shippingAddressList.filter(addr => addr.toLowerCase().includes(filterValue));
  }

  private _deliveryBoyFilter(search: string): DeliveryPerson[] {
    const filterValue = search.toLowerCase();
    return this.deliveryBoysSearchList.filter(person => {

      const name = person?.data?.fullName?.toLowerCase() || '';
      const number = person?.data?.phoneNumber || '';

      return name.includes(filterValue) || number.includes(filterValue);

    });
  }
}
