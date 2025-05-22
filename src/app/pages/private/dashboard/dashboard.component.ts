import { CommonModule } from '@angular/common';
import { Component, inject, Signal } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import { ChartModule } from 'primeng/chart';
import { TopbarService } from '../../../shared/services/topbar.service';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { CustomButton } from '../../../shared/components/buttons.component';
import { DashboardService } from '../../../shared/services/dashboard.service';
import { generateRandomColors } from '../../../shared/utils/misc';
import { FormBuilderService } from '../../../shared/services/form-builder.service';
import { CompanyDocumentService } from '../../../shared/services/company-document.service';
import { CustomDropDownComponent } from '../../../shared/components/inputs.component';
import { DashboardCalendarComponent } from '../../../shared/components/dashboard-calendar/dashboard-calendar.component';
import { SkeletonModule } from 'primeng/skeleton';
import { NotificationService } from '../../../shared/services/notification.service';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { FormsModule } from '@angular/forms';
import { CompaniesRedirectionComponent } from "../../../shared/components/companies-redirection.component";

@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    DividerModule,
    CommonModule,
    ChartModule,
    ButtonModule,
    ButtonGroupModule,
    CustomButton,
    CustomDropDownComponent,
    DashboardCalendarComponent,
    SkeletonModule,
    RouterModule,
    CompaniesRedirectionComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  topBarService = inject(TopbarService);
  dashboardService = inject(DashboardService);
  formBuilderService = inject(FormBuilderService);
  companyDocumentService = inject(CompanyDocumentService);
  notificationService = inject(NotificationService);
  authService = inject(AuthService);

  loading = false;

  analytics!: any;
  allDocs: any[] = [];
  activityLogs: any[] = [];
  reminders: any[] = [];
  eventColors: any;

  statsCards: any = [
    {
      icon: '/assets/icons/total-companies.svg',
      label: 'Total Companies',
      key: 'totalCompanies',
      bgColor: 'bg-yellow-light',
      iconColor: 'text-yellow-500',
    },
    {
      icon: '/assets/icons/total-employee.svg',
      label: 'Total Employees',
      key: 'totalUsers',
      bgColor: 'bg-main-light',
      iconColor: 'text-blue-700',
    },
    {
      icon: '/assets/icons/total-state.svg',
      label: 'Total Parent Companies',
      key: 'totalParentCompanies',
      bgColor: 'bg-light-purple',
      iconColor: 'text-primary',
    },
    {
      icon: '/assets/icons/total-subsidiary.svg',
      label: 'Total Subsidiary Companies',
      key: 'totalSubsidiaryCompanies',
      bgColor: 'bg-green-light',
      iconColor: 'text-green-500',
    },
  ];

  // doughnut chart
  doughnutChartData: any;

  doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%', // Inner radius to create a ring
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 15,
          padding: 20,
          font: {
            size: 14,
          },
          // Use a custom function to create the legend items
          generateLabels: function (chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map(function (label, i) {
                const meta = chart.getDatasetMeta(0);
                const style = meta.controller.getStyle(i);
                const value = data.datasets[0].data[i];

                return {
                  text: label,
                  fillStyle: style.backgroundColor,
                  strokeStyle: style.borderColor,
                  lineWidth: style.borderWidth,
                  hidden:
                    isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                  index: i,
                  dataPercentage: value,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ${value}%`;
          },
        },
      },
    },
  };

  lineChartData: any;

  lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    layout: {
      padding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Subsidiaries',
          font: {
            size: 12,
          },
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 10,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: 'Parent Companies',
          font: {
            size: 12,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  tabHeaders: {
    _id: string;
    formName: string;
    formType: string;
    canManage: boolean;
    color: string;
  }[] = [];

  currentSelectedTab: any;
  user: Signal<any> = this.authService.user;
  isAdmin = true;
  statusOptions = [
    "Outstanding", "Due"
  ]

  async ngOnInit() {
    this.getAnalytics();
    const userRole = this.user()?.role;
    if (userRole) {
      this.isAdmin = userRole === 'admin';
    }
    this.topBarService.setHeading('Dashboard');
    this.getFormBuilder();
    this.getActivities();
    this.getReminders();
  }

  getAnalytics() {
    this.dashboardService.getAnalytics().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.analytics = result.data;
          const employeePercentagesByType = this.analytics?.users?.byType;

          this.doughnutChartData = {
            labels: ['Internal', 'External', 'System Accountants'],
            datasets: [
              {
                data: [
                  employeePercentagesByType.internal.percentage,
                  employeePercentagesByType.external.percentage,
                  employeePercentagesByType.systemAccountant.percentage,
                ],
                backgroundColor: ['#A5B4FC', '#818CF8', '#6366F1'],
                hoverBackgroundColor: ['#6366F1', '#4F46E5', '#818CF8'],
              },
            ],
          };

          const lineLabels = Object.keys(
            this.analytics.subsidiaryCountsByParent
          ).map(item => {
            return item.length > 6 ? item.slice(0, 6) + '...' : item;
          });
          const lineData = Object.values(
            this.analytics.subsidiaryCountsByParent
          );
          const colors = generateRandomColors(lineData.length);

          this.lineChartData = {
            labels: lineLabels,
            datasets: [
              {
                label: 'Number of Subsidiaries',
                data: lineData,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 0,
                barThickness: 25,
                borderRadius: 1,
                barPercentage: 1,
              },
            ],
          };
        }
      },
      error: (err) => {
        console.log(err);
      },

    });
  }

  getActivities() {
    this.notificationService.getActivities(true).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.activityLogs = result.data.list;
        }
      },
      error: (err) => {
        console.log(err);
      },

    });
  }

  getReminders() {
    this.notificationService.getReminders(true).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.reminders = result.data.list;
        }
      },
      error: (err) => {
        console.log(err);
      },

    });
  }

  getFormBuilder() {
    this.formBuilderService.getFormBuilder().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.tabHeaders = result.data.filter(
            (form: any) => form.formType !== 'company-data'
          );
          this.eventColors = this.tabHeaders.reduce((acc: any, form: any) => {
            acc[form.formType] = form.color;
            return acc;
          }, {});
          this.getFormDocs();
        }
      },
      error: (err: any) => {
        console.log(err);
      },

    });
  }

  getFormDocs() {
    this.companyDocumentService
      .getAllCompanyDocuments(
        this.currentSelectedTab && this.currentSelectedTab._id
      )
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.allDocs = result.data;
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          console.log(err);
        },
      });
  }

  onClickTab(tab?: any) {
    this.loading = true;
    if (tab) this.currentSelectedTab = tab;
    else this.currentSelectedTab = null;
    this.getFormDocs();
  }

  markAsRead(type: string, id: string) {
    this.notificationService.markAsRead(type, id).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (type === 'reminders') {
            this.getReminders();
          } else {
            this.getActivities();
          }
        }
      },
      error: (err) => {
        console.log(err);
      },

    });
  }

  onFilterByStatus(filterType: string) {
    this.companyDocumentService
      .getAllCompanyDocuments(
        this.currentSelectedTab && this.currentSelectedTab._id, filterType ? filterType.toLowerCase() : ''
      )
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.allDocs = result.data;
          }
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          console.log(err);
        },
      });
  }
}
