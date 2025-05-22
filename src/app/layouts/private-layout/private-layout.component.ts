import { Component } from '@angular/core';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterModule } from '@angular/router';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'private-layout',
  imports: [SidebarComponent, RouterModule, DashboardHeaderComponent, CommonModule],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss'
})
export class PrivateLayoutComponent {
  isCollapsed: boolean = false;

  getIsSidebarCollapsed(event: boolean) {
    this.isCollapsed = event
  }


}
