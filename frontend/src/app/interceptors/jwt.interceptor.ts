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
      return throwError(() => error);
    })
  );
};
