import { Component, inject, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TopbarService } from '../../../../shared/services/topbar.service';
import { CompanyService } from '../../../../shared/services/company.service';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { UserService } from '../../../../shared/services/user.service';
import { GeonamesService } from '../../../../shared/services/geonames.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../shared/services/auth.service';

@Component({
  selector: 'app-list',
  imports: [TableComponent, CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent {
  route = inject(ActivatedRoute);
  router = inject(Router);
  topBarService = inject(TopbarService);
  companyService = inject(CompanyService);
  userService = inject(UserService);
  geoNamesService = inject(GeonamesService);
  authService = inject(AuthService);

  companies: any[] = [];

  parentCompany: any;
  isChartView = true;
  tableColumns: any = [
    {
      name: 'Company Name',
      field: 'companyName',
      sortable: true,
      type: 'link',
      expandable: true,
      filter: true,
      filterType: 'multiSelect',
      onClick: (id: string) => this.router.navigate(['companies/view/', id]),
      filterPlaceHolder: 'Search State companies',
    },
    {
      name: 'Country',
      field: 'registeredAddressCountry.countryName',
      sortable: true,
      filter: true,
      filterType: 'multiSelect',
    },
    {
      name: 'Registered Address',
      field: 'registeredAddress',
    },
    {
      name: 'Currency',
      field: 'currency',
      sortable: true,
      filter: true,
      filterType: 'multiSelect',
    },
    {
      name: 'Tax Ref. No.',
      field: 'taxRefNumber',
      sortable: true,
      filter: true,
    },
  ];

  queryParams: any = {
    page: 1,
    limit: 10,
    searchfields: '',
    searchString: '',
    sortKey: '',
    sortOrder: '',
    filterData: {},
  };

  user: Signal<any> = this.authService.user;

  ngOnInit() {
    const userRole = this.user()?.role;
    if (userRole) {
      this.topBarService.setHeading(
        userRole === 'admin' ? 'Manage Companies' : 'Manage Dox'
      );
    }

    this.route.queryParams.subscribe((params) => {
      const view = params['view'];
      if (view) this.isChartView = view === 'chart';
      if (view && view === 'list') {
        this.getParentCompany();
      } else {
        this.getCompanies();
      }
    });
  }

  getParentCompany() {
    this.companyService.getLoggedInUserParentCompany().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.parentCompany = result.data;
          this.getCompanies();
        }
      },
    });
  }

  getCompanies() {
    this.companyService
      .getLoggedInUserCompanies(!this.isChartView, this.queryParams)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            if (this.isChartView) {
              this.companies = result.data;
            } else {
              this.companies = {
                ...result.data,
                list: [
                  {
                    ...this.parentCompany,
                    children: [...result.data.list],
                    expanded: true,
                  },
                ],
              };
            }
          }
        },
      });
  }
}
