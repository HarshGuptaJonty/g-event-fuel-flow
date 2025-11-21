import { RouterModule, Routes } from "@angular/router";
import { DashboardComponent } from "./dashboard.component";
import { NgModule } from "@angular/core";
import { CustomerComponent } from "./customer/customer.component";
import { InventoryComponent } from "./inventory/inventory.component";
import { WarehouseComponent } from "./warehouse/warehouse.component";
import { DeliveryPersonComponent } from "./delivery-person/delivery-person.component";
import { ProfileComponent } from "../profile/profile.component";
import { StatisticsComponent } from "./statistics/statistics.component";
import { CustomDevelopComponent } from "./custom-develop/custom-develop.component";
import { DEVELOPER } from "../shared/constants";
import { BulkEntryComponent } from "./bulk-entry/bulk-entry.component";
import { MoveEntriesComponent } from "./move-entries/move-entries.component";

const routes: Routes = [
    {
        path: '',
        component: DashboardComponent,
        children: [
            { path: 'customers', component: CustomerComponent },
            { path: 'inventory', component: InventoryComponent },
            { path: 'warehouse', component: WarehouseComponent },
            { path: 'delivery', component: DeliveryPersonComponent },
            { path: 'profile', component: ProfileComponent },
            { path: 'statistics', component: StatisticsComponent },
            { path: 'bulk-entry', component: BulkEntryComponent },
            { path: 'move-entries', component: MoveEntriesComponent },
            ...((DEVELOPER.IS_DEV_ENVIRONMENT || DEVELOPER.IS_STAGE_ENVIRONMENT || DEVELOPER.USE_LOCAL_DATABASE) ? [{ path: 'custom-develop', component: CustomDevelopComponent }] : []), // Add conditionally
            { path: '', redirectTo: 'customers', pathMatch: 'full' }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DashboardRoutingModule { }