import { Routes } from '@angular/router';
import { FormBuilderComponent } from './form-builder/form-builder.component';
import { roleGuard } from '../../../shared/guards/role.guard';
import { SettingsRedirectComponent } from './settings-redirect.component';
import { MyPortalComponent } from './my-portal/my-portal.component';
import { EditComponent } from './my-portal/edit/edit.component';
import { USER_ROLES } from '../../../../server/models/enums/user.enums';
import { UserPrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { PaymentResponseComponent } from './payment-response/payment-response.component';
import { SelectPlanComponent } from './my-portal/select-plan/select-plan.component';
import { ChangePasswordComponent } from './change-password/change-password.component';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: SettingsRedirectComponent,
  },
  {
    path: 'form-builder',
    component: FormBuilderComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.ADMIN] },
  },
  {
    path: 'my-portal',
    component: MyPortalComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.ADMIN] },
  },
  {
    path: 'my-portal/edit',
    component: EditComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.ADMIN] },
  },
  {
    path: 'my-portal/select-plan',
    component: SelectPlanComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.ADMIN] },
  },
  {
    path: 'my-portal/payment-response',
    component: PaymentResponseComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.ADMIN] },
  },
  {
    path: 'my-profile',
    component: EditComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.SYSTEM_ACCOUNTANT, USER_ROLES.USER] },
  },
  {
    path: 'privacy-policy',
    component: UserPrivacyPolicyComponent,
    canActivate: [roleGuard],
    data: { roles: [USER_ROLES.SYSTEM_ACCOUNTANT, USER_ROLES.USER] },
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent,
  },
];
