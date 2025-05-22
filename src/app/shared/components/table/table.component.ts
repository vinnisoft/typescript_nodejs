import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Subject, debounceTime } from 'rxjs';
import { SkeletonModule } from 'primeng/skeleton';
import { ColumnFilter, TableModule } from 'primeng/table';
import { LoaderService } from '../../services/loader.service';
import { CustomButton } from '../buttons.component';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { ChipModule } from 'primeng/chip';
import {
  ToggleSwitchChangeEvent,
  ToggleSwitchModule,
} from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { CustomInputComponent } from '../inputs.component';
import { MultiSelectModule } from 'primeng/multiselect';
import { camelCaseToHeading } from '../../utils/misc';
import { CommonModule } from '@angular/common';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { Router } from '@angular/router';
import moment from 'moment';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { DatePickerModule } from 'primeng/datepicker';
import { OrgChartComponent } from '../org-chart/org-chart.component';
import { CompaniesRedirectionComponent } from '../companies-redirection.component';
import { EditableCellComponent } from './editable-cell.component';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    TableModule,
    SkeletonModule,
    CustomButton,
    ButtonGroupModule,
    ButtonModule,
    PaginatorModule,
    ChipModule,
    ToggleSwitchModule,
    FormsModule,
    DropdownModule,
    CustomInputComponent,
    MultiSelectModule,
    CommonModule,
    OrganizationChartModule,
    DatePickerModule,
    OrgChartComponent,
    CompaniesRedirectionComponent,
    EditableCellComponent,
    FormsModule,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent {
  isEditing: boolean = false;

  loaderService = inject(LoaderService);
  router = inject(Router);
  confirmDialogService = inject(ConfirmDialogService);

  Array = Array;
  moment = moment;

  @Input() columns: any[] = [];
  @Input() data: any = { list: [], pagination: {} };
  @Input() chartData: any;

  @Input() addBtnLabel: string = '';
  @Input() confirmationMessage: string = '';
  @Input() currentPage: number = 0;
  @Input() totalRecords: number = 0;
  @Input() showHeaderButtons: boolean = true;
  @Input() showHeaderAddUpload: boolean = true;

  @Input() chartView: boolean = false;

  @Input() queryParams: any = {
    page: 1,
    limit: 10,
    searchfields: '',
    searchString: '',
    sortKey: '',
    sortOrder: '',
    filterData: {},
  };

  @Output() refreshData: EventEmitter<void> = new EventEmitter<void>();
  @Output() getChartViewData: EventEmitter<void> = new EventEmitter<void>();

  @Output() onAdd: EventEmitter<void> = new EventEmitter<void>();
  @Output() onUpload: EventEmitter<void> = new EventEmitter<void>();
  @Output() onEdit: EventEmitter<any> = new EventEmitter<any>();
  @Output() updateStatus: EventEmitter<any> = new EventEmitter<any>();
  @Output() onDelete: EventEmitter<string> = new EventEmitter<string>();
  @Output() cellEdit = new EventEmitter<{
    rowData: any;
    field: string;
    value: any;
  }>();

  private searchSubject = new Subject<string>();
  showConfirmModal: boolean = false;
  pageLinks: any[] = [];

  loading = true;
  dropdownOptions: { [key: string]: any[] } = {};
  selectedFilters: { [key: string]: any } = {};
  expandedRows: { [key: string]: boolean } = {};
  dateFilterRange: { [key: string]: Date[] } = {};

  camelCaseToHeading = camelCaseToHeading;
  update$ = new Subject<boolean>();

  ngOnInit() {
    this.loaderService.isLoading$.subscribe((loading: boolean) => {
      setTimeout(() => {
        this.loading = loading;
      }, 200);
    });

    this.searchSubject.pipe(debounceTime(500)).subscribe((searchString) => {
      this.queryParams.page = 1;
      this.queryParams.searchString = searchString;
      this.refreshData.emit();
    });
  }

  startEditing() {
    this.isEditing = true;
  }

  stopEditing() {
    this.isEditing = false;
  }

  handleArrayValues(items: any[], label: string = '') {
    if (!items || items.length === 0) return '';

    if (items.length === 1) {
      return typeof items[0] === 'object' && label ? items[0][label] : items[0];
    } else {
      const firstItem =
        typeof items[0] === 'object' && label ? items[0][label] : items[0];
      const allItems = items
        .map((i) => (typeof i === 'object' && label ? i[label] : i))
        .join(', ');
      return `${firstItem}  <small class="cursor-pointer tooltip-more" title="${allItems}" tooltipPosition="bottom">+${
        items.length - 1
      } more</small>`;
    }
  }

  onPageChange(event: any) {
    this.queryParams.page = event.first / event.rows + 1;
    this.queryParams.limit = event.rows;
    this.currentPage = this.queryParams.page - 1;
    this.refreshData.emit();
  }

  onSearchInputChange(event: any) {
    const searchString = event?.target?.value;
    this.searchSubject.next(searchString);
  }

  onSort(event: any) {
    const sortEvent = event.multisortmeta ? event.multisortmeta[1] : event;
    this.queryParams.sortKey = sortEvent.field;
    this.queryParams.sortOrder = sortEvent.order === 1 ? 'DESC' : 'ASC';
    this.refreshData.emit();
  }

  onFilter(filter: ColumnFilter) {
    this.queryParams.filterData = { ...this.selectedFilters };
    this.refreshData.emit();
    filter.hide();
  }

  onCancelFilter(filter: ColumnFilter, field: string) {
    delete this.selectedFilters[field];
    delete this.dateFilterRange[field];
    this.queryParams.filterData = { ...this.selectedFilters };
    this.refreshData.emit();
    filter.hide();
  }

  onClickAdd() {
    this.onAdd.emit();
  }
  onClickUpload() {
    this.onUpload.emit();
  }

  onClickEdit(id: string) {
    this.onEdit.emit(id);
  }

  onToggleSwitch(event: ToggleSwitchChangeEvent, id: string) {
    this.updateStatus.emit({ id, isActive: event.checked });
  }

  getDropDownOptions(field: string, capitalize?: boolean) {
    if (!this.dropdownOptions[field]) {
      const options = new Map();
      const data = this.data?.list[0].children
        ? this.data?.list[0].children
        : this.data?.list;
      data?.forEach((item: any) => {
        const value = this.getNestedValue(item, field);
        // Remove console.log to clean up
        if (Array.isArray(value)) {
          value.forEach((subItem: any) => {
            // Keep original value but modify display properties if needed
            if (capitalize && typeof subItem === 'object' && subItem.name) {
              options.set(subItem._id, {
                ...subItem,
                name: this.camelCaseToHeading(subItem.name),
              });
            } else {
              options.set(subItem._id || JSON.stringify(subItem), subItem);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects like registeredAddressCountry.countryName
          const displayKey =
            Object.keys(value).find(
              (k) => k.includes('name') || k === 'label'
            ) || Object.keys(value)[0];
          const idKey = '_id' in value ? '_id' : Object.keys(value)[0];
          const displayValue = value[displayKey];

          options.set(value[idKey] || JSON.stringify(value), {
            ...value,
            name:
              capitalize && typeof displayValue === 'string'
                ? this.camelCaseToHeading(displayValue)
                : displayValue,
          });
        } else {
          // For simple values, store the original value and a display value if needed
          if (capitalize && typeof value === 'string') {
            options.set(value, {
              value: value,
              name: this.camelCaseToHeading(value),
            });
          } else if (value !== null && value !== undefined) {
            options.set(value, value);
          }
        }
      });

      this.dropdownOptions[field] = Array.from(options.values());
    }
    return this.dropdownOptions[field];
  }

  onClickDelete(event: Event, id: string) {
    console.log(this.confirmationMessage);
    this.confirmDialogService
      .confirm({
        message: this.confirmationMessage
          ? this.confirmationMessage
          : 'Are you sure you want to delete this item?',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.onDelete.emit(id);
        }
      });
  }

  toggleRowExpansion(row: any) {
    console.log(row);
    this.expandedRows[row._id] = !this.expandedRows[row._id];
  }

  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null; // Handle null/undefined cases
    return path.includes('.')
      ? path.split('.').reduce((acc, part) => acc && acc[part], obj)
      : obj[path];
  }

  dateFilter(event: Date[], field: string) {
    this.dateFilterRange[field] = event;
    this.selectedFilters = {
      ...this.selectedFilters,
      [field]:
        event.length && event[1]
          ? { fromDate: event[0], toDate: event[1] }
          : { fromDate: event[0], toDate: event[0] },
    };
  }

  onCellEdit(rowData: any, field: string, value: any) {
    this.cellEdit.emit({ rowData, field, value });
  }

  toggleView(view: string) {
    this.loading = true;
    if (view === 'chart') {
      this.chartView = true;
      this.getChartViewData.emit();
    } else {
      this.chartView = false;
      this.refreshData.emit();
    }
  }

  // Open file in a new tab without downloading
  openFileInNewTab(url: string) {
    if (!url) return;
    window.open(url, '_blank');
  }

  // Download file without opening in new tab
  downloadFile(url: string) {
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Both open in new tab and download
  openAndDownloadFile(url: string) {
    if (!url) return;

    // Open in new tab
    window.open(url, '_blank');

    // Also trigger download
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 100);
  }
}
