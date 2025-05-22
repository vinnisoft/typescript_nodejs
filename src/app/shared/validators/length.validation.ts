import { AbstractControl, ValidatorFn } from '@angular/forms';

export function lengthValidator(minLength: number, maxLength: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value: string = String(control.value);
    if (value && value.length < minLength) {
      return { 'min': true };
    }
    if(value && value.length > maxLength) {
        return { 'max': true };
    }
    return null;
  };
}