import { Routes } from '@angular/router';
import { Layouts } from './app.component';
import { authGuard } from './shared/guards/auth.guard';
import { loggedInGuard } from './shared/guards/logged-in.guard';
import { USER_ROLES } from '../server/models/enums/user.enums';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: '' },
    {
        path: '',
        loadChildren: () =>
            import('./layouts/private-layout/private.routes').then((m) => m.PRIVATE_ROUTES),
        canActivate: [authGuard],
        data: { layout: Layouts.Private, roles: Object.values(USER_ROLES).filter((role: any) => role !== USER_ROLES.SUPER_ADMIN) },
    },
    {
        path: '',
        loadChildren: () =>
            import('./layouts/public-layout/public.routes').then((m) => m.PUBLIC_ROUTES),
        canActivate: [loggedInGuard],
        data: { layout: Layouts.Public }
    },
    {
        path: 'account',
        loadChildren: () =>
            import('./layouts/account-layout/account.routes').then((m) => m.ACCOUNT_ROUTES),
        canActivate: [loggedInGuard],
        data: { layout: Layouts.Account }
    }
];
