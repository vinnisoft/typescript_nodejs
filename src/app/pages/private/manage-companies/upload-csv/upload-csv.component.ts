import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { TableModule } from 'primeng/table';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { BulkUploadComponent } from '../../../../shared/components/bulk-upload.component';
import { camelCaseToHeading } from '../../../../shared/utils/misc';
import { CustomButton } from "../../../../shared/components/buttons.component";
import { CompanyService } from '../../../../shared/services/company.service';
import { GeonamesService } from '../../../../shared/services/geonames.service';
import { CompaniesRedirectionComponent } from "../../../../shared/components/companies-redirection.component";

@Component({
  selector: 'app-upload-csv',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonGroupModule,
    ButtonModule,
    TableModule,
    TableComponent,
    BulkUploadComponent,
    CustomButton,
    CompaniesRedirectionComponent
  ],
  templateUrl: './upload-csv.component.html',
  styleUrl: './upload-csv.component.scss',
})
export class UploadCsvComponent {
  companyService = inject(CompanyService);
  geoNamesService = inject(GeonamesService);
  router = inject(Router);

  csvData: any = [];
  tableColumns: any = [];
  loading = false;
  countries: any = [];
  isInvalidData = false;

  ngOnInit() {
    this.getAllCountries();
  }

  getCsvData(data: any[]) {
    if (data.length) {

      this.tableColumns = Object.keys(data[0]).map(key => {
        return {
          field: key === "registeredAddressCountry" ? "registeredAddressCountry.countryName" :
            key === "businessAddressCountry" ? "businessAddressCountry.countryName"
              : key,
          name: camelCaseToHeading(key),
          arrayNameField: key === "shareHoldings" ? "company" : null
        }
      });
      this.validateData(data);
    } else {
      this.tableColumns = [];
      this.csvData = [];
    }
  }

  validateData(data: any[]) {
    this.companyService.validateBulkUpload(data).subscribe({
      next: (res) => {
        this.isInvalidData = res.data.summary.invalidRecords > 0;
        this.csvData = res.data.csvData;
      },

    });
  }

  getAllCountries() {
    this.geoNamesService.getAllCountries().subscribe({
      next: (response: any) => {
        this.countries = response.data;
      },

    });
  }

  onApprove() {
    this.companyService.bulkUpload(this.csvData).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.router.navigate(['/companies']);
        }
      },

    });
  }
}
