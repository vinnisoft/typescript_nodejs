import { Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { CustomButton } from "../../../shared/components/buttons.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  imports: [ButtonModule, RouterModule, CustomButton, CommonModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  routerLinkActiveOptions = { exact: true };
  menuOpen: boolean = false;

  navLinks = [
    { path: '/home', label: 'Home' },
    { path: '/about-us', label: 'About Us' },
    {
      path: '/home', label: 'Pricing',
      queryParams: { scrollTo: 'pricing' }
    },
    { path: '/our-blogs', label: 'Blogs' },
    { path: '/contact-us', label: 'Contact Us' }
  ];

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  trackByFn(index: number) {
    return index;
  }
}
