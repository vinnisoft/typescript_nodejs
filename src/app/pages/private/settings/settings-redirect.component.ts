import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  template: '',
  standalone: true,
})
export class SettingsRedirectComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    const user = this.authService.user;
    const currentUrl = this.router.url;

    if (user()?.role === 'admin') {
      if (currentUrl !== '/settings/form-builder') {
        this.router.navigate(['/settings/form-builder']);
      }
    } else {
      if (currentUrl !== '/settings/my-profile') {
        this.router.navigate(['/settings/my-profile']);
      }
    }
  }
}
