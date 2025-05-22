import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loadingCounter = 0;
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoading.asObservable();

  showLoader() {
    this.loadingCounter++;
    if (this.loadingCounter > 0) {
      this.isLoading.next(true);
    }
  }

  hideLoader() {
    this.loadingCounter--;
    if (this.loadingCounter <= 0) {
      this.loadingCounter = 0;
      this.isLoading.next(false);
    }
  }
}
