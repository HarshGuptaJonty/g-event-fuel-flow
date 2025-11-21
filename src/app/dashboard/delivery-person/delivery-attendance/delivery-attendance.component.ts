import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { DeliveryPersonDataService } from '../../../services/delivery-person-data.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AttendanceService } from '../../../services/attendance.service';
import { timeAgoWithMsg } from '../../../shared/commonFunctions';

@Component({
    selector: 'app-delivery-attendance',
    imports: [
        CommonModule,
        MatTableModule,
        FormsModule,
        MatCheckboxModule,
        MatSlideToggleModule
    ],
    templateUrl: './delivery-attendance.component.html',
    styleUrl: './delivery-attendance.component.scss'
})
export class DeliveryAttendanceComponent implements OnInit {

    @ViewChild('checkBox', { static: true }) checkBox!: TemplateRef<any>;
    @ViewChild('plainText', { static: true }) plainText!: TemplateRef<any>;
    @ViewChild('dnameText', { static: true }) dnameText!: TemplateRef<any>;

    @Output() openProfileEvent = new EventEmitter<string>();

    private date: Date = new Date(); // To get the current date
    frequencyFilter = {
        year: {
            options: [2024, 2025, 2026, 2027, 2028, 2029, 2030],
            selected: this.date.getFullYear()
        },
        month: {
            options: [
                { value: 0, label: 'January' },
                { value: 1, label: 'February' },
                { value: 2, label: 'March' },
                { value: 3, label: 'April' },
                { value: 4, label: 'May' },
                { value: 5, label: 'June' },
                { value: 6, label: 'July' },
                { value: 7, label: 'August' },
                { value: 8, label: 'September' },
                { value: 9, label: 'October' },
                { value: 10, label: 'November' },
                { value: 11, label: 'December' }
            ],
            selected: this.date.getMonth() // Current month (0-based index)
        },
        week: {
            options: [] as { value: string, label: string }[],
            selected: ''
        }
    };
    minDate = { year: 2025, month: 2, day: 1 };
    maxDate = { year: this.date.getFullYear(), month: this.date.getMonth(), day: this.date.getDate() };
    tableStructure: { key: string, label: string, dataType: string }[] = [
        {
            key: 'userId',
            label: 'Name',
            dataType: 'dnameText'
        }
    ];

    dataSource = new MatTableDataSource<any>([]);
    processedTableData?: any;
    rawDeliveryData: any;
    processedDeliveryData: any = {};
    private tableColumns: string[] = [];
    attandanceDataList: any = {};
    lastUpdatedStr?: any;

    constructor(
        private router: Router,
        private deliveryPersonDataService: DeliveryPersonDataService,
        private attendanceService: AttendanceService
    ) { }

    ngOnInit(): void {
        if (this.deliveryPersonDataService.hasDeliveryPersonData()) {
            this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
            this.processDeliveryPersonData();
        }

        if (this.attendanceService.hasAttendanceData()) {
            this.attandanceDataList = this.attendanceService.getAttendanceDataList();
            this.loadAttendanceData();
        }
        this.lastUpdatedStr = timeAgoWithMsg(this.attendanceService.lastRefreshed());

        this.deliveryPersonDataService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.rawDeliveryData = this.deliveryPersonDataService.getDeliveryPersonList();
                this.processDeliveryPersonData();
            }
        });

        this.attendanceService.isDataChanged?.subscribe(flag => {
            if (flag) {
                this.attandanceDataList = this.attendanceService.getAttendanceDataList();
                this.lastUpdatedStr = timeAgoWithMsg(this.attendanceService.lastRefreshed());
                this.loadAttendanceData();
            }
        });

        this.generateWeekOptions();
        this.generateTableStructure();
    }

    loadAttendanceData() {
        const processedData: any = this.processedDeliveryData;
        if (!processedData)
            return;

        Object.entries(this.attandanceDataList).forEach(([dateKey, attendance]) => {
            if (!this.tableColumns.includes(dateKey))
                this.tableColumns.push(dateKey);

            Object.entries(attendance as object).forEach(([user, value]) => processedData[user][dateKey] = value);
        });

        this.processedTableData = Object.values(processedData);
        this.dataSource.data = this.processedTableData;
    }

    processDeliveryPersonData() {
        const processedDeliveryData: any = {};

        Object.values(this.rawDeliveryData).forEach((value: any, index) => {
            processedDeliveryData[value.data.userId] = {
                userId: value.data.userId,
                name: value.data.fullName,
                index: index
            };
        });

        this.processedDeliveryData = processedDeliveryData;
        this.loadAttendanceData();
    }

    onFrequencyChange(updateweek = false) {
        if (updateweek)
            this.generateWeekOptions();
        this.generateTableStructure();
    }

    openProfile(userId: string) {
        this.router.navigate(['/dashboard/delivery'], { queryParams: { userId: userId } });
        this.openProfileEvent.emit(userId);
    }

    checkboxUpdated(object: any, column: any, event: any) {
        const update: any = {
            userId: object.userId,
            dateKey: column.key,
            isChecked: event.checked
        };
        this.attendanceService.updateAttendanceData(update.userId, update.dateKey, update.isChecked);
    }

    displayedColumns(): string[] {
        this.tableColumns = this.tableStructure.map(item => item.key);
        return this.tableColumns;
    }

    getDeliveryPersonName(userId: string): string {
        return this.rawDeliveryData?.[userId].data.fullName || 'Unknown';
    }

    refreshData(showNotification = false) {
        this.attendanceService.refreshData(showNotification);
    }

    getTemplate(dataType: string) {
        if (dataType === 'checkBox') return this.checkBox;
        if (dataType === 'dnameText') return this.dnameText;
        return this.plainText;
    }

    generateTableStructure(): void {
        const range = this.frequencyFilter.week.selected.toString().split('-');
        const start = parseInt(range[0]);
        const end = parseInt(range[1]);

        const tableStructure = [
            {
                key: 'userId',
                label: 'Name',
                dataType: 'dnameText'
            }
        ];

        for (let i = start; i <= end; i++) {
            const dateKey = i.toString();
            tableStructure.push({
                key: dateKey,
                label: `${dateKey.slice(6, 8)}-${dateKey.slice(4, 6)}-${dateKey.slice(0, 4)}`,
                dataType: 'checkBox',
            });
        }

        this.tableStructure = tableStructure;
    }

    generateWeekOptions(): void {
        const options: any[] = [];

        const year = this.frequencyFilter.year.selected;
        let month = this.frequencyFilter.month.selected;

        if (!year || !month)
            return;

        month = parseInt(month.toString());

        const today = new Date();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        let weekNumber = 1;
        let selectIndex = 0;

        const startDate = new Date(firstDayOfMonth);
        const originalMonth = startDate.getMonth();

        while (startDate <= lastDayOfMonth) {
            const endDate = new Date(startDate);
            let daysToAdd = 6 - startDate.getDay();
            endDate.setDate(startDate.getDate() + daysToAdd);

            if (endDate.getMonth() !== originalMonth)
                endDate.setMonth(originalMonth + 1, 0);

            const monthKey1 = (startDate.getMonth() + 1).toString().padStart(2, '0');
            const dayKey1 = (startDate.getDate()).toString().padStart(2, '0');
            const monthKey2 = (endDate.getMonth() + 1).toString().padStart(2, '0');
            const dayKey2 = (endDate.getDate()).toString().padStart(2, '0');

            if (today >= startDate && today <= endDate)
                selectIndex = weekNumber - 1;

            const weekValue = `${this.frequencyFilter.year.selected}${monthKey1}${dayKey1}-${this.frequencyFilter.year.selected}${monthKey2}${dayKey2}`;
            let weekLabel = `Week ${weekNumber} - ${startDate.getDate()} to ${endDate.getDate()}`;
            if (startDate.getDate() === endDate.getDate())
                weekLabel = `Week ${weekNumber} - ${startDate.getDate()}`;

            options.push({ value: weekValue, label: weekLabel });

            daysToAdd = 7 - startDate.getDay();
            startDate.setDate(startDate.getDate() + daysToAdd);
            weekNumber++;
        }

        this.frequencyFilter.week.options = options;
        this.frequencyFilter.week.selected = '';

        if (options.length > 0)
            this.frequencyFilter.week.selected = options[selectIndex].value;
    }
}