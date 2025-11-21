import { CommonModule } from "@angular/common";
import { AfterViewChecked, ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';
import { StatCardData, StatCardListData, StatListWithProduct } from "../../../assets/models/Statistics";
import { NotificationService } from "../../services/notification.service";
import { CustomerDataService } from "../../services/customer-data.service";
import { ProductService } from "../../services/product.service";
import { EntryDataService } from "../../services/entry-data.service";
import { DepositEntry, EntryTransaction, UserData } from "../../../assets/models/EntryTransaction";
import { ProductQuantity } from "../../../assets/models/Product";
import { DeliveryPersonDataService } from "../../services/delivery-person-data.service";
import { Router } from "@angular/router";
import { DepositDataService } from "../../services/depositData.service";
import { EfficiencyTrackerService } from "../../services/efficiencyTracker.service";
import { TagService } from "../../services/tag.service";
import { Tags } from "../../../assets/models/Tags";
import { ExportPenidngReturns } from "../../../assets/models/ExportEntry";
import { ExportService } from "../../services/export.service";
import { devices, WindowResizeService } from "../../services/window-resize.service";
import { ResuableTooltipComponent } from "../../common/resuable-tooltip/resuable-tooltip.component";
import { LoaderService } from "../../services/loader.service";
import { FormsModule } from "@angular/forms";
import { SettingService } from "../../services/setting.service";

@Component({
    selector: 'app-statistics',
    imports: [
        CommonModule,
        AgCharts,
        FormsModule,
        ResuableTooltipComponent
    ],
    templateUrl: './statistics.component.html',
    styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit, AfterViewChecked {

    @ViewChild('cardData', { static: true }) cardData!: TemplateRef<any>;
    @ViewChild('cardDataWithList', { static: true }) cardDataWithList!: TemplateRef<any>;

    public salesInsights: AgChartOptions = {};
    public productInsights: AgChartOptions = {};
    public depositInsights: AgChartOptions = {};
    public deliveryLocationInsights: AgChartOptions = {};
    public tagsUsedInsights: AgChartOptions = {};

    customerData: StatCardData[] = [];
    productData: StatCardData[] = [];
    depositData: StatCardData[] = [];
    transactionData: StatCardData[] = [];
    deliveryData: StatCardData[] = [];
    tagData: StatCardData[] = [];

    rawCustomerData: any;
    rawProductData: any;
    rawDepositData: any;
    rawTransactionData: any;
    rawDeliveryData: any;
    rawTagData: any;

    customerList: any[] = [];
    productList: any[] = [];
    depositList: any[] = [];
    transactionList: any[] = [];

    CARD_DATA = 'cardData';
    CARD_DATA_WITH_LIST = 'cardDataWithList';
    devices!: devices;
    transactionCardHeader = "Transaction Statistics";
    date: Date = new Date(); // To get the current date
    frequencyFilter = {
        level1: {
            options: ['Yearly', 'Monthly', 'Daily'],
            selected: 'Monthly'
        },
        year: {
            options: [2024, 2025, 2026, 2027, 2028, 2029, 2030],
            selected: this.date.getFullYear()
        },
        month: {
            options: [
                { value: 0, label: 'Jan' },
                { value: 1, label: 'Feb' },
                { value: 2, label: 'Mar' },
                { value: 3, label: 'Apr' },
                { value: 4, label: 'May' },
                { value: 5, label: 'Jun' },
                { value: 6, label: 'Jul' },
                { value: 7, label: 'Aug' },
                { value: 8, label: 'Sep' },
                { value: 9, label: 'Oct' },
                { value: 10, label: 'Nov' },
                { value: 11, label: 'Dec' }
            ],
            selected: this.date.getMonth() // Current month (0-based index)
        }
    };
    transactionFilterData: any = {
        yearlySales: [],
        monthlySales: [],
        dailySales: []
    };
    showTransactionChart = true; // To control the visibility of the transaction chart to refresh it
    minDate = { year: this.date.getFullYear(), month: this.date.getMonth() };
    maxDate = { year: this.date.getFullYear(), month: this.date.getMonth() };

    constructor(
        private notificationService: NotificationService,
        private customerService: CustomerDataService,
        private productService: ProductService,
        private depositService: DepositDataService,
        private transactionService: EntryDataService,
        private deliveryPersonDataService: DeliveryPersonDataService,
        private router: Router,
        private efficiencyTrackerService: EfficiencyTrackerService,
        private tagService: TagService,
        private windowResizeService: WindowResizeService,
        private loaderService: LoaderService,
        private exportService: ExportService,
        private settingService: SettingService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loaderService.showWithLoadingText('Loading Statistics...', true, 2000);
        this.windowResizeService.checkForWindowSize().subscribe((devicesObj: any) => this.devices = devicesObj);
        this.refreshData();

        this.transactionService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawTransactionData = this.transactionService.getTransactionList();
                this.loadTransactionData();
            }
        });

        this.customerService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawCustomerData = this.customerService.getCustomerData();
                this.loadCustomerData();
            }
        });

        this.productService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawProductData = this.productService.getProductList() || {};
                this.loadProductData();
            }
        });

        this.depositService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawDepositData = this.depositService.getDepositObjectList() || {};
                this.loadDepositData();
            }
        });

        this.deliveryPersonDataService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
                this.loadDeliveryData();
            }
        });

        this.tagService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawTagData = this.tagService.getTagObject();
                this.loadTagData();
            }
        });
    }

    ngAfterViewChecked(): void {
        this.efficiencyTrackerService.stopTracking('statistics');
    }

    refreshData(showNotification = false) {
        if (this.transactionService.hasTransactionData()) {
            this.rawTransactionData = this.transactionService.getTransactionList();
            this.loadTransactionData();
        }

        if (this.customerService.hasCustomerData()) {
            this.rawCustomerData = this.customerService.getCustomerData()?.customerList || {};
            this.loadCustomerData();
        }

        if (this.productService.hasProductData()) {
            this.rawProductData = this.productService.getProductList();
            this.loadProductData();
        }

        if (this.depositService.hasDepositData()) {
            this.rawDepositData = this.depositService.getDepositObjectList();
            this.loadDepositData();
        }

        if (this.deliveryPersonDataService.hasDeliveryPersonData()) {
            this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
            this.loadDeliveryData();
        }

        if (this.tagService.hasTagData()) {
            this.rawTagData = this.tagService.getTagObject();
            this.loadTagData();
        }

        if (showNotification)
            if (this.customerData.length + this.productData.length + this.transactionData.length + this.deliveryData.length === 0)
                this.notificationService.showNotification({
                    heading: 'No data found!',
                    message: 'Please create some data for statistics.',
                    duration: 5000,
                    leftBarColor: this.notificationService.color.red
                });
            else
                this.notificationService.statisticsRefreshed();
    }

    loadCustomerData() {
        this.customerData = [];
        this.customerList = Object.values(this.rawCustomerData);

        this.customerData.push({
            dataType: this.CARD_DATA,
            title: 'Total Customers',
            customClass: 'h-100',
            value: this.customerList.length
        });

        const now = new Date();
        const currentMonth = now.getMonth(); // Current month (0-based index)
        const currentYear = now.getFullYear();

        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // Handle January (0) case
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let currentMonthCount = 0;
        let lastMonthCount = 0;

        this.customerList.forEach((customer: any) => {
            if (customer.others?.createdTime) {
                const createdDate = new Date(customer.others.createdTime);
                const createdMonth = createdDate.getMonth();
                const createdYear = createdDate.getFullYear();

                if (createdMonth === currentMonth && createdYear === currentYear) currentMonthCount++;
                else if (createdMonth === lastMonth && createdYear === lastMonthYear) lastMonthCount++;
            }
        });

        this.customerData.push({
            dataType: this.CARD_DATA,
            title: 'New Customers',
            customClass: 'h-100',
            value: currentMonthCount,
            percentValue: lastMonthCount === 0 ? 100 : parseFloat(Math.min((((currentMonthCount - lastMonthCount) / lastMonthCount) * 100), 100).toFixed(2))
        });

        this.customerData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Pending Returns',
            canExpand: true,
            isExpanded: false,
            collapseCount: 5
        }); //complete when transactions is loaded

        this.customerData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Top Customers (Sale)'
        }); //complete when transactions is loaded

        if (this.transactionList.length > 0) this.computeCustomerWithTransactionData();
    }

    loadProductData() {
        this.productData = [];
        this.productList = Object.values(this.rawProductData);

        this.productData.push({
            dataType: this.CARD_DATA,
            title: 'Total Units Sold',
            customClass: 'h-100 item-l1'
        }); // complete when transactions is loaded

        this.productData.push({
            dataType: this.CARD_DATA,
            title: 'Average Monthly Sales',
            customClass: 'item-l2'
        }); // complete when transactions is loaded

        this.productData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Monthly Demand',
            customClass: 'item-r1'
        }); // complete when transactions is loaded

        this.computeProductWithTransactionData();
    }

    loadDepositData() {
        this.depositData = [];
        this.depositList = Object.values(this.rawDepositData);

        this.depositData.push({
            dataType: this.CARD_DATA,
            title: 'Total Deposits',
            customClass: 'item-l1 h-100'
        });

        this.depositData.push({
            dataType: this.CARD_DATA,
            title: 'New Deposits',
            customClass: 'item-l2 h-100'
        });

        this.depositData.push({
            dataType: this.CARD_DATA,
            title: 'Total Deposit Amount',
            customClass: 'item-l3 h-100'
        });

        this.depositData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Customers List',
            customClass: 'item-r1',
            canExpand: true,
        });

        // product Data Chart
        const productData: any = {};

        // total deposit Units
        let totalDepositUnits = 0;

        //new deposits as compared to last month
        const monthlySales: any = {};

        //total deposit amount
        let totalDepositAmount = 0;

        //customer list
        const depositCustomerList: any = {};

        this.depositList.forEach((customerObject: any) => {
            const customerDepositList = Object.values(customerObject) as DepositEntry[];

            customerDepositList.forEach((deposit: DepositEntry) => {
                let netCount = 0;

                //new deposits as compared to last month
                const date = deposit.data.date || '01/01/1970'; // Default date if not available
                const [, month, year] = date.split('/').map(Number);
                const monthKey = `${year}${String(month).padStart(2, '0')}`; // Format: "MM/YYYY"

                //customer list
                if (!depositCustomerList[deposit.data.customer.userId])
                    depositCustomerList[deposit.data.customer.userId] = { title: deposit.data.customer.fullName, value: 0, link: `/dashboard/customers?userId=${deposit.data.customer.userId}`, productList: {} };

                deposit.data.selectedProducts?.forEach((product: ProductQuantity) => {
                    const productId = product.productData.productId;

                    // total deposit Units
                    netCount += (product.sentUnits || 0) - (product.recievedUnits || 0);

                    //customer list
                    if (!depositCustomerList[deposit.data.customer.userId].productList[product.productData.productId])
                        depositCustomerList[deposit.data.customer.userId].productList[product.productData.productId] = { name: product.productData.name, value: 0, id: product.productData.productId };
                    depositCustomerList[deposit.data.customer.userId].productList[product.productData.productId].value += netCount;

                    // Sales Data Chart
                    if (!productData[productId]) productData[productId] = { name: product.productData.name, sale: 0 };
                    productData[productId].sale += netCount;

                    //monthly sales data
                    if (!monthlySales[monthKey])
                        monthlySales[monthKey] = { total: 0 };
                    // if (!monthlySales[monthKey][productId])
                    //     monthlySales[monthKey][productId] = 0
                    // monthlySales[monthKey][productId] += product.sentUnits;
                    monthlySales[monthKey].total += product.sentUnits;
                });

                // total deposit Units
                totalDepositUnits += netCount;

                //customer list
                depositCustomerList[deposit.data.customer.userId].value += netCount;

                // Calculate monthly demand (percentage change)
                const now = new Date();
                const currentMonthKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`; // Current month
                const lastMonthKey = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`; // Last month

                const currentMonthSales = monthlySales[currentMonthKey]?.total || 0;
                const lastMonthSales = monthlySales[lastMonthKey]?.total || 0;

                let percentChange = 0;
                if (lastMonthSales > 0)
                    percentChange = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;
                else if (currentMonthSales > 0)
                    percentChange = 100; // If no sales last month, treat as 100% increase
                this.depositData[1].value = currentMonthSales; // Round to nearest integer
                this.depositData[1].percentValue = Math.round(percentChange); // Round to nearest integer

                //total deposit amount
                totalDepositAmount += (deposit.data.paymentAmt || 0) - (deposit.data.returnAmt || 0);
            });
        });

        // product Data Chart
        this.depositInsights = {
            data: Object.values(productData).filter((obj: any) => obj.sale > 0),
            series: [{ type: 'bar', xKey: 'name', yKey: 'sale', cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 } }],
            axes: [
                {
                    type: 'category',
                    position: 'bottom', // X-axis
                },
                {
                    type: 'number',
                    position: 'left', // Y-axis
                    label: {
                        enabled: false, // Hides the labels on the Y-axis
                    },
                }
            ]
        };

        // total deposit Units
        this.depositData[0].value = totalDepositUnits;

        //total deposit amount
        this.depositData[2].value = this.formatCurrency(totalDepositAmount) + ' Rs.';

        //customer list
        const depositCustomerListArray = Object.values(depositCustomerList).sort((a: any, b: any) => b.value - a.value).slice(0, 8);
        depositCustomerListArray.forEach((obj: any, index) => {
            if (obj.productList && typeof obj.productList === 'object')
                obj.productList = Object.values(obj.productList);
            obj.index = index;
        });
        this.depositData[3].listData = depositCustomerListArray as StatListWithProduct[];
    }

    loadTransactionData() {
        this.transactionData = [];
        this.transactionList = Object.values(this.rawTransactionData);

        this.transactionData.push({
            dataType: this.CARD_DATA,
            title: 'Total Transactions',
            value: this.formatCurrency(this.transactionList.length),
            customClass: 'item-l1'
        });

        this.transactionData.push({
            dataType: this.CARD_DATA,
            title: 'Pending Payment',
            customClass: 'item-l2'
        }); // complete when transactions is loaded

        this.transactionData.push({
            dataType: this.CARD_DATA,
            title: 'Total Revenue',
            customClass: 'item-l3 h-100'
        }); // complete when transactions is loaded

        this.transactionData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Top Customers (Rs.)',
            customClass: 'item-r1'
        }); // complete when transactions is loaded

        //monthly sales
        const yearlySales: any = {};
        const monthlySales: any = {};
        const dailySales: any = {};

        //pending payments
        const pendingPayments: any = {};

        //totalRevenue
        let totalRevenue = 0;

        //top customers
        const topCustomers: any = {};

        this.transactionList.forEach((transaction: EntryTransaction) => {
            const date = transaction.data.date || '01/01/1970'; // Default date if not available
            const [day, month, year] = date.split('/').map(Number);

            this.minDate.year = Math.min(this.minDate.year, year);
            this.minDate.month = Math.min(this.minDate.month, month - 1);

            const yearKey = `${year}`; // Format: "YYYY"
            const monthKey = `${yearKey}${String(month).padStart(2, '0')}`; // Format: "YYYYMM"
            const dayKey = `${monthKey}${String(day).padStart(2, '0')}`; // Format: "YYYYMMDD"

            const monthName = new Date(year, month - 1, day).toLocaleString('en-US', { month: 'long' });

            const customer = transaction.data.customer;
            const payment = parseInt(transaction.data.payment + '');

            //yearly sales
            if (!yearlySales[yearKey])
                yearlySales[yearKey] = { xKey: yearKey, sale: 0, product: {} };

            //monthly sales
            if (!monthlySales[monthKey])
                monthlySales[monthKey] = { xKey: monthName, sale: 0, date: { year: year }, product: {} };

            //daily sales
            if (!dailySales[dayKey])
                dailySales[dayKey] = { xKey: `${day}`, sale: 0, date: { year: year, month: month }, product: {} };

            for (const product of transaction.data.selectedProducts || []) {
                //yearly sales
                if (!yearlySales[yearKey].product[product.productData.name])
                    yearlySales[yearKey].product[product.productData.name] = 0;
                yearlySales[yearKey].product[product.productData.name] += product.sentUnits;

                //monthly sales
                if (!monthlySales[monthKey].product[product.productData.name])
                    monthlySales[monthKey].product[product.productData.name] = 0;
                monthlySales[monthKey].product[product.productData.name] += product.sentUnits;

                //daily sales
                if (!dailySales[dayKey].product[product.productData.name])
                    dailySales[dayKey].product[product.productData.name] = 0;
                dailySales[dayKey].product[product.productData.name] += product.sentUnits;

                //yearly sales
                yearlySales[yearKey].sale += product.sentUnits;
                //monthly sales
                monthlySales[monthKey].sale += product.sentUnits;
                //daily sales
                dailySales[dayKey].sale += product.sentUnits;
            }

            //pending payments
            if (customer) {
                if (!pendingPayments[customer.userId])
                    pendingPayments[customer.userId] = { title: customer.fullName, value: 0, link: `/dashboard/customers?userId=${customer.userId}` };
                pendingPayments[customer.userId].value += (transaction.data.total || 0) - payment;

                if (!topCustomers[customer.userId])
                    topCustomers[customer.userId] = { title: customer.fullName, value: 0, link: `/dashboard/customers?userId=${customer.userId}` };
                topCustomers[customer.userId].value += payment;
            }

            totalRevenue += payment;
        });

        this.transactionFilterData = {
            yearlySales: Object.values(yearlySales),
            monthlySales: Object.values(monthlySales),
            dailySales: Object.values(dailySales)
        };

        //monthly sales
        this.salesInsights = {
            data: Object.values(monthlySales),
            series: [{
                type: 'bar', xKey: 'xKey', yKey: 'sale', cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 },
                tooltip: {
                    renderer: (params) => {
                        // params object contains all the information about the hovered bar
                        const datum = params.datum; // The data object for the specific bar
                        let frequency = datum[params.xKey]; // Value from the 'xKey' field (e.g., 'Jan')
                        const total = datum[params.yKey]; // Value from the 'yKey' field (e.g., 150)
                        const products = datum.product;
                        const productsData = Object.entries(products).map(([name, value]) => ({ label: name, value: value }));

                        if (frequency.length <= 2) {
                            const num = parseInt(frequency);
                            frequency = `${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Day`;
                        }

                        return {
                            title: 'Sales Details',
                            heading: `Sales in ${frequency}`,
                            backgroundColor: '#333',
                            color: '#fff',
                            data: [
                                ...productsData,
                                { label: 'Total', value: total },
                            ]
                        };
                    }
                }
            }],
            axes: [
                {
                    type: 'category',
                    position: 'bottom', // X-axis
                },
                {
                    type: 'number',
                    position: 'left', // Y-axis
                    label: {
                        enabled: false, // Hides the labels on the Y-axis
                    },
                }
            ]
        };

        //pending payments
        const pendingPaymentsList = Object.values(pendingPayments);
        const pendingAmt = pendingPaymentsList.reduce((acc: number, curr: any) => acc + curr.value, 0);
        this.transactionData[1].value = this.formatCurrency(pendingAmt) + ' Rs.';

        //totalRevenue
        this.transactionData[2].value = this.formatCurrency(totalRevenue) + ' Rs.';

        //top customers
        const topCustomersList = Object.values(topCustomers);
        topCustomersList.map((obj: any) => obj.value = this.formatCurrency(obj.value));
        this.transactionData[3].listData = Object.values(topCustomers).sort((a: any, b: any) => b.value - a.value).slice(0, 8) as StatCardListData[];

        this.computeCustomerWithTransactionData();
        this.computeDeliveryWithTransactionData();
        this.computeTagsWithTransactionData();
    }

    loadDeliveryData() {
        this.deliveryData = [];
        const deliveryPersonList = Object.values(this.rawDeliveryData);

        this.deliveryData.push({
            dataType: this.CARD_DATA,
            title: 'Deliveries Completed',
            customClass: 'h-100'
        }); // transactions with products

        this.deliveryData.push({
            dataType: this.CARD_DATA,
            title: 'Delivery Persons',
            customClass: 'noWrap h-100',
            value: deliveryPersonList.length || 0
        });

        this.deliveryData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Deliveries/Month',
            value: 0
        }); // complete when transactions is loaded

        this.deliveryData.push({
            dataType: this.CARD_DATA_WITH_LIST,
            title: 'Top Delivery Persons',
        }); // complete when transactions is loaded

        if (this.transactionList.length > 0) this.computeDeliveryWithTransactionData();
    }

    loadTagData() {
        this.tagData = [];
        const tagList = Object.values(this.rawTagData);

        this.tagData.push({
            dataType: this.CARD_DATA,
            title: 'No. Of Tags',
            value: tagList.length,
            customClass: 'h-100'
        });

        this.tagData.push({
            dataType: this.CARD_DATA,
            title: 'Total Tags Used',
            customClass: 'h-100'
        }); // complete when transactions is loaded

        if (this.transactionList.length > 0 && tagList.length > 0) this.computeTagsWithTransactionData();
    }

    computeCustomerWithTransactionData() {
        // Pending returns (list of top 5 customers)
        if (this.customerData.length === 0) return

        const pendingReturns: any = {};
        let totalPendingSum = 0;
        const exportPendingDataCalc: any = {};

        //Top Customers (list of most purchased products)
        const topCustomersByUnits: any = {};

        this.transactionList.forEach((transaction: EntryTransaction) => {
            const customer = transaction.data.customer;
            if (customer) {
                // Pending returns (list of top 5 customers)
                if (!pendingReturns[customer.userId])
                    pendingReturns[customer.userId] = { title: customer.fullName, value: 0, link: `/dashboard/customers?userId=${customer.userId}`, productList: {} }

                // Export Pending Data
                if (!exportPendingDataCalc[customer.userId])
                    exportPendingDataCalc[customer.userId] = { customerName: customer.fullName, pendingProducts: {}, totalPending: 0 } as ExportPenidngReturns;

                //Top Customers (list of most purchased products)
                if (!topCustomersByUnits[customer.userId])
                    topCustomersByUnits[customer.userId] = { title: customer.fullName, value: 0, link: `/dashboard/customers?userId=${customer.userId}`, productList: {} };

                // Pending returns
                let pendingSum = 0;

                transaction.data.selectedProducts?.forEach((product: ProductQuantity) => {
                    if (product.productData.productReturnable) {
                        const pending = product.sentUnits - product.recievedUnits;
                        pendingSum += pending;

                        if (!pendingReturns[customer.userId].productList[product.productData.productId])
                            pendingReturns[customer.userId].productList[product.productData.productId] = { name: product.productData.name, value: 0, id: product.productData.productId };
                        pendingReturns[customer.userId].productList[product.productData.productId].value += pending;

                        // Export Pending Data
                        if (!exportPendingDataCalc[customer.userId].pendingProducts[product.productData.productId])
                            exportPendingDataCalc[customer.userId].pendingProducts[product.productData.productId] = { name: product.productData.name, pending: 0 };
                        exportPendingDataCalc[customer.userId].pendingProducts[product.productData.productId].pending += pending;

                        //Top Customers (list of most purchased products)
                        topCustomersByUnits[customer.userId].value += product.sentUnits;
                        if (!topCustomersByUnits[customer.userId].productList[product.productData.productId])
                            topCustomersByUnits[customer.userId].productList[product.productData.productId] = { name: product.productData.name, value: 0, id: product.productData.productId };
                        topCustomersByUnits[customer.userId].productList[product.productData.productId].value += product.sentUnits;
                    }
                });
                // totalPendingSum += pendingSum; // this is also add the negative return values
                pendingReturns[customer.userId].value += pendingSum;

                exportPendingDataCalc[customer.userId].totalPending += pendingSum;
            }
        });

        // Export Pending Data
        const pendingDataForExport: ExportPenidngReturns[] = [];
        Object.values(exportPendingDataCalc).forEach((data: any) => {
            if (this.settingService.setting.showNegativePendingReturns === 'yes' ? data.totalPending != 0 : data.totalPending > 0) {
                data.pendingProducts = Object.values(data.pendingProducts);
                pendingDataForExport.push(data);
            }
        });
        pendingDataForExport.sort((a: ExportPenidngReturns, b: ExportPenidngReturns) => b.totalPending - a.totalPending);

        const pendingList = Object.values(pendingReturns).filter((obj: any) => this.settingService.setting.showNegativePendingReturns === 'yes' ? obj.value != 0 : obj.value > 0).sort((a: any, b: any) => b.value - a.value);
        pendingList.forEach((obj: any, index) => {
            if (obj.productList && typeof obj.productList === 'object')
                obj.productList = Object.values(obj.productList);
            obj.index = index;
        });

        totalPendingSum = pendingList.reduce((sum: number, obj: any) => sum + obj.value, 0);
        // Pending returns (list of top 5 customers)
        this.customerData[2].value = totalPendingSum;
        this.customerData[2].listData = pendingList as StatListWithProduct[];
        this.customerData[2].canExpand = pendingList.length > 5;

        // Export Pending Data
        this.customerData[2].canExport = pendingDataForExport.length > 0;
        this.customerData[2].exportData = pendingDataForExport;

        //Top Customers (list of most purchased products)
        const top5CustomersByUnits = Object.values(topCustomersByUnits).sort((a: any, b: any) => b.value - a.value).slice(0, 6);
        top5CustomersByUnits.forEach((obj: any, index) => {
            if (obj.productList && typeof obj.productList === 'object')
                obj.productList = Object.values(obj.productList);
            obj.index = index;
        });
        this.customerData[3].listData = top5CustomersByUnits as StatListWithProduct[];
    }

    computeProductWithTransactionData() {
        // Sales Data Chart
        const saleData: any = {};

        // Total units sold
        let totalUnitsSold = 0;

        //monthly sales data
        const monthlySales: any = {};

        //monthly demand list
        const monthlyDemand: any = {};

        this.transactionList.forEach((transaction: EntryTransaction) => {
            const date = transaction.data.date || '01/01/1970'; // Default date if not available
            const [, month, year] = date.split('/').map(Number);
            const monthKey = `${year}${String(month).padStart(2, '0')}`; // Format: "MM/YYYY"

            transaction.data.selectedProducts?.forEach((product: ProductQuantity) => {
                const productId = product.productData.productId;

                // Sales Data Chart
                if (!saleData[productId]) saleData[productId] = { name: product.productData.name, sale: 0 };
                saleData[productId].sale += product.sentUnits;

                // Total units sold
                totalUnitsSold += product.sentUnits;

                //monthly sales data
                if (!monthlySales[monthKey])
                    monthlySales[monthKey] = { total: 0 };
                if (!monthlySales[monthKey][productId])
                    monthlySales[monthKey][productId] = 0
                monthlySales[monthKey][productId] += product.sentUnits;
                monthlySales[monthKey].total += product.sentUnits;

                //monthly demand list
                if (!monthlyDemand[productId])
                    monthlyDemand[productId] = { title: product.productData.name, percentValue: 0, link: `/dashboard/warehouse?productId=${productId}` };
            });
        });

        this.productInsights = {
            data: Object.values(saleData),
            series: [{ type: 'bar', xKey: 'name', yKey: 'sale', cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 } }],
            axes: [
                {
                    type: 'category',
                    position: 'bottom', // X-axis
                },
                {
                    type: 'number',
                    position: 'left', // Y-axis
                    label: {
                        enabled: false, // Hides the labels on the Y-axis
                    },
                }
            ]
        };

        this.productData[0].value = this.formatCurrency(totalUnitsSold);
        this.productData[1].value = ((totalUnitsSold / Object.keys(monthlySales).length) || 0).toFixed(2) + ' Units';

        // Calculate monthly demand (percentage change)
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`; // Current month
        const lastMonthKey = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, '0')}`; // Last month

        Object.keys(monthlyDemand).forEach(productId => {
            const currentMonthSales = monthlySales[currentMonthKey]?.[productId] || 0;
            const lastMonthSales = monthlySales[lastMonthKey]?.[productId] || 0;

            let percentChange = 0;
            if (lastMonthSales > 0)
                percentChange = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;
            else if (currentMonthSales > 0)
                percentChange = 100; // If no sales last month, treat as 100% increase

            monthlyDemand[productId].percentValue = Math.round(percentChange); // Round to nearest integer
        });

        this.productData[2].listData = Object.values(monthlyDemand) as StatCardListData[];
    }

    computeDeliveryWithTransactionData() {
        if (this.deliveryData.length === 0) return

        // Location Data Chart
        const locationData: any = {}

        // Deliveries completed
        let totalDeliveries = 0;

        //Deliveries last month
        const montlyDelivery: any = {};

        //Top delivery persons
        const topDeliveryPersons: any = {};

        this.transactionList.forEach((transaction: EntryTransaction) => {
            const date = transaction.data.date || '01/01/1970'; // Default date if not available
            const [day, month, year] = date.split('/').map(Number);
            const monthKey = `${year}${String(month).padStart(2, '0')}`; // Format: "YYYYMM"
            const monthName = new Date(year, month - 1, day).toLocaleString('en-US', { month: 'long' });

            const deliveryPersonList = transaction.data.deliveryBoyList;
            if (deliveryPersonList) {
                // Location Data Chart
                if (transaction.data.shippingAddress) {
                    if (!locationData[transaction.data.shippingAddress])
                        locationData[transaction.data.shippingAddress] = { location: transaction.data.shippingAddress, delivery: 0 };
                    ++locationData[transaction.data.shippingAddress].delivery;
                }

                // Deliveries completed
                totalDeliveries++;

                //Deliveries last month
                if (!montlyDelivery[monthKey])
                    montlyDelivery[monthKey] = { title: monthName, value: 0, monthKey: monthKey, productList: {} };
                montlyDelivery[monthKey].value += 1;

                transaction.data.selectedProducts?.forEach((product: ProductQuantity) => {
                    if (product.productData.productReturnable) {
                        if (!montlyDelivery[monthKey].productList[product.productData.productId])
                            montlyDelivery[monthKey].productList[product.productData.productId] = { name: product.productData.name, value: 0, id: product.productData.productId };
                        montlyDelivery[monthKey].productList[product.productData.productId].value += 1;
                    }
                });

                //Top delivery persons
                deliveryPersonList.forEach((deliveryBoy: UserData) => {
                    if (!topDeliveryPersons[deliveryBoy.userId])
                        topDeliveryPersons[deliveryBoy.userId] = { title: deliveryBoy.fullName, value: 0, link: `/dashboard/delivery?userId=${deliveryBoy.userId}` };
                    topDeliveryPersons[deliveryBoy.userId].value += 1;
                })
            }
        });

        // Location Data Chart
        this.deliveryLocationInsights = {
            data: Object.values(locationData).sort((a: any, b: any) => b.delivery - a.delivery).slice(0, 10).reverse(),
            series: [{ type: 'bar', xKey: 'location', yKey: 'delivery', cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 } }],
            axes: [
                {
                    type: 'category',
                    position: 'bottom', // X-axis
                },
                {
                    type: 'number',
                    position: 'left', // Y-axis
                    label: {
                        enabled: false, // Hides the labels on the Y-axis
                    },
                }
            ]
        }

        // Deliveries completed
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // Handle January (0)
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastMonthKey = `${lastMonthYear}${String(lastMonth).padStart(2, '0')}`;
        this.deliveryData[0].value = this.formatCurrency(totalDeliveries);
        this.deliveryData[0].percentValue = montlyDelivery[lastMonthKey] ? Math.round(((montlyDelivery[currentMonthKey]?.value || 0) - montlyDelivery[lastMonthKey].value) / montlyDelivery[lastMonthKey].value * 100) : 100;

        // Object.entries(montlyDelivery).forEach(([currentKey, object]: [string, any]) => {
        //     const year = parseInt(currentKey.slice(0, 4), 10);
        //     const month = parseInt(currentKey.slice(4, 6), 10);
        //     const lastMonthKey = month === 1 ? `${year - 1}12` : `${year}${String(month - 1).padStart(2, '0')}`;

        //     if(lastMonthKey in montlyDelivery) {
        //         const currentValue = object.value || 0;
        //         const lastValue = montlyDelivery[lastMonthKey]?.value || 0;
        //         if (currentValue > lastValue) {
        //             montlyDelivery[currentKey].trend = '🟢';
        //         } else if (currentValue < lastValue) {
        //             montlyDelivery[currentKey].trend = '🔴';
        //         } else {
        //             montlyDelivery[currentKey].trend = '⚪';
        //         }
        //     }
        // });

        //Deliveries last month
        const montlyDeliveryArray = Object.values(montlyDelivery).sort((a: any, b: any) => b.monthKey - a.monthKey).slice(0, 7) as StatListWithProduct[];
        montlyDeliveryArray.forEach((obj: any, index) => {
            if (obj.productList && typeof obj.productList === 'object')
                obj.productList = Object.values(obj.productList);
            obj.index = index;
        });
        this.deliveryData[2].listData = montlyDeliveryArray;

        //Top delivery persons
        this.deliveryData[3].listData = Object.values(topDeliveryPersons).sort((a: any, b: any) => b.value - a.value).slice(0, 7) as StatCardListData[];
    }

    computeTagsWithTransactionData() {
        if (this.tagData.length === 0) return;

        // Tag Data Chart
        const tagChartData: any = {};

        // Total Tags used
        let totalTagsUsed = 0;

        this.transactionList.filter((transition: EntryTransaction) => transition.data.tags && transition.data.tags.length > 0).forEach((transition: EntryTransaction) => {
            const tagIdList = transition.data.tags || [];
            tagIdList.forEach((tagId: string) => {
                const tagObj = this.rawTagData?.[tagId] as Tags;
                if (tagObj) {
                    if (!tagChartData[tagId])
                        tagChartData[tagId] = { name: tagObj.data.name, value: 0 };
                    ++tagChartData[tagId].value;
                }
            });
            totalTagsUsed += tagIdList.length;
        });

        // Tag Data Chart
        this.tagsUsedInsights = {
            data: Object.values(tagChartData), //.sort((a: any, b: any) => b.delivery - a.delivery).slice(0, 10).reverse()
            series: [{ type: 'bar', xKey: 'name', yKey: 'value', cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 } }],
            axes: [
                {
                    type: 'category',
                    position: 'bottom', // X-axis
                },
                {
                    type: 'number',
                    position: 'left', // Y-axis
                    label: {
                        enabled: false, // Hides the labels on the Y-axis
                    },
                }
            ]
        }

        // Total Tags used
        this.tagData[1].value = totalTagsUsed;
    }

    exportData(title: string, exportData: ExportPenidngReturns[]) {
        if (title === 'Pending Returns')
            this.exportService.exportPendingReturn(exportData);
    }

    getTemplate(dataType: string) {
        if (dataType === 'cardData') return this.cardData;
        if (dataType === 'cardDataWithList') return this.cardDataWithList;
        return null;
    }

    formatCurrency(value: number): string {
        if (!value) return '--';

        return new Intl.NumberFormat('en-IN', {
            maximumFractionDigits: 2 // Optional: To include up to 2 decimal places
        }).format(value);
    }

    openLink(link: string) {
        if (!link) return;
        this.router.navigateByUrl(link);
    }

    openProductLink(productId: string) {
        this.router.navigate(['/dashboard/warehouse'], { queryParams: { productId } });
    }

    onFrequencyChange() {
        this.showTransactionChart = false; // Reset the chart visibility when frequency changes
        if (this.frequencyFilter.level1.selected === 'Yearly')
            this.salesInsights.data = this.transactionFilterData.yearlySales;
        else if (this.frequencyFilter.level1.selected === 'Monthly') {
            const visibleData = this.transactionFilterData.monthlySales.filter((data: any) =>
                data.date.year === this.frequencyFilter.year.selected
            );
            this.salesInsights.data = visibleData;
        } else {
            const visibleData = this.transactionFilterData.dailySales.filter((data: any) =>
                data.date.year === this.frequencyFilter.year.selected && (data.date.month - 1) == this.frequencyFilter.month.selected
            );
            this.salesInsights.data = visibleData;
        }
        this.transactionCardHeader = this.getTransactionCardHeader();
        this.cdr.detectChanges();
        this.showTransactionChart = true; // Show the chart after updating the data
    }

    getTransactionCardHeader(): string {
        if (this.frequencyFilter.level1.selected === 'Yearly')
            return 'Yearly Sales Statistics';
        if (this.frequencyFilter.level1.selected === 'Monthly')
            return `Monthly Sales in ${this.frequencyFilter.year.selected}`;
        return `${this.frequencyFilter.level1.selected} Sales in ${this.frequencyFilter.year.selected} for ${this.getFullMonthName(this.frequencyFilter.month.selected)}`;
    }

    getFullMonthName(month: number): string {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (month < 0 || month > 11) return '';
        return monthNames[month];
    }
}