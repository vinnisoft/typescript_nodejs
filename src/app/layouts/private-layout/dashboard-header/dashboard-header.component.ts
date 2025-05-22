import { Component, EventEmitter, inject, Output } from '@angular/core';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { AuthService } from '../../../shared/services/auth.service';
import { TopbarService } from '../../../shared/services/topbar.service';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { NotificationService } from '../../../shared/services/notification.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-dashboard-header',
  imports: [OverlayBadgeModule, RouterModule, AvatarModule],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  authService = inject(AuthService);
  topBarService = inject(TopbarService);
  notificationsService = inject(NotificationService);

  user = this.authService.user;
  heading = this.topBarService.heading;
  unreadActivitiesCount = this.notificationsService.unreadCount();

  async ngOnInit() {
    await this.getUnreadActivitiesCount();
  }

  toggle() {
    this.toggleSidebar.emit();
  }

  async getUnreadActivitiesCount() {
    await lastValueFrom(this.notificationsService.getUnreadActivitiesCount());
  }
}
