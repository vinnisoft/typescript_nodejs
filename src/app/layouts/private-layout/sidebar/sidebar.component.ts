import {
  Component,
  EventEmitter,
  Output,
  Signal,
  effect,
  inject,
} from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CustomButton } from '../../../shared/components/buttons.component';
import { ConfirmationService } from 'primeng/api';
import { privileges } from '../../../../server/services/utilities';
import { UserService } from '../../../shared/services/user.service';
import { USER_ROLES } from '../../../../server/models/enums/user.enums';
import { filter, Subject, takeUntil } from 'rxjs';

interface MenuItem {
  label: string;
  icon: string;
  activeIcon: string;
  route?: string;
  isActive: boolean;
  subItems?: MenuItem[];
  isSubmenuOpened?: boolean;
  roles?: string[];
}
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    DrawerModule,
    ButtonModule,
    Ripple,
    AvatarModule,
    CommonModule,
    RouterModule,
    ConfirmDialogModule,
    CustomButton,
  ],
  providers: [ConfirmationService],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @Output() isSidebarCollapsed: EventEmitter<boolean> =
    new EventEmitter<boolean>();
  isCollapsed: boolean = false;
  authService = inject(AuthService);
  userService = inject(UserService);
  router = inject(Router);
  confirmationService = inject(ConfirmationService);
  private destroy$ = new Subject<void>();
  currentRoute = '';

  loading = false;

  user: Signal<any> = this.authService.user;
  userPrivileges: Signal<typeof privileges.user> =
    this.userService.userPrivileges;

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: '/assets/icons/black/dashboard.svg',
      activeIcon: '/assets/icons/white/dashboard.svg',
      route: '/dashboard',
      isActive: false,
    },
    {
      label: 'Manage Companies',
      icon: '/assets/icons/black/manage-companies.svg',
      activeIcon: '/assets/icons/white/manage-companies.svg',
      route: '/companies',
      isActive: false,
    },
    {
      label: 'Manage Users',
      icon: '/assets/icons/black/manage-users.svg',
      activeIcon: '/assets/icons/white/manage-users.svg',
      route: '/users',
      isActive: false,
    },
    {
      label: 'Settings',
      icon: '/assets/icons/black/settings.svg',
      activeIcon: '/assets/icons/white/settings.svg',
      isActive: false,
      route: 'settings',
      isSubmenuOpened: false,
      subItems: [
        {
          label: 'Form Builder',
          icon: '/assets/icons/form-builder.svg',
          activeIcon: '/assets/icons/form-builder-active.svg',
          route: '/settings/form-builder',
          isActive: false,
          roles: [USER_ROLES.ADMIN],
        },
        {
          label: 'My Portal',
          icon: '/assets/icons/my-portal.svg',
          activeIcon: '/assets/icons/myportalactive.svg',
          route: 'settings/my-portal',
          isActive: false,
          roles: [USER_ROLES.ADMIN],
        },
        {
          label: 'My Profile',
          icon: '/assets/icons/white/my-profile.svg',
          activeIcon: '/assets/icons/black/my-profile-blue.svg',
          route: 'settings/my-profile',
          isActive: false,
          roles: [USER_ROLES.SYSTEM_ACCOUNTANT, USER_ROLES.USER],
        },
        {
          label: 'Change Password',
          icon: '/assets/icons/change-password.svg',
          activeIcon: '/assets/icons/change-passwordactive.svg',
          route: 'settings/change-password',
          isActive: false,
        },
        {
          label: 'Privacy Policy',
          icon: '/assets/icons/white/privacy-policy.svg',
          activeIcon: '/assets/icons/black/privacy-policy-blue.svg',
          route: 'settings/privacy-policy',
          isActive: false,
          roles: [USER_ROLES.SYSTEM_ACCOUNTANT, USER_ROLES.USER],
        },
      ],
    },
  ];

  ngOnInit() {
    const userRole = this.user()?.role;
    if (userRole) {
      const companyMenuItem = this.menuItems.find(
        (item) => item.route === '/companies'
      );
      if (companyMenuItem) {
        companyMenuItem.label =
          userRole === 'admin' ? 'Manage Companies' : 'Read Manage Dox';
      }
    }

    // Subscribe to router events
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateActiveMenu(this.router.url);
      });

    this.updateActiveMenu(this.router.url);
  }

  private updateActiveMenu(url: string) {
    if (url !== this.currentRoute) {
      this.currentRoute = url;
      return this.menuItems.forEach((menu) => {
        if (menu.subItems) {
          menu.isSubmenuOpened = menu.subItems.some((subItem) =>
            url.includes(subItem.route as string)
          );
          menu.subItems.forEach((subItem) => {
            subItem.isActive = url.includes(subItem.route as string);
          });
        } else {
          menu.isActive = url.includes(menu.route as string);
        }
      });
    }
    return;
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
    this.isSidebarCollapsed.emit(this.isCollapsed);
  }

  logout(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      accept: () => {
        this.loading = true;
        this.authService.logout();
      },
      reject: () => {
        this.confirmationService.close();
      },
    });
  }

  toggleSubmenu(menuItem: MenuItem) {
    if (menuItem.route === 'settings') {
      // menuItem.route =
      menuItem.route + this.user()?.role === USER_ROLES.ADMIN
        ? '/form-builder'
        : '/my-profile';
      menuItem.isSubmenuOpened = !menuItem.isSubmenuOpened;
    } else {
      this.updateActiveMenu(this.currentRoute);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
