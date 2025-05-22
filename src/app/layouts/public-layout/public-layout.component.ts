import { Component, inject } from '@angular/core';
import { TopbarComponent } from "./topbar/topbar.component";
import { Router, RouterModule } from '@angular/router';
import { FooterComponent } from "./footer/footer.component";

@Component({
  selector: 'public-layout',
  imports: [TopbarComponent, RouterModule, FooterComponent],
  templateUrl: './public-layout.component.html',
  styleUrl: './public-layout.component.scss'
})
export class PublicLayoutComponent {
  router = inject(Router);

  ngOnInit() {
    this.router.events.subscribe((val) => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    });
  }

}
