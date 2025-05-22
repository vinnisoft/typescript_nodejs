import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-dashboard-calendar',
  imports: [CommonModule, DialogModule],
  templateUrl: './dashboard-calendar.component.html',
  styleUrls: ['./dashboard-calendar.component.scss'],
})
export class DashboardCalendarComponent implements OnInit {
  @Input() events: any[] = [];
  @Input() eventColors: any;

  loaderService = inject(LoaderService);
  currentYear = new Date().getFullYear();
  nextYear = this.currentYear + 1;
  showEventDetailsDialog = false;
  eventDetailsMonth = '';
  eventDetailsYear!: number;
  selectedMonthEvents: any[] = [];
  currentMonthIndex = new Date().getMonth();

  allMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  months: string[] = [];
  monthYears: { month: string; year: string }[] = [];

  ngOnInit() {
    // Create an array of 12 months starting from current month
    for (let i = 0; i < 12; i++) {
      const monthIndex = (this.currentMonthIndex + i) % 12;
      const year =
        this.currentYear + Math.floor((this.currentMonthIndex + i) / 12);

      this.months.push(this.allMonths[monthIndex]);

      this.monthYears.push({
        month: this.allMonths[monthIndex],
        year: year.toString(),
      });
    }
  }

  // Check if an event should be shown in the current month view
  shouldShowInCurrentMonth(docDate: string | Date): boolean {
    const date = new Date(docDate);
    const docMonth = date.getMonth();
    const docYear = date.getFullYear();

    // If the document date is from a previous month/year
    if (
      docYear < this.currentYear ||
      (docYear === this.currentYear && docMonth < this.currentMonthIndex)
    ) {
      // Check if it's still outstanding (past due)
      return this.getStatus(docDate) === 'Outstanding';
    }

    return false;
  }

  getStatus(dueDate: string | Date): string {
    const due = new Date(dueDate);
    const now = new Date();
    // Remove time part for accurate day comparison
    due.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return due < now ? 'Outstanding' : 'Due on';
  }

  openMonthDialog(month: string, companyInfo: any) {
    const selectedMonthYear = this.monthYears.find((my) => my.month === month);
    this.eventDetailsMonth = month;
    this.eventDetailsYear = selectedMonthYear
      ? parseInt(selectedMonthYear.year)
      : this.currentYear;

    this.selectedMonthEvents = [];
    for (const event of this.events) {
      if (event.companyInfo._id === companyInfo._id) {
        for (const doc of event.documents) {
          const docDate = new Date(doc.dueDate);
          const docMonth = docDate.toLocaleString('default', {
            month: 'short',
          });
          const docYear = docDate.getFullYear();

          // Check if it's an event for the selected month and year
          if (docMonth === month && docYear === this.eventDetailsYear) {
            this.selectedMonthEvents.push({
              companyName: companyInfo.companyName,
              ...doc,
            });
          } else if (
            month === this.monthYears[0].month &&
            this.shouldShowInCurrentMonth(doc.dueDate)
          ) {
            this.selectedMonthEvents.push({
              companyName: companyInfo.companyName,
              isPastEvent: true,
              ...doc,
            });
          }
        }
      }
    }
    this.showEventDetailsDialog = true;
  }
}
