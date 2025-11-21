import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, take } from "rxjs";
import { ExportModel } from "../../assets/models/ExportEntry";

@Injectable({
    providedIn: "root",
})
export class ExportModelService {

    exportModelData = new BehaviorSubject<ExportModel | undefined>(undefined);
    exportModelData$ = this.exportModelData.asObservable();

    onButtonClick = new Subject<any>();

    showModel(exportModelData: ExportModel) {
        this.exportModelData.next(exportModelData);
        return this.onButtonClick.pipe(take(1));
    }

    hideModel() {
        this.exportModelData.next(undefined);
        this.onButtonClick.next(undefined);
    }
}