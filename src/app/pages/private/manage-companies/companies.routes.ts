import { Routes } from "@angular/router";
import { ListComponent } from "./list/list.component";
import { AddComponent } from "./add/add.component";
import { UploadCsvComponent } from "./upload-csv/upload-csv.component";

export const COMPANY_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: '' },
    { path: '', component: ListComponent },

    { path: 'add', loadComponent: () => import('./add/add.component').then(m => m.AddComponent) },
    { path: 'view/:id', component: AddComponent },
    { path: 'upload-csv', component: UploadCsvComponent }
]