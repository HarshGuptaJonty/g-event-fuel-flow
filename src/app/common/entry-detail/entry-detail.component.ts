import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { EntryDetailModelService } from '../../services/entry-detail-model.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ProductQuantity } from '../../../assets/models/Product';
import { UserData } from '../../../assets/models/EntryTransaction';

@Component({
  selector: 'app-entry-detail',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './entry-detail.component.html',
  styleUrl: './entry-detail.component.scss'
})
export class EntryDetailComponent implements OnInit {

  @ViewChild('plainText', { static: true }) plainText!: TemplateRef<any>;
  @ViewChild('amountText', { static: true }) amountText!: TemplateRef<any>;
  @ViewChild('linkText', { static: true }) linkText!: TemplateRef<any>;

  tableStructure = [
    {
      key: 'productName',
      label: 'Product',
      customClass: 'witdh-limit-200',
      dataType: 'linkText'
    }, {
      key: 'sentUnits',
      label: 'Sent',
      customClass: 'text-right',
      dataType: 'plainText'
    }, {
      key: 'recievedUnits',
      label: 'Recieved',
      customClass: 'text-right',
      dataType: 'plainText'
    }, {
      key: 'pendingUnits',
      label: 'Pending',
      customClass: 'text-right',
      dataType: 'plainText'
    }, {
      key: 'rate',
      label: 'Rate/Unit',
      customClass: 'text-right',
      dataType: 'amountText'
    }, {
      key: 'paymentAmt',
      label: 'Payment',
      customClass: 'text-right',
      dataType: 'amountText'
    }, {
      key: 'totalAmt',
      label: 'Total',
      customClass: 'text-right',
      dataType: 'amountText'
    }
  ]

  dataSource = new MatTableDataSource<any>([]);

  constructor(
    public entryDetailModelService: EntryDetailModelService,
    private router: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.entryDetailModelService.entryData$.subscribe((value) => {
      if (value?.productDetail) {
        const tableData = value.productDetail
        const processedData: any[] = [];

        tableData.forEach((element: ProductQuantity) => {
          processedData.push({
            productName: element.productData.name,
            sentUnits: element.sentUnits,
            recievedUnits: element.recievedUnits,
            pendingUnits: (element.sentUnits || 0) - (element.recievedUnits || 0),
            rate: element.productData.rate,
            totalAmt: (element.sentUnits || 0) * (element.productData.rate || 0),
            paymentAmt: element.paymentAmt || 0,
            productId: element.productData.productId
          })
        });

        this.dataSource.data = processedData;
      }
    })
  }

  onClose() {
    this.entryDetailModelService.hideModel();
  }

  openMoveHistory(transactionId: string) {
    this.entryDetailModelService.hideModel();
    this.router.navigate(['/dashboard/move-entries'], { queryParams: { transactionId: transactionId } });
  }

  openDeliveryBoyProfile(userData: UserData) {
    if (userData.userId) {
      this.entryDetailModelService.hideModel();
      this.router.navigate(['/dashboard/delivery'], { queryParams: { userId: userData.userId } });
    } else {
      this.notificationService.somethingWentWrong('111');
    }
  }

  getTemplate(dataType: string) {
    if (dataType === 'amountText') return this.amountText;
    if (dataType === 'linkText') return this.linkText;
    return this.plainText;
  }

  displayedColumns(): string[] {
    return this.tableStructure.map(item => item.key);
  }

  openProduct(productId: any) {
    this.onClose();
    this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId: productId } });
  }

  getValue(obj: any, path: string): any {
    const returnable = obj?.productData?.productReturnable || false;

    if (path === 'productData.pending')
      if (returnable)
        return obj.sentUnits - obj.recievedUnits;
      else
        return '-';

    if (path === 'recievedUnits')
      if (returnable)
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
      else
        return '-';

    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }
}
