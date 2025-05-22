import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SKIP_TOAST } from '../interceptors/auth.interceptor';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  baseUrl = `${environment.BASE_URL}`;

  constructor(private http: HttpClient) { }

  addTemplate(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/templates/add`, { ...payload })
  }

  getTemplates(): Observable<any> {
    const context = new HttpContext().set(SKIP_TOAST, true);
    return this.http
      .get(`${this.baseUrl}/templates/list`, { context })
  }
}
