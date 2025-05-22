import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DividerModule } from 'primeng/divider';

@Component({
  selector: 'app-footer',
  imports: [RouterModule, DividerModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})

export class FooterComponent {
  
  routerLinkActiveOptions = { exact: true };

  companyLinks = [
    { path: '/home', label: 'Home' },
    { path: '/about-us', label: 'About Us' },
    { path: '/home', label: 'Pricing',queryParams: { scrollTo: 'pricing' } },
    { path: '/our-blogs', label: 'Our Blogs' }
  ];

  supportLinks = [
    { path: '/contact-us', label: 'Contact Us' },
    { path: '/terms-of-service', label: 'Terms of service' },
    { path: '/privacy-policy', label: 'Privacy policy' }
  ];
  // toggleMenu() {
  //   this.menuOpen = !this.menuOpen;
  // }

  trackByFn(index: number) {
    return index;
  }
}
