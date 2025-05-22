import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopbarService {
  private topbarSignal = signal<any | null>(null);

  constructor() { }

  setHeading(heading: string | any) {
    this.topbarSignal.set(heading);
  }

  get heading() {
    return this.topbarSignal.asReadonly();
  }
}
