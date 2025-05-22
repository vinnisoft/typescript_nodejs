import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

export function handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(error.message || 'Server Error'));
}