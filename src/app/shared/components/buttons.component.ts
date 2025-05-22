import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { LoaderService } from '../services/loader.service';

// Primary //
@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [ButtonModule, CommonModule],
  template: `
    <p-button
      [id]="id ? id : label"
      [label]="label"
      [type]="type"
      (click)="onClick.emit($event)"
      [disabled]="disabled"
      [icon]="icon"
      [iconPos]="iconPos"
      [variant]="variant"
      [size]="size"
      [severity]="severity"
      [styleClass]="'p-button text-sm md:text-base font-normal hover:shadow-5 font-medium border-round-lg ' + styleClass"
      [loading]="loading"
    ></p-button>
  `,
})
export class CustomButton {
  @Input() id!: string;
  @Input() type: string = 'button';
  @Input() variant: "outlined" | "text" | undefined = undefined;
  @Input() label: string = '';
  @Input() disabled: boolean = false;
  @Input() styleClass!: string;
  @Input() icon!: string;
  @Input() iconPos!: 'right' | 'top' | 'bottom';
  @Input() size: "small" | "large" | undefined = undefined;
  @Input() severity: "info" | "success" | "warn" | "danger" | "secondary" | "contrast" | "help" | "primary" = "primary"
  @Input() loading = false;

  @Output() onClick: EventEmitter<Event> = new EventEmitter<Event>();

}