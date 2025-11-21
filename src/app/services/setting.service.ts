import { Injectable } from "@angular/core";
import { Setting } from "../../assets/models/Setting";
import { DEFAULT_LOCAL_SETTING, DEFAULT_NAV_OBJECT, LOCAL_STORAGE_KEYS } from "../shared/constants";
import { getDateInDatepickerFormat } from '../shared/commonFunctions';
import { Navigation } from "../../assets/models/Navigation";
import { Subject } from "rxjs";

@Injectable({
    providedIn: 'root',
})
export class SettingService {

    setting: Setting = DEFAULT_LOCAL_SETTING;
    navSettingObj: any = DEFAULT_NAV_OBJECT;
    isNavListChanged = new Subject<void>();

    constructor() {
        this.readLocalStorage();
    }

    readLocalStorage() {
        const storedSetting = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTING);
        if (storedSetting)
            this.setting = JSON.parse(storedSetting);

        const storedNavSetting = localStorage.getItem(LOCAL_STORAGE_KEYS.NAV_SETTING);
        if (storedNavSetting)
            this.navSettingObj = JSON.parse(storedNavSetting);
    }

    writeLocalStorage(setting: Setting) {
        this.setting = setting;
        localStorage.setItem(LOCAL_STORAGE_KEYS.SETTING, JSON.stringify(setting));
    }

    writeLocalNavStorage(navSettingObj: any) {
        this.navSettingObj = navSettingObj;
        localStorage.setItem(LOCAL_STORAGE_KEYS.NAV_SETTING, JSON.stringify(navSettingObj));
        this.isNavListChanged.next();
    }

    getNavArrayList(): Navigation[] {
        return Object.values(this.navSettingObj) as Navigation[];
    }

    getOriginalNavArrayList(): Navigation[] {
        return Object.values(DEFAULT_NAV_OBJECT) as Navigation[];
    }

    private getShiftDays(): number {
        if (this.setting.defaultDateOnNewEntry === 'previousDay')
            return -1;
        else if (this.setting.defaultDateOnNewEntry === 'nextDay')
            return 1;
        else
            return 0;
    }

    getNewEntryDate(): string {
        if (this.setting.customDate)
            return this.setting.customDate;
        return getDateInDatepickerFormat(this.getShiftDays());
    }
}