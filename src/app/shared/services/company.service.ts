import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { SKIP_TOAST } from '../interceptors/auth.interceptor';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  baseUrl = `${environment.BASE_URL}`;
  context = new HttpContext().set(SKIP_TOAST, true);

  constructor(private http: HttpClient) { }

  getCompanyFormFields(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/company/form-fields`, { context: this.context })
  }

  addCompany(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/company/add`, { ...payload })
  }

  validateBulkUpload(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/company/validate-bulk-upload`, payload, { context: this.context })
  }

  bulkUpload(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/company/bulk-upload`, payload)
  }

  getLoggedInUserParentCompany(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/company/parent-company`, { context: this.context })
  }

  getLoggedInUserCompanies(list = false, queryParams?: any, companyId?: string, includeShareholdings = false): Observable<any> {
    let params = new HttpParams();
    if (queryParams) {
      for (let key in queryParams) {
        if (queryParams[key]) {
          if (key === 'filterData') params = params.set(key, JSON.stringify(queryParams[key]));
          else params = params.set(key, queryParams[key]);
        }
      }
    }
    if (includeShareholdings) {
      params = params.set('includeShareholdings', true);
    }
    if (companyId) {
      params = params.set('companyId', companyId);
    }
    return this.http
      .get(`${this.baseUrl}/company/user-companies${list ? '-list' : ''}`, { context: this.context, params })
  }

  getLoggedInUserStateLevelCompanies(companyId?: string): Observable<any> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId);
    }
    return this.http
      .get(`${this.baseUrl}/company/state-companies`, { params, context: this.context })
  }

  getCompanyDetails(id: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/company/details/${id}`, { context: this.context })
  }

  updateCompanyDetails(id: string, payload: any): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/company/update/${id}`, payload)
  }

  deleteCompany(id: string): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/company/delete/${id}`, {})
  }

}
