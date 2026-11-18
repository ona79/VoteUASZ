import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="h-12 bg-gradient-to-r from-[#047857] to-[#065f46] text-white border-b border-emerald-800/40 shadow-sm sticky top-0 z-30">
      <div class="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-3">
        <!-- Titre à gauche -->
        <div class="flex items-center space-x-2.5 min-w-0">
          <img src="assets/logo_vote_uasz.webp" alt="VoteUASZ" class="w-5 h-5 object-contain rounded bg-white p-0.5 shrink-0" />
          <h1 class="text-sm sm:text-base font-black tracking-tight text-white truncate">{{ title }}</h1>
        </div>

        <!-- Nom utilisateur + slot actions à droite -->
        <div class="flex items-center space-x-2.5 shrink-0">
          <span *ngIf="authService.currentUser() as user"
                class="hidden sm:inline-flex items-center text-xs font-semibold text-emerald-50">
            {{ user.prenom }} {{ user.nom }}
          </span>
          <ng-content></ng-content>
        </div>
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  @Input() title = '';
  authService = inject(AuthService);
}
