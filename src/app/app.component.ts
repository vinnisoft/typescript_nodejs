import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RoutesRecognized } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { AccountLayoutComponent } from './layouts/account-layout/account-layout.component';
import { ToastModule } from 'primeng/toast';
import { PrivateLayoutComponent } from './layouts/private-layout/private-layout.component';
import { PlatformService } from './shared/services/platform.service';
import { UserService } from './shared/services/user.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from './shared/services/auth.service';

export enum Layouts {
  Public = 'Public',
  Private = 'Private',
  Account = 'Account',
}
@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    PublicLayoutComponent,
    AccountLayoutComponent,
    ToastModule,
    PrivateLayoutComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'numberdox';

  router = inject(Router);
  platformService = inject(PlatformService);
  userService = inject(UserService);
  authService = inject(AuthService);

  Layouts = Layouts;
  layout!: Layouts;
  isBrowser = this.platformService.isBrowser();

  ngOnInit(): void {
    // grab the routing data.layout parameter received
    this.router.events.subscribe({
      next: async (data) => {
        if (data instanceof RoutesRecognized) {
          // Set layout first to avoid flickering
          this.layout =
            data.state.root.firstChild?.data['layout'] || Layouts.Public;
          // Then load profile if needed
          if (this.layout === Layouts.Private) {
            await this.authService.getUserProfile();
          }
        }
      },
    });
  }
}
