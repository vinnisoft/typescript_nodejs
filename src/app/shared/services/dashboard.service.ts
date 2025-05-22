import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_TOAST } from '../interceptors/auth.interceptor';
import { catchError, Observable } from 'rxjs';
import { handleError } from '../utils/error-handler';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  baseUrl = `${environment.BASE_URL}`;
  context = new HttpContext().set(SKIP_TOAST, true);

  constructor(private http: HttpClient) { }

  getAnalytics(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/dashboard/analytics`, { context: this.context })
      .pipe(catchError(handleError));
  }
}
