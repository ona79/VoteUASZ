import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const token = localStorage.getItem('voteuasz_token');

  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 : Session expirée ou jeton JWT invalide
      if (error.status === 401) {
        localStorage.removeItem('voteuasz_token');
        localStorage.removeItem('voteuasz_user');
        if (!router.url.includes('/login')) {
          notificationService.showWarning('Votre session a expiré. Veuillez vous reconnecter.', 'Session Expirée');
          router.navigate(['/login']);
        }
      }
      // 403 PASSWORD_CHANGE_REQUIRED : Changement de mot de passe obligatoire
      if (error.status === 403 && error.error?.code === 'PASSWORD_CHANGE_REQUIRED') {
        const storedUser = localStorage.getItem('voteuasz_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.mustChangePassword = true;
            localStorage.setItem('voteuasz_user', JSON.stringify(parsed));
          } catch {}
        }
        if (!router.url.includes('/change-password')) {
          notificationService.showWarning('Veuillez modifier votre mot de passe avant de continuer.', 'Changement Requis');
          router.navigate(['/change-password']);
        }
      }
      return throwError(() => error);
    })
  );
};
