import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { USER_ROLES } from '../../../server/models/enums/user.enums';

export const roleGuard: CanActivateFn = async (route) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const allowedRoles = (route.data['roles'] as Array<keyof typeof USER_ROLES>)
        .filter(role => role !== USER_ROLES.SUPER_ADMIN);
    
    // First check if user is already in the signal
    let user = authService.profile;
    
    // If not available, try to fetch it
    if (!user && authService.isUserLoggedIn) {
        user = await authService.getUserProfile();
    }
    
    if (user && allowedRoles.includes(user.role)) {
        return true;
    }

    router.navigate(['./']);
    return false;
};