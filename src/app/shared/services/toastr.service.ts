import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class ToastrService {

  constructor(private messageService: MessageService) { }

  showToast(severity: 'success' | 'info' | 'warn' | 'error',title: string = 'Success', message: string ) {
    this.messageService.add({ severity: severity, summary: title, detail: message });
  }
}
