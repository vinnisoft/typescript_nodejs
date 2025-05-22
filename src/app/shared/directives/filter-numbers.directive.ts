import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appFilterNumbers]',
  standalone: true,
})
export class FilterNumbersDirective {
  constructor() {}

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if ([46, 8, 9, 27, 13, 110, 190].indexOf(event.keyCode) !== -1 ||
        (event.keyCode === 65 && (event.ctrlKey || event.metaKey)) ||
        (event.keyCode === 67 && (event.ctrlKey || event.metaKey)) ||
        (event.keyCode === 86 && (event.ctrlKey || event.metaKey)) ||
        (event.keyCode >= 35 && event.keyCode <= 40)) {
          return;
    }
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) &&
        (event.keyCode < 96 || event.keyCode > 105)) {
      event.preventDefault();
    }
  }
}
