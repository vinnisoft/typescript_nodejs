import { Injectable } from '@angular/core';
import { PlatformService } from './platform.service';

@Injectable({
  providedIn: 'root'
})

export class BrowserStorageService {

  constructor(private platformService: PlatformService) { }

  getStorage(storageType: 'local' | 'session') {
    return storageType === 'local' ? localStorage : sessionStorage;
  };

  setItem(storageType: 'local' | 'session' = 'local', key: string, value: string): void {
    if (this.platformService.isBrowser()) {
      this.getStorage(storageType).setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.platformService.isBrowser()) {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    }
    return null;
  }

  removeItem(storageType: 'local' | 'session', key: string): void {
    if (this.platformService.isBrowser()) {
      this.getStorage(storageType).removeItem(key);
    }
  }

  clearStorage() {
    if (this.platformService.isBrowser()) {
      localStorage.clear();
      sessionStorage.clear();
    }
  }
}
