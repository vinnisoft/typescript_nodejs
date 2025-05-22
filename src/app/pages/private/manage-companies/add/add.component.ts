import { Component, inject, Signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CustomInputComponent,
  CustomDropDownComponent,
  CustomCalendarComponent,
  CustomTextareaComponent,
  FileUploadComponent,
  CustomInputNumberComponent,
} from '../../../../shared/components/inputs.component';
import { CustomButton } from '../../../../shared/components/buttons.component';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { emptySpaceValidator } from '../../../../shared/validators/emptyString.validator';
import { errorMessages } from '../../../../shared/validators/errorMessages';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { ButtonModule } from 'primeng/button';
import {
  COMPANY_STATUS,
  COMPANY_TYPES,
} from '../../../../../server/models/enums/company.enums';
import { CompanyService } from '../../../../shared/services/company.service';
import {
  camelCaseToHeading,
  changePrivilegesToString,
} from '../../../../shared/utils/misc';
import { TabsModule } from 'primeng/tabs';
import moment from 'moment';
import { privileges } from '../../../../../server/services/utilities';
import { TableComponent } from '../../../../shared/components/table/table.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { UserService } from '../../../../shared/services/user.service';
import { GeonamesService } from '../../../../shared/services/geonames.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilderService } from '../../../../shared/services/form-builder.service';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { DrawerModule } from 'primeng/drawer';
import {
  FREQUENCY,
  REPEAT,
} from '../../../../../server/models/enums/formBuilder.enums';
import { CompanyDocumentService } from '../../../../shared/services/company-document.service';
import { AccordionModule } from 'primeng/accordion';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TreeSelect, TreeSelectModule } from 'primeng/treeselect';
import { ChipModule } from 'primeng/chip';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { AuthService } from '../../../../shared/services/auth.service';
import { TopbarService } from '../../../../shared/services/topbar.service';
import { CompaniesRedirectionComponent } from '../../../../shared/components/companies-redirection.component';

@Component({
  selector: 'app-add',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CustomInputComponent,
    CustomButton,
    ReactiveFormsModule,
    CustomDropDownComponent,
    CustomCalendarComponent,
    ButtonGroupModule,
    ButtonModule,
    TabsModule,
    TableComponent,
    ConfirmDialogModule,
    DatePickerModule,
    PopoverModule,
    DrawerModule,
    CustomTextareaComponent,
    FileUploadComponent,
    CustomInputNumberComponent,
    AccordionModule,
    ToggleSwitchModule,
    TreeSelectModule,
    ChipModule,
    CheckboxModule,
    InputNumberModule,
    CompaniesRedirectionComponent,
  ],
  providers: [ConfirmationService, DatePipe],
  templateUrl: './add.component.html',
  styleUrl: './add.component.scss',
})
export class AddComponent {
  @ViewChild('treeselect') treeselect!: TreeSelect;

  loading = false;
  fb = inject(FormBuilder);
  route = inject(ActivatedRoute);
  router = inject(Router);

  companyService = inject(CompanyService);
  confirmationService = inject(ConfirmationService);
  userService = inject(UserService);
  geoNamesService = inject(GeonamesService);
  formBuilderService = inject(FormBuilderService);
  companyDocumentService = inject(CompanyDocumentService);
  authService = inject(AuthService);
  topBarService = inject(TopbarService);

  isFormEdited = false;
  showAddDocumentDrawer = false;
  isShareHoldingInvolved = false;

  errorMessages = errorMessages;
  camelCaseToHeading = camelCaseToHeading;
  changePrivilegesToString = changePrivilegesToString;
  moment = moment;

  userPrivileges: Signal<typeof privileges.user> =
    this.userService.userPrivileges;
  companyId = <string>this.route.snapshot.paramMap.get('id');
  companyTypes = Object.values(COMPANY_TYPES)
    .filter((item) => item !== 'main')
    .map((item) => ({ name: camelCaseToHeading(item), value: item }));
  companyStatus = Object.values(COMPANY_STATUS).map((item) => ({
    name: camelCaseToHeading(item),
    value: item,
  }));
  currencies: string[] = [];
  countries: any = [];
  forms: any[] = [];
  companies: any[] = [];
  selectedShareHoldings: any[] = [];

  tabHeaders: {
    _id: string;
    formName: string;
    formType: string;
    canManage: boolean;
  }[] = [];
  activeTabId: string = '';
  yearFilterValue: any;

  tableColumns: any[] = [];
  tableData = { list: [], pagination: {} };
  queryParams: any = {
    page: 1,
    limit: 10,
    searchfields: '',
    searchString: '',
    sortKey: '',
    sortOrder: '',
    filterData: {},
  };

  companyForm: FormGroup = this.fb.group({});
  companyFormBuilderName: any;
  registeredAddressForm: FormGroup = this.fb.group({});
  businessAddressForm: FormGroup = this.fb.group({});
  docUploadForm: FormGroup = this.fb.group({
    _id: [''],
    company: [this.companyId, Validators.required],
    form: ['', Validators.required],
    docType: ['', Validators.required],
    title: ['', Validators.required],
    document: [''],
    notes: [''],
    description: [''],
    filedDate: [''],
    dueDate: [''],
    frequency: [''],
    reminder: [''],
    reminderTriggerDate: [''],
    // repeat: [''],
    updatedAt: [''],
  });

  allFormFields: any[] = [];
  registeredAddressFields: any = {};
  businessAddressFields: any = {};
  companyDataFields: any[] = [];

  selectFieldOptions:
    | { key: { options: any[]; optionLabel: string; optionValue: string } }
    | any;
  dateFilterValue: any;
  docTypeOptions = [];
  frequencyOptions = Object.values(FREQUENCY)
    .filter((item) => item)
    .map((option: any) => ({
      name: camelCaseToHeading(option),
      value: option,
    }));
  // repeatOptions = Object.values(REPEAT).filter(item => item).map((option: any) => ({ name: camelCaseToHeading(option), value: option }));
  activeForm: any;
  currentSelectedTab: any;

  user: Signal<any> = this.authService.user;

  async ngOnInit() {
    const userRole = this.user()?.role;
    if (userRole) {
      this.topBarService.setHeading(
        userRole === 'admin'
          ? this.companyId
            ? 'Read Manage Dox'
            : 'Add Company'
          : 'Manage Dox'
      );
    }

    await this.getCompanies();
    if (this.companyId) {
      this.userService.getUserPrvileges(this.companyId);
    }
    this.getCompanyFields();
    this.getAllCountries();
  }

  get controls(): { [key: string]: FormGroup } {
    return this.companyForm.controls as { [key: string]: FormGroup };
  }

  get docUploadFormControls(): { [key: string]: FormGroup } {
    return this.docUploadForm.controls as { [key: string]: FormGroup };
  }

  get shareHoldings() {
    return this.companyForm.get('shareHoldings') as FormArray;
  }

  buildDynamicForm() {
    const formControls: any = { shareHoldings: new FormArray([]) };
    let addressFormControls: any = {};

    this.allFormFields.forEach((field) => {
      if (field.type === 'parent') {
        addressFormControls = {
          ...addressFormControls,
          [field.field]: {},
        };
        if (field.children && field.children.length > 0) {
          field.children.forEach((childField: any) => {
            const validators = childField.isRequired
              ? [Validators.required]
              : [];

            if (!childField.isDefault) {
              if (
                !addressFormControls[field.field][
                  field.childPrefix + 'CustomFieldValues'
                ]
              ) {
                addressFormControls[field.field][
                  field.childPrefix + 'CustomFieldValues'
                ] = this.fb.group({});
              }
              (
                addressFormControls[field.field][
                  field.childPrefix + 'CustomFieldValues'
                ] as FormGroup
              ).addControl(childField.field, this.fb.control('', validators));
            } else {
              addressFormControls[field.field][childField.field] = [
                '',
                validators,
              ];
            }
          });
        }
      } else {
        const validators = field.isRequired ? [Validators.required] : [];

        if (!field.isDefault) {
          if (!formControls.companyDataCustomFieldValues) {
            formControls.companyDataCustomFieldValues = this.fb.group({});
          }
          (formControls.companyDataCustomFieldValues as FormGroup).addControl(
            field.field,
            this.fb.control('', validators)
          );
        } else {
          if (field.type === 'text') {
            validators.push(emptySpaceValidator);
          }
          formControls[field.field] = ['', validators];
        }
      }
    });

    // Create the form
    this.companyForm = this.fb.group(formControls);
    this.registeredAddressForm = this.fb.group({
      ...addressFormControls['registeredAddressDetails'],
    });
    this.businessAddressForm = this.fb.group({
      ...addressFormControls['businessAddressDetails'],
    });
    if (this.companyId) {
      this.getFormBuilder();
      this.getCompanyDetails();
    }
  }

  getAllCountries() {
    this.geoNamesService.getAllCountries().subscribe({
      next: (response: any) => {
        this.countries = response.data;
        this.currencies = [
          ...new Set(
            Object.values(this.countries)
              .map(
                (country: any) => country.currency !== '' && country.currency
              )
              .flat()
          ),
        ];
        this.selectFieldOptions = {
          companyType: {
            options: this.companyTypes,
            optionLabel: 'name',
            optionValue: 'value',
          },
          status: {
            options: this.companyStatus,
            optionLabel: 'name',
            optionValue: 'value',
          },
          currency: {
            options: this.currencies,
            optionLabel: null,
            optionValue: null,
          },
          registeredAddressCountry: {
            options: [...this.countries],
            optionLabel: 'countryName',
            optionValue: '',
            onChange: () => this.getCitiesByCountry(false),
          },
          businessAddressCountry: {
            options: [...this.countries],
            optionLabel: 'countryName',
            optionValue: '',
            onChange: () => this.getCitiesByCountry(true),
          },
        };
      },
    });
  }

  getCitiesByCountry(isBusinessAddress: boolean) {
    let country: string;
    if (isBusinessAddress) {
      country = this.businessAddressForm.get('businessAddressCountry')?.value
        .countryCode;
    } else {
      country = this.registeredAddressForm.get('registeredAddressCountry')
        ?.value.countryCode;
    }

    this.geoNamesService.getCitiesByCountry(country).subscribe({
      next: (response: any) => {
        if (isBusinessAddress) {
          this.selectFieldOptions = {
            ...this.selectFieldOptions,
            businessAddressCity: {
              options: [...response.data],
              optionLabel: 'name',
              optionValue: 'name',
            },
          };
        } else {
          this.selectFieldOptions = {
            ...this.selectFieldOptions,
            registeredAddressCity: {
              options: [...response.data],
              optionLabel: 'name',
              optionValue: 'name',
            },
          };
        }
      },
    });
  }

  addCompany(payload: any) {
    this.companyService.addCompany(payload).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.router.navigate(['/companies/view', result.data._id]);
        }
      },
    });
  }

  getStateLevelCompanies() {
    this.loading = true;
    this.companyService
      .getLoggedInUserStateLevelCompanies(this.companyId)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.selectFieldOptions = {
              ...this.selectFieldOptions,
              parentCompany: {
                options: result.data,
                optionLabel: 'companyName',
                optionValue: '_id',
              },
            };
          }
          this.loading = false;
        },
      });
  }

  async getCompanies() {
    this.companyService
      .getLoggedInUserCompanies(false, null, this.companyId)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.companies = result.data[0].children;
          }
        },
      });
  }

  getCompanyDetails() {
    this.loading = true;
    this.companyService.getCompanyDetails(this.companyId).subscribe({
      next: (result: any) => {
        if (result.success) {
          if (result.data.shareHoldings?.length) {
            this.isShareHoldingInvolved = true;
            this.shareHoldings.clear();

            // Extract company IDs from shareholdings for easier comparison
            const selectedCompanyIds = result.data.shareHoldings.map(
              (holding: any) => holding.company && holding.company._id
            );

            // Store the shareholdings data for later processing
            const shareholdingsData = result.data.shareHoldings;

            // Check if companies are loaded, if not, wait for them
            if (this.companies && this.companies.length > 0) {
              this.processShareholdings(selectedCompanyIds, shareholdingsData);
            } else {
              // If companies aren't loaded yet, get them first
              this.companyService
                .getLoggedInUserCompanies(false, null, this.companyId)
                .subscribe({
                  next: (companyResult: any) => {
                    if (companyResult.success) {
                      this.companies = companyResult.data.companies[0].children;
                      // Now process the shareholdings with the loaded companies
                      this.processShareholdings(
                        selectedCompanyIds,
                        shareholdingsData
                      );
                    }
                  },
                });
            }
          }

          // Rest of the method remains unchanged
          this.companyForm.patchValue({
            ...result.data,
          });

          if (this.isShareHoldingInvolved) {
            this.companyForm.get('companyType')?.disable();
          } else {
            this.companyForm
              .get('parentCompany')
              ?.setValue(
                result.data?.parentCompany?._id || result.data.parentCompany
              );
          }
          const registeredAddressFields = Object.keys(result.data)
            .filter((key) => key.startsWith('registeredAddress'))
            .reduce((obj, key) => {
              obj[key] = result.data[key];
              return obj;
            }, {});

          const businessAddressFields = Object.keys(result.data)
            .filter((key) => key.startsWith('businessAddress'))
            .reduce((obj, key) => {
              obj[key] = result.data[key];
              return obj;
            }, {});

          this.registeredAddressForm.patchValue({
            ...registeredAddressFields,
          });

          this.businessAddressForm.patchValue({
            ...businessAddressFields,
          });

          if (
            this.registeredAddressForm.get('registeredAddressCountry')?.value
          ) {
            this.getCitiesByCountry(false);
          }
          if (this.businessAddressForm.get('businessAddressCountry')?.value) {
            this.getCitiesByCountry(true);
          }
          this.loading = false;
        }
      },
    });
  }

  getCompanyFields() {
    this.companyService.getCompanyFormFields().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.allFormFields = [...result.data.fields];
          this.registeredAddressFields = this.allFormFields.find(
            (field: any) =>
              field.type === 'parent' &&
              field.children?.length > 0 &&
              field.field === 'registeredAddressDetails'
          );
          this.businessAddressFields = this.allFormFields.find(
            (field: any) =>
              field.type === 'parent' &&
              field.children?.length > 0 &&
              field.field === 'businessAddressDetails'
          );
          this.companyDataFields = this.allFormFields.filter(
            (field: any) => field.type !== 'parent'
          );
          this.buildDynamicForm();
          if (this.companyForm.get('companyType')) {
            this.companyForm
              .get('companyType')
              ?.valueChanges.subscribe((value) => {
                if (value === 'main') {
                  this.companyTypes.push({ name: 'Main', value: 'main' });
                  if (!this.companyForm.get('companyType')?.disabled) {
                    this.companyForm
                      .get('companyType')
                      ?.disable({ emitEvent: false });
                  }
                  this.companyForm.get('status')?.disable({ emitEvent: false });
                  this.companyForm.get('parentCompany')?.clearValidators();
                } else if (
                  value === 'subsidiary' &&
                  !this.isShareHoldingInvolved
                ) {
                  this.companyTypes.filter((item) => item.name !== 'Main');
                  this.getStateLevelCompanies();
                  this.companyForm
                    .get('parentCompany')
                    ?.addValidators(Validators.required);
                } else {
                  this.companyTypes.filter((item) => item.name !== 'Main');
                  this.companyForm.get('parentCompany')?.clearValidators();
                }
                this.companyForm.get('parentCompany')?.updateValueAndValidity();
              });
          }
        }
      },
    });
  }

  updateCompany(payload: any) {
    this.companyService
      .updateCompanyDetails(this.companyId, payload)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.isFormEdited = false;
            this.getCompanyDetails();
          }
        },
      });
  }

  onChangeCompanyType() {
    if (this.controls['companyType'].value === 'subsidiary') {
      this.getStateLevelCompanies();
      if (!this.isShareHoldingInvolved)
        this.controls['parentCompany'].addValidators(Validators.required);
    } else {
      this.controls['parentCompany'].clearValidators();
    }
    this.controls['parentCompany'].updateValueAndValidity();
  }

  onSubmit() {
    if (
      this.companyForm.valid &&
      this.shareHoldings.valid &&
      this.registeredAddressForm.valid &&
      this.businessAddressForm.valid
    ) {
      this.loading = true;
      const formValue = this.companyForm.getRawValue();

      const payload = {
        ...formValue,
        shareHoldings: this.shareHoldings.value.map((item: any) => ({
          ...item,
          company: item.company._id,
        })),
        ...this.registeredAddressForm.value,
        ...this.businessAddressForm.value,
      };
      if (this.companyId) {
        this.updateCompany(payload);
      } else {
        this.addCompany(payload);
      }
    } else {
      this.companyForm.markAllAsTouched();
      this.shareHoldings.markAllAsTouched();
      this.registeredAddressForm.markAllAsTouched();
      this.businessAddressForm.markAllAsTouched();
    }
  }

  deleteCompany() {
    this.loading = true;
    this.companyService.deleteCompany(this.companyId).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.router.navigate(['/companies']);
        }
        this.loading = false;
      },
    });
  }

  getFormBuilder() {
    this.loading = true;
    this.formBuilderService
      .getFormBuilderByCompanyId(this.companyId)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.forms = result.data;
            this.companyFormBuilderName = result.data.find(
              (form: any) => form.formType === 'company-data'
            );
            this.tabHeaders = result.data.filter(
              (form: any) => form.formType !== 'company-data'
            );
            this.activeTabId = this.tabHeaders[0]._id;
            this.currentSelectedTab = this.tabHeaders[0];
            if (this.companyId) this.getFormDocs();
            this.docUploadForm.get('form')?.setValue(this.activeTabId);
            this.getFormDetails();
          }
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
        },
      });
  }

  onClickDelete(event?: any) {
    if (event) {
      event.stopPropagation();
    }
    this.confirmationService.confirm({
      accept: () => {
        this.deleteCompany();
      },
      reject: () => {
        this.confirmationService.close();
      },
    });
  }

  onClickEdit() {
    if (this.controls['companyType'].value === 'subsidiary') {
      this.getStateLevelCompanies();
    }
    this.isFormEdited = true;
  }

  onClickCancel() {
    if (this.companyId) {
      this.isFormEdited = false;
    } else {
      this.router.navigate(['/companies']);
    }
  }

  onClickTab(tab: any) {
    this.activeTabId = tab._id;
    this.currentSelectedTab = tab;
    this.getFormDocs();
    this.docUploadForm.get('form')?.setValue(tab._id);
    this.getFormDetails();
  }

  getFormDetails() {
    this.formBuilderService.getFormDetails(this.activeTabId).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.tableColumns = [
            ...result.data.fields.map((col: any) => {
              return { ...col, editable: true };
            }),
          ];
          this.activeForm = this.forms.find(
            (form: any) => form._id === this.activeTabId
          );
          this.docTypeOptions = this.tableColumns.find(
            (f: any) => f.field === 'docType'
          ).options;

          if (
            this.userPrivileges() &&
            this.userPrivileges()[this.currentSelectedTab.formType].manage
          ) {
            this.tableColumns.push({
              name: 'Actions',
              field: 'actions',
            });
          }
        }
      },
      error: (err: any) => {
        console.log(err);
      },
    });
  }

  addDocument() {
    if (this.docUploadForm.invalid) {
      this.docUploadForm.markAllAsTouched();
    } else {
      if (this.docUploadForm.value._id) {
        this.updateCompanyDocument(this.docUploadForm.value);
      } else {
        this.uploadCompanyDocument(this.docUploadForm.value);
      }
    }
  }

  uploadCompanyDocument(payload: any) {
    this.loading = true;
    this.companyDocumentService.uploadCompanyDocument(payload).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.docUploadForm.reset();
          this.docUploadForm.get('form')?.setValue(this.activeTabId);
          this.docUploadForm.get('company')?.setValue(this.companyId);
          this.showAddDocumentDrawer = false;
          this.getFormDocs();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  updateCompanyDocument(payload: any) {
    this.loading = true;
    this.companyDocumentService
      .updateCompanyDocumentDetails(payload._id, payload)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.docUploadForm.reset();
            this.docUploadForm.get('form')?.setValue(this.activeTabId);
            this.docUploadForm.get('company')?.setValue(this.companyId);
            this.showAddDocumentDrawer = false;
            this.getFormDocs();
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  getFormDocs() {
    this.companyDocumentService
      .getCompanyDocuments(this.companyId, this.activeTabId, this.queryParams)
      .subscribe({
        next: (result: any) => {
          if (result.success) {
            this.tableData = { ...result.data };
          }
        },
        error: (err) => {
          console.log(err);
        },
      });
  }

  editDocForm(id: string) {
    this.companyDocumentService.getCompanyDocumentDetails(id).subscribe({
      next: (result: any) => {
        if (result.success && result.data) {
          // Ensure all form fields have at least a default value
          const formData = {
            _id: result.data._id || '',
            company: result.data.company || this.companyId,
            form: result.data.form || this.activeTabId,
            docType: result.data.docType || '',
            title: result.data.title || '',
            document: result.data.document ? [result.data.document] : [],
            notes: result.data.notes || '',
            description: result.data.description || '',
            filedDate: result.data.filedDate || null,
            dueDate: result.data.dueDate || null,
            frequency: result.data.frequency || '',
            reminder: result.data.reminder || '',
            reminderTriggerDate: result.data.reminderTriggerDate || null,
            // repeat: result.data.repeat || '',
            updatedAt: result.data.updatedAt || '',
          };

          this.docUploadForm.patchValue(formData);
          this.showAddDocumentDrawer = true;
        }
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  deleteDoc(id: string) {
    this.companyDocumentService.deleteCompanyDocument(id).subscribe({
      next: (result: any) => {
        this.getFormDocs();
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  closeDocUploadDrawer() {
    this.showAddDocumentDrawer = false;
    this.docUploadForm.reset();
    this.docUploadForm.get('form')?.setValue(this.activeTabId);
  }

  applyYearFilter(yearFilter: DatePicker) {
    yearFilter.hideOverlay();
    if (this.yearFilterValue) {
      this.queryParams.filterData.createdAt = {
        fromDate: moment(this.yearFilterValue).startOf('year'),
        toDate: moment(this.yearFilterValue).endOf('year'),
      };
      this.getFormDocs();
    }
  }

  clearYearFilter(yearFilter: DatePicker) {
    yearFilter.clear();
    yearFilter.hideOverlay();
    delete this.queryParams.filterData.createdAt;
    this.getFormDocs();
  }

  onSwitchShareHoldings() {
    const companyType = this.companyForm.get('companyType') as FormControl;
    const parentCompany = this.companyForm.get('parentCompany');

    if (this.isShareHoldingInvolved) {
      companyType?.setValue('subsidiary');
      companyType?.disable();
      parentCompany?.setValue(null);
      parentCompany?.setErrors(null);
      parentCompany?.updateValueAndValidity();

      this.shareHoldings.addValidators(Validators.required);
    } else {
      companyType?.setValue(null);
      companyType?.enable();
      this.shareHoldings.clear();
      this.shareHoldings.removeValidators(Validators.required);
    }
    this.shareHoldings.updateValueAndValidity();
    companyType?.updateValueAndValidity();
  }

  onRemoveShareHolding(
    index: number,
    selectedNodes: any[],
    treeselect: TreeSelect
  ) {
    const removedCompanyId = this.shareHoldings.at(index).get('company')?.value;

    this.shareHoldings.removeAt(index);

    const newSelection = selectedNodes.filter((node) => {
      const nodeId = node._id || node;
      return nodeId !== removedCompanyId;
    });

    if (treeselect) {
      treeselect.value = null;

      setTimeout(() => {
        treeselect.value = newSelection.length > 0 ? newSelection : null;
        treeselect.updateTreeState();

        if (treeselect.cd) {
          treeselect.cd.markForCheck();
        }
      });
    }

    this.shareHoldings.markAsDirty();
    this.shareHoldings.markAsTouched();
  }

  // Add this method to validate total percentage
  validateTotalPercentage(): boolean {
    const totalPercentage = this.shareHoldings.controls.reduce(
      (sum, control) => {
        return sum + (control.get('percentage')?.value || 0);
      },
      0
    );
    return totalPercentage <= 100;
  }

  // Modify onChangeShareholdingsSelection to initialize with remaining percentage
  onChangeShareholdingsSelection(event: any, checked: boolean) {
    if (checked) {
      const currentTotal = this.shareHoldings.controls.reduce(
        (sum, control) => {
          return sum + (control.get('percentage')?.value || 0);
        },
        0
      );

      const remainingPercentage = Math.max(0, 100 - currentTotal);

      const newShareHolding = this.fb.group({
        company: [event.node],
        percentage: [
          remainingPercentage,
          [
            Validators.required,
            Validators.min(0.1),
            Validators.max(remainingPercentage),
          ],
        ],
      });

      this.shareHoldings.push(newShareHolding);
    } else {
      const index = this.shareHoldings.controls.findIndex(
        (control) => control.get('company')?.value === event.node
      );

      if (index !== -1) {
        this.shareHoldings.removeAt(index);
      }
    }
    this.shareHoldings.markAsDirty();
    this.shareHoldings.markAsTouched();
  }

  updatePercentageValidators() {
    const shareHoldings = this.shareHoldings.controls;

    // Get the currently focused/changed control
    const changedControl = shareHoldings.find(
      (control) =>
        document.activeElement === control.get('percentage')?.['nativeElement']
    );

    const total = shareHoldings.reduce(
      (sum, control) =>
        sum + (parseFloat(control.get('percentage')?.value) || 0),
      0
    );

    if (total > 100) {
      const controlToAdjust =
        changedControl || shareHoldings[shareHoldings.length - 1];
      const otherTotal = shareHoldings.reduce((sum, control) => {
        if (control !== controlToAdjust) {
          return sum + (parseFloat(control.get('percentage')?.value) || 0);
        }
        return sum;
      }, 0);

      const maxAllowed = parseFloat((100 - otherTotal).toFixed(1));
      controlToAdjust
        .get('percentage')
        ?.setValue(Math.max(0, maxAllowed), { emitEvent: false });
    }
    // Update max values for all controls
    shareHoldings.forEach((control, index) => {
      const otherTotal = shareHoldings.reduce(
        (sum, otherControl, otherIndex) => {
          if (otherIndex !== index) {
            return (
              sum + (parseFloat(otherControl.get('percentage')?.value) || 0)
            );
          }
          return sum;
        },
        0
      );

      const maxAllowed = parseFloat((100 - otherTotal).toFixed(1));
      control.get('percentage')?.setValidators([
        Validators.required,
        Validators.min(0.1), // Changed from 0 to 0.1
        Validators.max(maxAllowed),
      ]);
      control.get('percentage')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  onDeleteShareHolding(index: number, treeselect: TreeSelect) {
    if (treeselect) {
      const removedCompanyId = this.shareHoldings.at(index).get('company')
        ?.value._id;
      treeselect.value = null;
      const selectedNodes = this.shareHoldings.value.map(
        (item) => item.company
      );

      const newSelection = selectedNodes.filter((node) => {
        const nodeId = node._id || node;
        return nodeId !== removedCompanyId;
      });
      setTimeout(() => {
        treeselect.value = newSelection.length > 0 ? newSelection : null;
        treeselect.updateTreeState();

        if (treeselect.cd) {
          treeselect.cd.markForCheck();
        }
      });
      this.shareHoldings.removeAt(index);
    }
  }

  onClearShareHoldings() {
    this.selectedShareHoldings = [];
    this.shareHoldings.clear();
    this.shareHoldings.markAsDirty();
    this.shareHoldings.markAsTouched();
  }

  getRemainingPercentage(currentIndex: number): number {
    const currentValue =
      parseFloat(
        this.shareHoldings.at(currentIndex).get('percentage')?.value
      ) || 0;

    const totalOtherPercentages = this.shareHoldings.controls.reduce(
      (sum, control, index) => {
        if (index !== currentIndex) {
          return sum + (parseFloat(control.get('percentage')?.value) || 0);
        }
        return sum;
      },
      0
    );

    return parseFloat((100 - totalOtherPercentages + currentValue).toFixed(1));
  }

  onReminderInput() {
    const reminder = this.docUploadForm.get('reminder')?.value;
    const dueDate = this.docUploadForm.get('dueDate')?.value;

    if (reminder && dueDate) {
      // Calculate trigger date by subtracting reminder days from due date
      const triggerDate = moment(dueDate).subtract(reminder, 'days').toDate();
      this.docUploadForm.get('reminderTriggerDate')?.setValue(triggerDate);
    } else {
      this.docUploadForm.get('reminderTriggerDate')?.setValue(null);
    }
  }

  private expandTreeNodes(nodes: any[]) {
    if (!nodes) return;

    nodes.forEach((node) => {
      node.expanded = true;
      if (node.children && node.children.length > 0) {
        this.expandTreeNodes(node.children);
      }
    });
  }

  getCompanyName(id: string) {
    return this.companies.find((cmp) => cmp._id === id).companyName;
  }

  private processShareholdings(
    selectedCompanyIds: string[],
    shareholdingsData: any[]
  ) {
    // Find the actual node objects in the tree structure that match these IDs
    const findSelectedNodes = (nodes: any[]): any[] => {
      if (!nodes) return [];

      let selected: any[] = [];
      for (const node of nodes) {
        if (selectedCompanyIds.includes(node._id)) {
          selected.push(node);
        }
        if (node.children && node.children.length) {
          selected = [...selected, ...findSelectedNodes(node.children)];
        }
      }
      return selected;
    };

    // Get the actual node objects from the tree
    const selectedNodes = findSelectedNodes(this.companies);
    this.selectedShareHoldings = selectedNodes;

    // Process after view is initialized to ensure treeselect is ready
    setTimeout(() => {
      if (this.treeselect) {
        // Expand all nodes to make selection visible
        this.expandTreeNodes(this.companies);

        // Set the value to the actual node objects from the tree
        this.treeselect.value = selectedNodes;
        this.treeselect.updateTreeState();
        this.treeselect.cd.markForCheck();
      }
    }, 100);

    // Add existing shareholding information
    shareholdingsData.forEach((holding: any) => {
      this.shareHoldings.push(
        this.fb.group({
          company: [holding.company],
          percentage: [
            holding.percentage,
            [Validators.required, Validators.min(0.1), Validators.max(100)],
          ],
        })
      );
    });
  }
}
