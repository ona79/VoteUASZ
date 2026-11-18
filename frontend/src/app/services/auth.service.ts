import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthResponse, Role } from '../models/vote.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api/v1/auth';
  currentUser = signal<AuthResponse | null>(this.getStoredUser());

  constructor(private http: HttpClient) {}

  login(matricule: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { matriculeOrEmail: matricule, password }).pipe(
      tap(response => {
        localStorage.setItem('voteuasz_token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('voteuasz_refresh_token', response.refreshToken);
        }
        localStorage.setItem('voteuasz_user', JSON.stringify(response));
        this.currentUser.set(response);
      }),
      catchError((err: HttpErrorResponse) => {
        // Erreur réseau ou serveur arrêté (offline / backend non démarré)
        if (err.status === 0) {
          return throwError(() => ({
            isOffline: true,
            error: { message: 'Le serveur backend est actuellement indisponible (hors ligne ou en maintenance).' }
          }));
        }
        // Mauvais identifiants ou compte désactivé (401)
        if (err.status === 401) {
          return throwError(() => ({
            error: { message: err.error?.message || 'Matricule ou mot de passe incorrect.' }
          }));
        }
        // Accès refusé (403)
        if (err.status === 403) {
          return throwError(() => ({
            error: { message: 'Accès refusé pour ce compte.' }
          }));
        }
        // Erreur serveur (500)
        if (err.status >= 500) {
          return throwError(() => ({
            error: { message: 'Le serveur rencontre un problème. Veuillez réessayer dans quelques instants.' }
          }));
        }
        // Autre erreur
        return throwError(() => ({
          error: { message: err.error?.message || 'Une erreur inattendue est survenue.' }
        }));
      })
    );
  }

  forgotPassword(identifier: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { identifier });
  }

  resetPassword(identifier: string, code: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { identifier, code, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, { currentPassword, newPassword }).pipe(
      tap(() => {
        const current = this.currentUser();
        if (current) {
          const updated: AuthResponse = { ...current, mustChangePassword: false };
          localStorage.setItem('voteuasz_user', JSON.stringify(updated));
          this.currentUser.set(updated);
        }
      })
    );
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('voteuasz_refresh_token');
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap(response => {
        localStorage.setItem('voteuasz_token', response.token);
        if (response.refreshToken) {
          localStorage.setItem('voteuasz_refresh_token', response.refreshToken);
        }
        localStorage.setItem('voteuasz_user', JSON.stringify(response));
        this.currentUser.set(response);
      })
    );
  }

  logout(): void {
    const refreshToken = localStorage.getItem('voteuasz_refresh_token');
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    localStorage.removeItem('voteuasz_token');
    localStorage.removeItem('voteuasz_refresh_token');
    localStorage.removeItem('voteuasz_user');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('voteuasz_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
  }

  mustChangePassword(): boolean {
    return !!this.currentUser()?.mustChangePassword;
  }

  hasRole(role: Role): boolean {
    const user = this.currentUser();
    return user ? user.role === role : false;
  }

  hasAnyRole(roles: Role[]): boolean {
    const user = this.currentUser();
    return user ? roles.includes(user.role) : false;
  }

  private getStoredUser(): AuthResponse | null {
    const stored = localStorage.getItem('voteuasz_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}
