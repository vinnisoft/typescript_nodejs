import { Component, inject, OnInit } from '@angular/core';
import { CustomButton } from '../../../shared/components/buttons.component';
import { CommonModule } from '@angular/common';
import { CarouselModule } from 'primeng/carousel';
import { AvatarModule } from 'primeng/avatar';
import { AccordionModule } from 'primeng/accordion';
import { PartnersSection } from '../../../shared/components/partners-section.component';
import { ManagementChart } from '../../../shared/components/management-chart.component';
import { CustomertestimonialSection } from '../../../shared/components/customer-testimonial.component';
import { ActivatedRoute, Params, RouterModule } from '@angular/router';
import { ContentManagementService } from '../../../shared/services/content-management.service';
import { PlansService } from '../../../shared/services/plans.service';

@Component({
  selector: 'app-home',
  imports: [
    CustomButton,
    CommonModule,
    CarouselModule,
    AvatarModule,
    AccordionModule,
    ManagementChart,
    CustomertestimonialSection,
    RouterModule,
    PartnersSection,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  route = inject(ActivatedRoute);
  contentService = inject(ContentManagementService);
  planService = inject(PlansService);

  pricingPlans: any[] = [];
  // Landing page content sections
  landingPageContent: any = {
    hero: {
      title: 'Streamline Financial Operations Across Every Entity',
      subtitle:
        'Empower CFOs, SVPs of Finance, Financial Controllers, and Accountants to simplify complex processes, enhance compliance, and gain real-time insights for multi-entity corporations.',
      buttonText: 'Get Started Today',
      buttonLink: '/account/login',
    },
    features: {
      title: 'Discover the Best Entity Management for your Organization.',
      subtitle: '',
      description: '',
      image: '',
    },
    entityManagement: {
      title: 'Entity Management Made Simple with NUMBERDOX Help',
      description:
        "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged.",
      features: [{ value: '12000', label: 'Trusted Clients' }],
    },
    pricing: {
      title: 'Simple & Affordable Pricing Plans',
    },
    security: {
      title: 'Secure Access to Data for your Teams',
      features: [],
    },
    testimonials: {
      title: 'Customer Testimonial',
      items: [],
    },
    faq: {
      title: 'Frequently Asked Questions',
      items: [],
    },
  };

  secureAccess = [
    {
      title: 'Unlimited Users',
      description:
        'Security testing is a type of software testing that is focused on determining if an information.',
      icon: '/assets/icons/users.svg',
      active: true, // Add active to highlight specific card
    },
    {
      title: 'Secure',
      description:
        'Security testing is a type of software testing that is focused on determining if an information.',
      icon: '/assets/icons/secure.svg',
      active: false,
    },
    {
      title: 'Access Controls',
      description:
        'Security testing is a type of software testing that is focused on determining if an information.',
      icon: '/assets/icons/control.svg',
      active: false,
    },
    {
      title: 'Support',
      description:
        'Security testing is a type of software testing that is focused on determining if an information.',
      icon: '/assets/icons/support.svg',
      active: false,
    },
  ];

  testimonials = [
    {
      name: 'Ashley Cooper',
      text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      image: '/assets/testimonial.png',
    },
    {
      name: 'Jackline Fare',
      text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      image: '/assets/testimonial.png',
    },
    {
      name: 'John William',
      text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      image: '/assets/testimonial.png',
    },
    {
      name: 'Mary Jane',
      text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      image: '/assets/testimonial.png',
    },
    {
      name: 'Chris Evans',
      text: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      image: '/assets/testimonial.png',
    },
  ];

  responsiveOptions = [
    {
      breakpoint: '1024px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '768px',
      numVisible: 2,
      numScroll: 1,
    },
    {
      breakpoint: '560px',
      numVisible: 1,
      numScroll: 1,
    },
  ];
  scrollTo = '';

  ngOnInit() {
    // Fetch dynamic content from backend
    this.fetchLandingPageContent();
    this.getAllPlans();
    this.route.queryParams.subscribe((queryParams: Params) => {
      const scrollTo = queryParams['scrollTo'];
      console.log(this.scrollTo, scrollTo);
      if (scrollTo !== this.scrollTo) {
        setTimeout(() => {
          this.scrollTo = scrollTo;
          document.getElementById(scrollTo)?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }, 200);
      }
    });
  }

  getAllPlans() {
    this.planService.getAllPlans().subscribe({
      next: (result: any) => {
        if (result.success) {
          this.pricingPlans = result.data;
        }
      },
      error: (err: any) => {
        console.error('Error fetching plans:', err);
      },
    });
  }

  fetchLandingPageContent() {
    this.contentService.getLandingPageContent().subscribe({
      next: (result: any) => {
        if (result.success && result.data?.landingPageContent) {
          // Update the landing page content with data from backend
          this.landingPageContent = result.data.landingPageContent;
          // Update specific sections if they exist in the response
          if (
            this.landingPageContent.pricing?.plans &&
            this.landingPageContent.pricing.plans.length > 0
          ) {
            // this.pricingPlans = this.landingPageContent.pricing.plans;
          }

          if (
            this.landingPageContent.security?.features &&
            this.landingPageContent.security.features.length > 0
          ) {
            this.secureAccess = this.landingPageContent.security.features;
          }

          if (
            this.landingPageContent.testimonials?.items &&
            this.landingPageContent.testimonials.items.length > 0
          ) {
            this.testimonials = this.landingPageContent.testimonials.items;
          }
        }
      },
      error: (err: any) => {
        console.error('Error fetching landing page content:', err);
      },
    });
  }
}
