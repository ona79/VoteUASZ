import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NavbarComponent } from './components/navbar/navbar.component';
import { NotificationContainerComponent } from './components/notification-container/notification-container.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    NotificationContainerComponent,
    LucideAngularModule
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-700 selection:text-white">
      <app-notification-container></app-notification-container>
      
      <!-- Masquer la barre de navigation uniquement sur la page de connexion -->
      <app-navbar *ngIf="!isLoginPage()"></app-navbar>

      <main [class]="isLoginPage() ? 'flex-grow' : 'flex-grow md:ml-56 pb-16 md:pb-0'">
        <router-outlet></router-outlet>
      </main>

      <footer [class]="isLoginPage() ? 'py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 z-10 relative' : 'py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500 z-10 relative md:ml-56'">
        <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 font-medium">
          <span>© 2026 Université Assane Seck de Ziguinchor (UASZ) — Tous droits réservés</span>
          <span class="text-emerald-800 font-extrabold flex items-center space-x-1.5">
            <lucide-icon name="lock" class="w-3.5 h-3.5 text-emerald-800 shrink-0"></lucide-icon>
            <span>Système Électoral Sécurisé UASZ</span>
          </span>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {
  title = 'VoteUASZ';
  authService = inject(AuthService);
  private router = inject(Router);

  isLoginPage(): boolean {
    return this.router.url.includes('/login');
  }
}
