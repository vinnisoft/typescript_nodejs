import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ToastrService } from '../services/toastr.service';
import { LoaderService } from '../services/loader.service';
import { AuthService } from '../services/auth.service';
import { CookieService } from '../services/cookie.service';
export const SKIP_TOAST = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const router = inject(Router);
  const loaderService = inject(LoaderService);
  const authService = inject(AuthService);
  const cookieService = inject(CookieService);

  loaderService.showLoader();
  const token = authService.token;

  let cloned: HttpRequest<unknown>;

  if (token) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    cloned = req.clone({
      setHeaders: {
        authorization: `Bearer ${token}`,
        timezone
      },
    });
  } else {
    cloned = req;
  }

  return next(cloned).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          if (event.status >= 200 && event.status < 300) {
            loaderService.hideLoader();
            const successMessage = event.body?.['message'];
            if (successMessage && !cloned.context.get(SKIP_TOAST)) {
              return toastr.showToast('success', 'Success', successMessage);
            }
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        loaderService.hideLoader();
        const error = err.error;
        const errorMessage = error?.message || 'An unexpected error occurred';
        if (errorMessage && !cloned.context.get(SKIP_TOAST) && error.message !== 'Invalid password.') {
          toastr.showToast(err.status === 401 || err.status === 403 ? 'warn' : 'error', 'Error', errorMessage);
        }
        if (err.status === 401) {
          cookieService.deleteCookie('token');
          router.navigate(['account/login']);
        }
        throw error;
      }
    })
  );
};

