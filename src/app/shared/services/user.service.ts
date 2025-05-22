import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_TOAST } from '../interceptors/auth.interceptor';
import { toFormData } from '../utils/misc';
import { CookieService } from './cookie.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  baseUrl = `${environment.BASE_URL}`;
  private userPrivilegesSignal = signal<any | null>(null);
  private userRoleSignal = signal<string | null>(null);
  userPrivileges = this.userPrivilegesSignal.asReadonly();
  userRole = this.userRoleSignal.asReadonly();
  context = new HttpContext().set(SKIP_TOAST, true);

  constructor(private http: HttpClient, private cookieService: CookieService) { }

  get isUserLoggedIn() {
    return this.cookieService.getCookie('token') ? true : false;
  }

  addUser(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/users/add`, { ...payload })
  }

  async getUserRole() {
    if (this.isUserLoggedIn) {
      this.http
        .get(`${this.baseUrl}/users/role`, { context: this.context }).subscribe({
          next: (result: any) => {
            if (result.success) {
              this.userRoleSignal.set(result.data.role);
            }
          }
        });
    }
  }

  async getUserPrvileges(companyId: string) {
    if (this.isUserLoggedIn) {
      this.http
        .get(`${this.baseUrl}/users/privileges/${companyId}`, { context: this.context }).subscribe({
          next: (result: any) => {
            if (result.success) {
              this.userPrivilegesSignal.set(result.data);
            }
          }
        });
    }
  }

  getUsersList(queryParams: any): Observable<any> {
    let params = new HttpParams();
    for (let key in queryParams) {
      if (queryParams[key]) {
        if (key === 'filterData') params = params.set(key, JSON.stringify(queryParams[key]));
        else params = params.set(key, queryParams[key]);
      }
    }
    return this.http
      .get(`${this.baseUrl}/users/list`, { context: this.context, params })
  }

  getUserDetails(id: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/users/details/${id}`, { context: this.context })
  }

  updateUserDetails(id: string, payload: any): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/users/update/${id}`, payload)
  }

  updateUserProfile(payload: any, userRole: string): Observable<any> {
    const formData = toFormData(payload);
    return this.http
      .put(`${this.baseUrl}/users/update-profile/${userRole === 'admin' ? 'admin' : 'user'}`, formData)
  }

  updateUserActivation(payload: { id: string, isActive: boolean }): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/users/update-status/${payload.id}`, { isActive: payload.isActive })
  }

  deleteUser(id: string): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/users/delete/${id}`, {})
  }

  validateBulkUpload(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/users/validate-bulk-upload`, payload, { context: this.context })
  }

  bulkUpload(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/users/bulk-upload`, payload)
  }

}
