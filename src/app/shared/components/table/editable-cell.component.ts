import { Component, Input, forwardRef } from '@angular/core';
import {
  ControlValueAccessor,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import {
  CustomInputComponent,
  CustomDropDownComponent,
  CustomCalendarComponent, // Add this import
} from '../inputs.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editable-cell',
  standalone: true,
  imports: [
    CommonModule,
    CustomInputComponent,
    FormsModule,
    CustomDropDownComponent,
    CustomCalendarComponent,
  ],
  template: `
    <div [ngSwitch]="type">
      <app-custom-input
        [placeholder]="placeholder"
        *ngSwitchCase="'text'"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        type="text"
      />
      <app-custom-calendar
        [placeholder]="placeholder"
        *ngSwitchCase="'date'"
        [ngModel]="value"
        (ngModelChange)="onValueChange($event)"
        appendTo="body"
      />
      <app-custom-dropdown
        [placeholder]="placeholder"
        *ngSwitchCase="'dropdown'"
        [ngModel]="value"
        [options]="options"
        (ngModelChange)="onValueChange($event)"
      />
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EditableCellComponent),
      multi: true,
    },
  ],
})
export class EditableCellComponent implements ControlValueAccessor {
  @Input() placeholder!: string;
  @Input() type: 'text' | 'date' | 'dropdown' = 'text';
  @Input() options: any[] = [];

  value: any;
  disabled: boolean = false;
  onChange = (_: any) => {};
  onTouch = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onValueChange(value: any): void {
    this.value = value;
    this.onChange(value);
    this.onTouch();
  }
}
