import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/vote.models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn() && authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    if (authService.isLoggedIn()) {
      return router.createUrlTree(['/elections'], { queryParams: { error: 'unauthorized' } });
    }

    return router.createUrlTree(['/login'], { queryParams: { error: 'unauthorized' } });
  };
};
