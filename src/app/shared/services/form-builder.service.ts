import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_TOAST } from '../interceptors/auth.interceptor';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormBuilderService {
  baseUrl = `${environment.BASE_URL}`;
  context = new HttpContext().set(SKIP_TOAST, true);

  constructor(private http: HttpClient) { }

  getFormBuilderByCompanyId(companyId: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/form-builder/company/${companyId}`, { context: this.context })
  }

  getFormBuilder(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/form-builder`, { context: this.context })
  }

  getFormDetails(id: string): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/form-builder/${id}`, { context: this.context })
  }

  updateForm(id: string, payload: any): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/form-builder/${id}`, payload, { context: this.context })
  }

  deleteFormField(id: string, payload: any): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/form-builder/field/delete/${id}`, payload, { context: this.context })
  }

  deleteFormFieldChild(id: string, payload: any): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/form-builder/field/delete-child/${id}`, payload, { context: this.context })
  }
}
