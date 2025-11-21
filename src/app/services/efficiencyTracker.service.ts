import { Injectable } from "@angular/core";
import { SettingService } from "./setting.service";

@Injectable({
    providedIn: "root",
})
export class EfficiencyTrackerService {
    private efficiencyData: EfficiencyTracker = {};
    private dataLoadData: DataLoadTracker = {};

    constructor(
        private settingService: SettingService,
    ) { }

    startTracking(pageKey: string): void {
        const startTime = performance.now();
        if (!this.efficiencyData[pageKey]) {
            this.efficiencyData[pageKey] = { bestTime: Infinity, lastTime: 0, startTime: startTime, worstTime: 0, isTracking: true };
        } else {
            this.efficiencyData[pageKey].startTime = startTime;
            this.efficiencyData[pageKey].isTracking = true;
            this.efficiencyData[pageKey].lastTime = 0; // Reset last time when starting a new tracking session
        }
    }

    stopTracking(pageKey: string): void {
        const endTime = performance.now();
        if (this.efficiencyData[pageKey] && this.efficiencyData[pageKey].isTracking) {
            const efficiency = this.efficiencyData[pageKey];
            efficiency.lastTime = parseFloat((endTime - efficiency.startTime).toFixed(2));

            if (efficiency.lastTime < efficiency.bestTime) {
                efficiency.bestTime = efficiency.lastTime;
            }
            if (efficiency.lastTime > efficiency.worstTime) {
                efficiency.worstTime = efficiency.lastTime;
            }
            efficiency.isTracking = false;
            efficiency.startTime = 0; // Reset start time after stopping tracking
            efficiency.worstTime = efficiency.worstTime || efficiency.lastTime; // Ensure worst time is set if not already

            this.efficiencyData[pageKey] = efficiency;

            if (this.settingService.setting.showEfficiencyTracker === 'yes' && this.efficiencyData[pageKey]) {
                console.log(`Efficiency for ${pageKey}:\n\tBest Time: ${this.efficiencyData[pageKey].bestTime}ms,\n\tWorst Time: ${this.efficiencyData[pageKey].worstTime}ms,\n\tLast Time: ${this.efficiencyData[pageKey].lastTime}ms`);
            }
        }
    }

    dataDownloaded(path: string, sizeInBytes = 0, local = false): void {
        if (!this.dataLoadData[path]) {
            this.dataLoadData[path] = { lastLoadSize: sizeInBytes, totalLoadSize: sizeInBytes };
        } else {
            this.dataLoadData[path].lastLoadSize = sizeInBytes;
            this.dataLoadData[path].totalLoadSize += sizeInBytes;
        }
        if (this.settingService.setting.showDataLoadedTracker === 'yes') {
            const totalDataBytesLoaded = this.dataLoadData[path].totalLoadSize;
            console.log(`Data Loaded for ${path}${local ? ' (Local)' : ''}:\n\tLast Load Size: ${this.dataLoadData[path].lastLoadSize} Bytes(${(sizeInBytes / 1024).toFixed(2)} KB)(${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB),\n\tTotal Load Size: ${this.dataLoadData[path].totalLoadSize} Bytes(${(totalDataBytesLoaded / 1024).toFixed(2)} KB)(${(totalDataBytesLoaded / (1024 * 1024)).toFixed(2)} MB)`);
        }
    }

    getTotalDataLoaded(): string {
        let totalData = 0;
        for (const key in this.dataLoadData) {
            if (Object.prototype.hasOwnProperty.call(this.dataLoadData, key)) {
                totalData += this.dataLoadData[key].totalLoadSize;
            }
        }

        if (totalData >= 1024 * 1024) {
            // If data is more than 1 MB
            return `${(totalData / (1024 * 1024)).toFixed(2)} MB`;
        } else if (totalData >= 1024) {
            // If data is more than 1 KB
            return `${(totalData / 1024).toFixed(2)} KB`;
        } else {
            // If data is less than 1 KB
            return `${totalData} Bytes`;
        }
    }

    getEfficiencyData() {
        return this.efficiencyData;
    }
    
    getDataLoadData() {
        return this.dataLoadData;
    }
}

export interface EfficiencyData {
    bestTime: number;
    worstTime: number;
    lastTime: number;
    startTime: number;
    isTracking: boolean;
}

export type EfficiencyTracker = Record<string, EfficiencyData>;

export interface DataLoad {
    lastLoadSize: number;
    totalLoadSize: number;
}

export type DataLoadTracker = Record<string, DataLoad>;
