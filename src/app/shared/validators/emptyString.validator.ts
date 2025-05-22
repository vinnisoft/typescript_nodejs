import { AbstractControl, ValidationErrors } from "@angular/forms";

export function emptySpaceValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value?.trim() === '') {
        return {
            emptySpace: true
        };
    }
    return null;
}