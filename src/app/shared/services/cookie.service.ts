import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PlatformService } from './platform.service';

@Injectable({
    providedIn: 'root'
})
export class CookieService {
    constructor(private platFormService: PlatformService) { }

    setCookie(name: string, value: string, days?: number): void {
        if (!this.platFormService.isBrowser()) return;

        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }

        const sameSite = '; SameSite=Strict';
        const secure = location.protocol === 'https:' ? '; Secure' : '';

        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + sameSite + secure;
    }

    getCookie(name: string): string | null {
        if (!this.platFormService.isBrowser()) return null;

        const nameEQ = name + '=';
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    deleteCookie(name: string): void {
        if (!this.platFormService.isBrowser()) return;

        const sameSite = '; SameSite=Strict';
        const secure = location.protocol === 'https:' ? '; Secure' : '';

        document.cookie = name + '=; Max-Age=-99999999; path=/' + sameSite + secure;
    }
}