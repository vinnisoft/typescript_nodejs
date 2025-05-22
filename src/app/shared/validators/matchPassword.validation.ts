import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): { [key: string]: boolean } | null => {
  const password = control.get('password') || control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (
    !password ||
    !confirmPassword ||
    password.value !== confirmPassword.value
  ) {
    return { passwordMismatch: true };
  }

  return null;
};
