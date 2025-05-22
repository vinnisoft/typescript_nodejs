import { Component, inject } from '@angular/core';
import { FormBuilderService } from '../../../../shared/services/form-builder.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { InputTextModule } from 'primeng/inputtext';
import {
  CustomInputComponent,
  CustomCalendarComponent,
  CustomDropDownComponent,
} from '../../../../shared/components/inputs.component';
import { DndDraggableDirective, DndDropEvent, DndModule, DndHandleDirective, DndDropzoneDirective } from 'ngx-drag-drop';
import { DialogModule } from 'primeng/dialog';
import { CustomButton } from "../../../../shared/components/buttons.component";
import { RadioButtonModule } from 'primeng/radiobutton';
import { errorMessages } from '../../../../shared/validators/errorMessages';
import { emptySpaceValidator } from '../../../../shared/validators/emptyString.validator';
import { toCamelCase } from '../../../../shared/utils/misc';
import { ConfirmDialogService } from '../../../../shared/services/confirm-dialog.service';
import { TopbarService } from '../../../../shared/services/topbar.service';

@Component({
  selector: 'app-form-builder',
  imports: [
    CommonModule,
    FormsModule,
    InputIcon,
    IconField,
    InputTextModule,
    CustomInputComponent,
    CustomCalendarComponent,
    CustomDropDownComponent,
    DndModule,
    DndDraggableDirective,
    DndHandleDirective,
    DndDropzoneDirective,
    DialogModule,
    CustomButton,
    RadioButtonModule,
    ReactiveFormsModule
  ],
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.scss',
})
export class FormBuilderComponent {
  formBuilderService = inject(FormBuilderService);
  fb = inject(FormBuilder);
  topBarService = inject(TopbarService);

  confirmDialogService = inject(ConfirmDialogService);

  formBuilder: any[] = [];
  formDetails: any = {};
  formNameEditor = false;
  activeFormId = '';
  parentFields: any[] = [];
  regularFields: any[] = [];

  loading = false;
  showAddNewDialog = false;
  loadingStates!: { key: boolean }
  newFormFieldParentId!: string;
  showAddDocTypesModal = false;
  docTypeOptions: any;

  editingDocTypeIndex: number | null = null;
  editingDocTypeField: any = null;
  docTypesValidationMsg = '';

  fieldTypes: any[] = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
  ];

  newFieldForm: FormGroup = this.fb.group({
    name: ["", [Validators.required, emptySpaceValidator]],
    field: [""],
    type: ["", [Validators.required]],
    filter: [false],
    sortable: [false],
    filterType: [""],
    isActive: [true],
    isRequired: [false],
    isDefault: [false],
    order: [null],
  });

  errorMessages = errorMessages;

  ngOnInit() {
    this.topBarService.setHeading('Settings');
    this.getFormBuilder();
  }

  get controls(): { [key: string]: FormGroup } {
    return this.newFieldForm.controls as { [key: string]: FormGroup };
  }

  getFormBuilder() {
    this.loading = true;
    this.formBuilderService.getFormBuilder().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.formBuilder = result.data;
          this.activeFormId = this.formBuilder[0]._id;
          this.getFormDetails();
        }
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
      },

    });
  }

  onClickForm(id: string) {
    this.activeFormId = id;
    this.getFormDetails();
  }

  getFormDetails() {
    this.formBuilderService.getFormDetails(this.activeFormId).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.formDetails = result.data;
          this.parentFields = this.formDetails.fields.filter((field: any) =>
            field.type === 'parent' && field.children?.length > 0
          );
          this.regularFields = this.formDetails.fields.filter((field: any) =>
            field.type !== 'parent'
          );
        }
      },
      error: (err: any) => {
        console.log(err)
      },

    });
  }

  onDrop(event: DndDropEvent, targetOrder: number, parentId?: string) {
    if (event.dropEffect === 'move') {
      if (parentId) {
        const parentField = this.parentFields.find(p => p._id === parentId);
        if (parentField && parentField.children) {
          const draggedOrder = event.data.order;
          parentField.children.forEach(item => {
            if (draggedOrder < targetOrder) {
              if (item.order > draggedOrder && item.order <= targetOrder) {
                item.order--;
              } else if (item._id === event.data._id) {
                item.order = targetOrder;
              }
            } else if (draggedOrder > targetOrder) {
              if (item.order >= targetOrder && item.order < draggedOrder) {
                item.order++;
              } else if (item._id === event.data._id) {
                item.order = targetOrder;
              }
            }
          });
        }
      }
      else {
        const fields = this.regularFields;
        const draggedOrder = event.data.order;

        fields.forEach(item => {
          if (draggedOrder < targetOrder) {
            if (item.order > draggedOrder && item.order <= targetOrder) {
              item.order--;
            } else if (item._id === event.data._id) {
              item.order = targetOrder;
            }
          } else if (draggedOrder > targetOrder) {
            if (item.order >= targetOrder && item.order < draggedOrder) {
              item.order++;
            } else if (item._id === event.data._id) {
              item.order = targetOrder;
            }
          }
        });
      }

      this.formDetails.fields = [...this.parentFields, ...this.regularFields];
      this.saveFormFields();
    }
  }

  saveFormFields() {
    this.formBuilderService.updateForm(this.activeFormId, { ...this.formDetails }).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.showAddDocTypesModal = false;
          this.getFormDetails();
        }
      },
      error: (err: any) => {
        console.log(err);
      }
    });
  }

  onAddNewField() {
    if (this.newFieldForm.invalid) {
      this.newFieldForm.markAllAsTouched();
      return;
    } else {
      const newField = {
        ...this.newFieldForm.value,
        field: toCamelCase(this.newFieldForm.value.name),
        order: this.formDetails.fields.length + 1
      }
      if (this.newFormFieldParentId) {
        const parentField = this.parentFields.find(p => p._id === this.newFormFieldParentId);
        if (parentField) {
          newField.field = toCamelCase(parentField.childPrefix + "-" + this.newFieldForm.value.name)
          parentField.children.push(newField);
        }
      } else {
        this.regularFields.push(newField);
      }
      this.formDetails.fields = [...this.parentFields, ...this.regularFields];
      this.saveFormFields();
      this.hideAddNewFieldDialog();
    }
  }

  editDocTypeOption(field: any, index: number, item: string) {
    // Set the current option to edit
    this.docTypeOptions = item;
    this.editingDocTypeIndex = index;
    this.editingDocTypeField = field;
    this.showAddDocTypesModal = true;
  }

  updateDocTypeOption() {
    if (this.docTypeOptions && this.docTypeOptions.trim() && this.editingDocTypeField && this.editingDocTypeIndex !== null) {
      this.editingDocTypeField.options[this.editingDocTypeIndex] = this.docTypeOptions.trim();

      this.saveFormFields();

      this.resetDocTypeEditing();
    }
  }

  deleteDocTypeOption(field: any, index: number) {
    if (field && field.options && index >= 0 && index < field.options.length) {
      field.options.splice(index, 1);

      this.saveFormFields();
    }
  }

  resetDocTypeEditing() {
    this.docTypeOptions = '';
    this.editingDocTypeIndex = null;
    this.editingDocTypeField = null;
    this.showAddDocTypesModal = false;
  }

  hideDocTypesDialog() {
    this.resetDocTypeEditing();
  }

  onAddDocTypeOptions() {
    if (this.editingDocTypeIndex !== null && this.editingDocTypeField) {
      this.updateDocTypeOption();
    } else {
      if (this.docTypeOptions) {
        this.formDetails.fields.map((f: any) => {
          if (f.field === 'docType') {
            const newOptions = this.docTypeOptions.split(',').map((item: string) => item.trim()).filter((item: any) => item);
            f.options = f.options ? [...f.options, ...newOptions] : newOptions;
          }
          return f;
        });
        this.saveFormFields();
        this.resetDocTypeEditing();
      }
      return;
    }
  }

  onEnterDocTypes() {
    if (!this.docTypeOptions) {
      this.docTypesValidationMsg = 'Please type a value to continue.';
    } else {
      this.docTypesValidationMsg = '';
    }
  }

  hideAddNewFieldDialog() {
    this.newFieldForm.reset();
    this.newFormFieldParentId = "";
    this.showAddNewDialog = false;
  }

  deleteField(fieldId: string) {
    this.formBuilderService.deleteFormField(this.activeFormId, { fieldId }).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.getFormDetails();
        }
      },
      error: (err: any) => {
        console.log(err);
      }
    });
    this.regularFields = this.regularFields.filter(field => field._id !== fieldId);
    this.formDetails.fields = [...this.parentFields, ...this.regularFields];
  }

  deleteFieldChild(fieldId: string, childId: string) {
    this.formBuilderService.deleteFormFieldChild(this.activeFormId, { fieldId, childId }).subscribe({
      next: (result: any) => {
        if (result.success) {
          this.getFormDetails();
        }
      },
      error: (err: any) => {
        console.log(err);
      }
    });
    this.regularFields = this.regularFields.filter(field => field._id !== fieldId);
    this.formDetails.fields = [...this.parentFields, ...this.regularFields];
  }

  onClickDelete(id: string, childId?: string) {
    this.confirmDialogService.confirm({
      message: 'Are you sure you want to delete this item?'
    }).subscribe(confirmed => {
      if (confirmed) {
        if (childId) {
          this.deleteFieldChild(id, childId);
        } else {
          this.deleteField(id);
        }
      }
    });
  }
}
