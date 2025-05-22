import { Routes } from "@angular/router";
import { DashboardComponent } from "../../pages/private/dashboard/dashboard.component";
import { NotificationsComponent } from "../../pages/private/notifications/notifications.component";

export const PRIVATE_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'users', loadChildren: () => import('../../pages/private/manage-users/users.routes').then(mod => mod.USER_ROUTES) },
    { path: 'companies', loadChildren: () => import('../../pages/private/manage-companies/companies.routes').then(mod => mod.COMPANY_ROUTES) },
    { path: 'settings', loadChildren: () => import('../../pages/private/settings/settings.routes').then(mod => mod.SETTINGS_ROUTES) },
    { path: 'notifications', component: NotificationsComponent },
]