import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
        localStorage.setItem('voteuasz_user', JSON.stringify(response));
        this.currentUser.set(response);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('voteuasz_token');
    localStorage.removeItem('voteuasz_user');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem('voteuasz_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUser();
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
