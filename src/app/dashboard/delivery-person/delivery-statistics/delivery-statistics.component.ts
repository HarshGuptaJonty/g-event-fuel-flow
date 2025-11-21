import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';
import { EntryDataService } from '../../../services/entry-data.service';
import { DeliveryPersonDataService } from '../../../services/delivery-person-data.service';
import { ProductService } from '../../../services/product.service';
import { DeliveryData, DeliveryDone, EntryTransaction } from '../../../../assets/models/EntryTransaction';

@Component({
    selector: 'app-delivery-statistics',
    imports: [
        CommonModule,
        AgCharts,
        FormsModule
    ],
    templateUrl: './delivery-statistics.component.html',
    styleUrl: './delivery-statistics.component.scss'
})
export class DeliveryStatisticsComponent implements OnInit {

    private date: Date = new Date(); // To get the current date
    frequencyFilter = {
        deliveryPerson: {
            options: [] as { value: string, label: string }[],
            selected: ''
        },
        product: {
            options: [] as { value: string, label: string }[],
            selected: 'total'
        },
        level1: {
            options: ['All Time', 'Yearly', 'Monthly', 'Daily'],
            selected: 'All Time'
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
    minDate = { year: this.date.getFullYear(), month: this.date.getMonth() };
    maxDate = { year: this.date.getFullYear(), month: this.date.getMonth() };
    axes = [
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
    ];
    tooltip = {
        renderer: (params: any) => {
            // params object contains all the information about the hovered bar
            const datum = params.datum; // The data object for the specific bar
            let frequency = String(datum[params.xKey]); // Value from the 'xKey' field (e.g., 'Jan')
            const total = datum[params.yKey]; // Value from the 'yKey' field (e.g., 150)

            if (frequency.length <= 2) {
                const num = parseInt(frequency);
                frequency = `${num}${num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Day`;
            }

            const productsData: any[] = [];
            Object.keys(datum).forEach(key => {
                if (key !== 'name' && key !== 'total' && key !== 'userId')
                    productsData.push({ label: this.rawProductData[key]?.data.name || key, value: datum[key] });
            });

            if (this.frequencyFilter.product.selected === 'total')
                productsData.push({ label: 'Total', value: total });

            return {
                title: 'Delivery Details',
                heading: `Deliveries in ${frequency}`,
                backgroundColor: '#333',
                color: '#fff',
                data: [...productsData]
            };
        }
    }

    showChart = true;
    totalDeliveries = 0;
    displayData: any[] = [];
    public chartData: AgChartOptions = {};

    // all type of data
    private allTimeChartData: any[] = [];
    private yearlyChartData: any[] = [];
    private monthlyChartData: any = {};
    private dailyChartData: any = {};

    private rawTransactionData: any;
    rawProductData: any;
    private rawDeliveryData: any;

    private productList: any[] = [];

    constructor(
        private transactionService: EntryDataService,
        private deliveryPersonDataService: DeliveryPersonDataService,
        private productService: ProductService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.refreshData();

        this.transactionService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawTransactionData = this.transactionService.getTransactionList();
                this.loadTransactionData();
            }
        });

        this.productService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawProductData = this.productService.getProductList() || {};
                this.loadProductData();
            }
        });

        this.deliveryPersonDataService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
                this.loadDeliveryData();
            }
        });
    }

    refreshData() {
        if (this.productService.hasProductData()) {
            this.rawProductData = this.productService.getProductList();
            this.loadProductData();
        }

        if (this.deliveryPersonDataService.hasDeliveryPersonData()) {
            this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
            this.loadDeliveryData();
        }

        if (this.transactionService.hasTransactionData()) {
            this.rawTransactionData = this.transactionService.getTransactionList();
            this.loadTransactionData();
        }
    }

    loadTransactionData() {
        const allTime: any = {};
        const yearly: any = {};
        const monthly: any = {};
        const daily: any = {};

        const transactionList = Object.values(this.rawTransactionData) as EntryTransaction[];
        transactionList.forEach((transaction: EntryTransaction) => {
            const date = transaction.data.date || '01/01/1970'; // Default date if not available
            const [day, month, year] = date.split('/').map(Number);

            this.minDate.year = Math.min(this.minDate.year, year);
            this.minDate.month = Math.min(this.minDate.month, month - 1);

            const yearKey = `${year}`; // Format: "YYYY"
            const monthKey = `${yearKey}${String(month).padStart(2, '0')}`; // Format: "YYYYMM"
            const dayKey = `${monthKey}${String(day).padStart(2, '0')}`; // Format: "YYYYMMDD"

            // const monthName = new Date(year, month - 1, day).toLocaleString('en-US', { month: 'long' });

            const deliveryPersonList = transaction.data.deliveryBoyList || [];
            // const productList = transaction.data.selectedProducts || [];

            if (deliveryPersonList) {
                deliveryPersonList.forEach((deliveryPerson: DeliveryDone) => {
                    if (!allTime[deliveryPerson.userId])
                        allTime[deliveryPerson.userId] = {
                            name: deliveryPerson.fullName,
                            userId: deliveryPerson.userId,
                            total: 0,
                        };

                    if (!yearly[yearKey])
                        yearly[yearKey] = {};
                    if (!yearly[yearKey][deliveryPerson.userId])
                        yearly[yearKey][deliveryPerson.userId] = {
                            name: deliveryPerson.fullName,
                            userId: deliveryPerson.userId,
                            total: 0,
                        };

                    if (!monthly[monthKey])
                        monthly[monthKey] = {};
                    if (!monthly[monthKey][deliveryPerson.userId])
                        monthly[monthKey][deliveryPerson.userId] = {
                            name: deliveryPerson.fullName,
                            userId: deliveryPerson.userId,
                            total: 0,
                        };

                    if (!daily[monthKey])
                        daily[monthKey] = {};
                    if (!daily[monthKey][deliveryPerson.userId])
                        daily[monthKey][deliveryPerson.userId] = {};
                    if (!daily[monthKey][deliveryPerson.userId][dayKey])
                        daily[monthKey][deliveryPerson.userId][dayKey] = {
                            name: day,
                            userId: deliveryPerson.userId,
                            total: 0,
                        };

                    deliveryPerson.deliveryDone?.forEach((product: DeliveryData) => {
                        if (!allTime[deliveryPerson.userId][product.productId])
                            allTime[deliveryPerson.userId][product.productId] = 0;

                        allTime[deliveryPerson.userId].total += product.sentUnits || 0;
                        allTime[deliveryPerson.userId][product.productId] += product.sentUnits || 0;

                        if (!yearly[yearKey][deliveryPerson.userId][product.productId])
                            yearly[yearKey][deliveryPerson.userId][product.productId] = 0;

                        yearly[yearKey][deliveryPerson.userId].total += product.sentUnits || 0;
                        yearly[yearKey][deliveryPerson.userId][product.productId] += product.sentUnits || 0;

                        if (!monthly[monthKey][deliveryPerson.userId][product.productId])
                            monthly[monthKey][deliveryPerson.userId][product.productId] = 0;

                        monthly[monthKey][deliveryPerson.userId].total += product.sentUnits || 0;
                        monthly[monthKey][deliveryPerson.userId][product.productId] += product.sentUnits || 0;

                        if (!daily[monthKey][deliveryPerson.userId][dayKey][product.productId])
                            daily[monthKey][deliveryPerson.userId][dayKey][product.productId] = 0;

                        daily[monthKey][deliveryPerson.userId][dayKey].total += product.sentUnits || 0;
                        daily[monthKey][deliveryPerson.userId][dayKey][product.productId] += product.sentUnits || 0;
                    });
                });
            }
        });

        this.allTimeChartData = Object.values(allTime);
        this.yearlyChartData = yearly;
        this.monthlyChartData = monthly;
        this.dailyChartData = daily;

        this.onFrequencyChange();
    }

    loadDeliveryData() {
        const deliveryList = Object.values(this.rawDeliveryData) as any[];
        deliveryList.sort((a, b) => a.data.fullName.localeCompare(b.data.fullName));
        deliveryList.forEach(delivery => {
            this.frequencyFilter.deliveryPerson.options.push({
                value: delivery.data.userId,
                label: delivery.data.fullName
            });
        });
        this.frequencyFilter.deliveryPerson.selected = deliveryList.length > 0 ? deliveryList[0].data.userId : '';
    }

    loadProductData() {
        this.productList = Object.values(this.rawProductData);
        this.productList.forEach(product => this.frequencyFilter.product.options.push({
            value: product.data.productId,
            label: product.data.name
        }));
        this.frequencyFilter.product.options.unshift({ value: 'total', label: 'All Products' });
        this.frequencyFilter.product.selected = 'total';
    }

    onFrequencyChange() {
        this.showChart = false;

        this.displayData = [];
        if (this.frequencyFilter.level1.selected === 'All Time') {
            this.displayData = this.allTimeChartData;
        } else if (this.frequencyFilter.level1.selected === 'Yearly') {
            const yearKey = `${this.frequencyFilter.year.selected}` as string;
            this.displayData = Object.values(this.yearlyChartData[yearKey as keyof typeof this.yearlyChartData] || {});
        } else if (this.frequencyFilter.level1.selected === 'Monthly') {
            const monthKey = `${this.frequencyFilter.year.selected}${String(Number(this.frequencyFilter.month.selected) + 1).padStart(2, '0')}`;
            this.displayData = Object.values(this.monthlyChartData[monthKey] || {});
        } else if (this.frequencyFilter.level1.selected === 'Daily') {
            const monthKey = `${this.frequencyFilter.year.selected}${String(Number(this.frequencyFilter.month.selected) + 1).padStart(2, '0')}`;
            const userId = `${this.frequencyFilter.deliveryPerson.selected}`;
            this.displayData = Object.values(this.dailyChartData[monthKey]?.[userId] || {});
            this.totalDeliveries = this.displayData.reduce((sum, item) => sum + item[this.frequencyFilter.product.selected], 0);
        }

        if (this.frequencyFilter.level1.selected !== 'Daily') {
            this.displayData = this.displayData.filter(item => item[this.frequencyFilter.product.selected] > 0);
            // this.displayData = this.displayData.sort((a, b) => a[this.frequencyFilter.product.selected] - b[this.frequencyFilter.product.selected]);
        }

        this.chartData = {
            data: this.displayData,
            series: [{
                type: 'bar', xKey: 'name', yKey: this.frequencyFilter.product.selected, cornerRadius: 5, label: { enabled: true, fontSize: 12, color: '#000', placement: 'outside-end', padding: 5 },
                tooltip: this.tooltip
            }],
            axes: this.axes as []
        };

        this.cdr.detectChanges();
        this.showChart = true;
    }

    getProductName(productId: any): string {
        const product = this.rawProductData?.[productId];
        return product ? product.data.name : 'Unknown Product';
    }
}