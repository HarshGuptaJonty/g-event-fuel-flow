import { AfterViewChecked, Component, OnInit } from '@angular/core';
import { Product } from '../../../assets/models/Product';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AccountService } from '../../services/account.service';
import { formatDateAndTime, generateDateTimeKey, generateRandomString } from '../../shared/commonFunctions';
import { ProductService } from '../../services/product.service';
import { ConfirmationModelService } from '../../services/confirmation-model.service';
import { NotificationService } from '../../services/notification.service';
import { AdminDataService } from '../../services/admin-data.service';
import { ActivatedRoute } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { ShortcutService } from '../../services/shortcut.service';
import { EfficiencyTrackerService } from '../../services/efficiencyTracker.service';
import { ColorPickerModule } from 'ngx-color-picker';
import { Tags } from '../../../assets/models/Tags';
import { TagService } from '../../services/tag.service';
@Component({
  selector: 'app-warehouse',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatChipsModule,
    ColorPickerModule,
  ],
  templateUrl: './warehouse.component.html',
  styleUrl: './warehouse.component.scss'
})
export class WarehouseComponent implements OnInit, AfterViewChecked {

  addNewProduct = false;
  isEditingProduct = false;
  isProductReturnable = true;
  openAddProduct = false;
  errorMessage?: string;
  selectedProduct?: Product;
  queryProductId?: string;
  productList: Product[] = [];

  productForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    rate: new FormControl('0'),
    extraNote: new FormControl('')
  })

  addNewTag = false;
  isEditingTag = false;
  openAddTag = false;
  selectedColor: any = '#000000';
  presetColors: string[] = ['#ff69b4', '#ff7f50', '#deb887', '#FFF200', '#7fff00', '#00ffff'];
  // presetColors: string[] = ['#ED1C24', '#FF7F27', '#FFF200', '#22B14C', '#00A2E8', '#3F48CC'];
  tagList: Tags[] = [];
  selectedTag?: Tags;
  queryTagId?: string;

  tagForm: FormGroup = new FormGroup({
    name: new FormControl('', [Validators.required]),
    colorCode: new FormControl(''),
    extraNote: new FormControl('')
  })

  constructor(
    private route: ActivatedRoute,
    private accountService: AccountService,
    private productService: ProductService,
    private tagService: TagService,
    private confirmationModelService: ConfirmationModelService,
    private notificationService: NotificationService,
    private adminDataService: AdminDataService,
    private shortcutService: ShortcutService,
    private efficiencyTrackerService: EfficiencyTrackerService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.queryProductId = params['productId'];
      this.queryTagId = params['tagId'];
      this.openAddProduct = !!params['addProduct'];
      this.openAddTag = !!params['addTag'];
    });

    this.refreshProductData();
    this.refreshTagData();

    this.productService.isDataChanged?.subscribe(flag => {
      if (flag)
        this.refreshProductData();
    });

    this.tagService.isDataChanged?.subscribe(flag => {
      if (flag)
        this.refreshTagData();
    });

    this.shortcutService.shortcutTriggered.subscribe((shortcut: string) => {
      if (shortcut === this.shortcutService.SHORTCUT.NEW_ACCOUNT)
        this.onAddNewProduct();
    });
  }

  ngAfterViewChecked(): void {
    this.efficiencyTrackerService.stopTracking('warehouse');
  }

  refreshProductData() {
    this.addNewProduct = false;
    this.selectedProduct = undefined;

    const objects = this.productService.getProductList() || {};
    this.productList = Object.values(objects);

    if (this.queryProductId && this.productList.length > 0) {
      this.selectedProduct = objects?.[this.queryProductId];
      this.queryProductId = undefined;
    }

    if (this.openAddProduct)
      this.onAddNewProduct();
  }

  onAddNewProduct() {
    this.isProductReturnable = true;
    this.addNewProduct = !this.addNewProduct;
    if (this.addNewProduct) {
      this.isEditingProduct = false;
      this.productForm.reset();
    }
    this.selectedProduct = undefined;
  }

  onSaveClick() {
    const createdBy = this.selectedProduct?.others?.createdBy || this.accountService.getUserId();
    const createdTime = this.selectedProduct?.others?.createdTime || Date.now();
    const productId = this.selectedProduct?.data.productId || generateDateTimeKey() + '_' + generateRandomString(5);

    const productData = this.productForm.value;
    if (!productData.rate) productData.rate = '0';
    productData.productId = productId;
    productData.productReturnable = this.isProductReturnable;

    const newProduct = {
      data: productData,
      others: {
        createdBy: createdBy,
        createdTime: createdTime,
        editedBy: this.accountService.getUserId(),
        editedTime: Date.now(),
      }
    }

    this.productService.addNewProduct(newProduct, this.isEditingProduct);
    this.addNewProduct = false;
    this.openAddProduct = false;
  }

  onEditClick() {
    this.confirmationModelService.showModel({
      heading: 'Edit product?',
      message: 'You are trying to edit a product, it wont effect any entry made in past, once edited, cannot be undone, are you sure?',
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
        if (this.selectedProduct) {
          this.isEditingProduct = true;
          this.addNewProduct = true;
          this.isProductReturnable = this.selectedProduct?.data.productReturnable || false;

          this.productForm = new FormGroup({
            name: new FormControl(this.selectedProduct?.data.name, [Validators.required]),
            rate: new FormControl(this.selectedProduct?.data.rate || '0'),
            extraNote: new FormControl(this.selectedProduct?.data.extraNote || '')
          })
        } else
          this.notificationService.somethingWentWrong('115');
      } else
        this.confirmationModelService.hideModel();
    });
  }

  onDeleteClick() {
    this.confirmationModelService.showModel({
      heading: 'Delete product?',
      message: 'You are trying to delete a product, it wont effect any entry made in past, once deleted, cannot be retrived, are you sure?',
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
        if (this.selectedProduct)
          this.productService.deleteProduct(this.selectedProduct);
        else
          this.notificationService.somethingWentWrong('114');
      } else
        this.confirmationModelService.hideModel();
    });
  }

  createByName(userId?: string) {
    return this.adminDataService.getAdminName(userId);
  }

  createdTime(timestamp?: number) {
    return formatDateAndTime(timestamp);
  }

  refreshTagData() {
    this.addNewTag = false
    this.selectedTag = undefined;

    const objects = this.tagService.getTagList() || {};
    this.tagList = Object.values(objects);

    if (this.queryTagId && this.tagList.length > 0) {
      this.selectedTag = objects?.[this.queryTagId];
      this.queryTagId = undefined;
    }

    if (this.openAddTag) this.onAddNewTag();
  }

  onAddNewTag() {
    this.addNewTag = !this.addNewTag;
    if (this.addNewTag) {
      this.isEditingTag = false;
      this.tagForm.reset();
      this.tagForm.get("colorCode")?.setValue('000000');
    }
    this.selectedTag = undefined;
  }

  onColorChange(colorCode: string) {
    colorCode = colorCode.toUpperCase();
    colorCode = colorCode.slice(1);

    this.tagForm.get("colorCode")?.setValue(colorCode);
  }

  onTagSave() {
    const createdBy = this.selectedTag?.others?.createdBy || this.accountService.getUserId();
    const createdTime = this.selectedTag?.others?.createdTime || Date.now();
    const tagId = this.selectedTag?.data.tagId || generateDateTimeKey() + '_' + generateRandomString(5);

    const tagData = this.tagForm.value;
    tagData.tagId = tagId;

    const newTag: Tags = {
      data: tagData,
      others: {
        createdBy: createdBy,
        createdTime: createdTime,
        editedBy: this.accountService.getUserId(),
        editedTime: Date.now(),
      }
    }

    this.tagService.addNewTag(newTag, this.isEditingTag);
    this.addNewTag = false;
    this.openAddTag = false;
  }

  onTagEditClick() {
    this.confirmationModelService.showModel({
      heading: 'Edit tag?',
      message: 'You are trying to edit a tag, it will effect all entry made in past, once edited, cannot be undone, are you sure?',
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
        if (this.selectedTag) {
          this.isEditingTag = true;
          this.addNewTag = true;

          this.tagForm = new FormGroup({
            name: new FormControl(this.selectedTag?.data.name, [Validators.required]),
            colorCode: new FormControl(this.selectedTag?.data.colorCode || '000000'),
            extraNote: new FormControl(this.selectedTag?.data.extraNote || '')
          });
          this.selectedColor = '#' + this.selectedTag.data.colorCode || "000000";
        } else
          this.notificationService.somethingWentWrong('121');
      } else
        this.confirmationModelService.hideModel();
    });
  }

  onTagDelete() {
    this.confirmationModelService.showModel({
      heading: 'Delete tag?',
      message: 'You are trying to delete a tag, it will effect all entry made in past, once deleted, cannot be retrived, are you sure?',
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
        if (this.selectedTag)
          this.tagService.deleteTag(this.selectedTag);
        else
          this.notificationService.somethingWentWrong('124');
      } else
        this.confirmationModelService.hideModel();
    });
  }
}
