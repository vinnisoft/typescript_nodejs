import { Routes } from '@angular/router';
import { HomeComponent } from '../../pages/public/home/home.component';
import { AboutUsComponent } from '../../pages/public/about-us/about-us.component';
import { OurBlogsComponent } from '../../pages/public/our-blogs/our-blogs.component';
import { BlogDetailsComponent } from '../../pages/public/blog-details/blog-details.component';
import { ContactUsComponent } from '../../pages/public/contact-us/contact-us.component';
import { PrivacyPolicyComponent } from '../../pages/public/privacy-policy/privacy-policy.component';
import { TermsOfServiceComponent } from '../../pages/public/terms-of-service/terms-of-service.component';

export const PUBLIC_ROUTES: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'home' },
    { path: 'home', component: HomeComponent },
    { path: 'about-us', component: AboutUsComponent },
    { path: 'our-blogs', component: OurBlogsComponent },
    { path: 'blog/:id', component: BlogDetailsComponent },
    { path: 'contact-us', component: ContactUsComponent },
    { path: 'privacy-policy', component: PrivacyPolicyComponent },
    { path: 'terms-of-service', component: TermsOfServiceComponent }
];
