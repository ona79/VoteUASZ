import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  template: `
    <!-- DESKTOP SIDEBAR COMPACT (~52px, icônes + tooltip au survol) -->
    <aside class="uasz-sidebar-desktop flex flex-col items-center h-full bg-white border-r border-slate-200 shadow-sm fixed left-0 top-0 z-40 hidden md:flex">
      <!-- Logo -->
      <div class="h-12 w-full flex items-center justify-center border-b border-slate-100 shrink-0">
        <a routerLink="/" title="VoteUASZ — Accueil" class="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden hover:border-[#047857] transition">
          <img src="assets/logo_vote_uasz.webp" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
        </a>
      </div>

      <!-- Navigation Links (icônes seules + tooltip au survol) -->
      <div class="flex-1 w-full flex flex-col items-center py-3 space-y-2">
        <a routerLink="/elections" routerLinkActive="bg-emerald-50 text-[#047857] border-emerald-200"
           title="Élections"
           class="group relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-[#047857] hover:bg-emerald-50/70 transition border border-transparent">
          <lucide-icon name="vote" class="w-4 h-4 shrink-0"></lucide-icon>
          <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
            Élections
          </span>
        </a>

        <ng-container *ngIf="authService.isLoggedIn()">
          <a *ngIf="authService.hasRole('SUPER_ADMIN')" routerLink="/admin"
             routerLinkActive="bg-emerald-50 text-[#047857] border-emerald-200"
             title="Super-Admin"
             class="group relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-[#047857] hover:bg-emerald-50/70 transition border border-transparent">
            <lucide-icon name="shield" class="w-4 h-4 shrink-0"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Super-Admin
            </span>
          </a>

          <a *ngIf="authService.hasRole('COMMISSION_ELECTORALE')" routerLink="/commission"
             routerLinkActive="bg-emerald-50 text-[#047857] border-emerald-200"
             title="Commission"
             class="group relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-[#047857] hover:bg-emerald-50/70 transition border border-transparent">
            <lucide-icon name="landmark" class="w-4 h-4 shrink-0"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Commission
            </span>
          </a>

          <a *ngIf="authService.hasRole('CANDIDAT')" routerLink="/candidat"
             routerLinkActive="bg-emerald-50 text-[#047857] border-emerald-200"
             title="Espace Candidat"
             class="group relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-[#047857] hover:bg-emerald-50/70 transition border border-transparent">
            <lucide-icon name="megaphone" class="w-4 h-4 shrink-0"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Espace Candidat
            </span>
          </a>

          <a *ngIf="authService.hasRole('ELECTEUR') || authService.hasRole('CANDIDAT') || authService.hasRole('SUPER_ADMIN') || authService.hasRole('COMMISSION_ELECTORALE')"
             routerLink="/reclamations"
             routerLinkActive="bg-emerald-50 text-[#047857] border-emerald-200"
             title="Réclamations"
             class="group relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-[#047857] hover:bg-emerald-50/70 transition border border-transparent">
            <lucide-icon name="alert-triangle" class="w-4 h-4 shrink-0 text-amber-600"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Réclamations
            </span>
          </a>
        </ng-container>
      </div>

      <!-- User Profile / Login / Logout (Bottom) -->
      <div class="w-full py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col items-center space-y-2">
        <ng-container *ngIf="authService.currentUser() as user; else loginBtnDesk">
          <div [title]="user.prenom + ' ' + user.nom + ' (' + user.role + ')'"
               class="group relative w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-[#047857] flex items-center justify-center text-[11px] font-black cursor-default">
            {{ user.prenom.charAt(0) }}{{ user.nom.charAt(0) }}
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              {{ user.prenom }} {{ user.nom }} ({{ user.role }})
            </span>
          </div>
          <button (click)="logout()" title="Déconnexion"
                  class="group relative w-9 h-9 rounded-xl text-[#dc2626] bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center justify-center">
            <lucide-icon name="log-out" class="w-4 h-4 shrink-0"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Déconnexion
            </span>
          </button>
        </ng-container>
        <ng-template #loginBtnDesk>
          <a routerLink="/login" title="Se Connecter"
             class="group relative w-9 h-9 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white flex items-center justify-center transition shadow-sm">
            <lucide-icon name="log-in" class="w-4 h-4 shrink-0"></lucide-icon>
            <span class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute left-full ml-2.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-50">
              Se Connecter
            </span>
          </a>
        </ng-template>
      </div>
    </aside>

    <!-- MOBILE BOTTOM TAB BAR (hidden on md) -->
    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-50 px-2 pb-safe pt-1.5">
      <div class="flex items-center justify-around">
        <a routerLink="/elections" routerLinkActive="text-[#047857]" [routerLinkActiveOptions]="{exact: true}"
           class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
          <lucide-icon name="vote" class="w-5 h-5 mb-0.5"></lucide-icon>
          <span class="text-[9px] font-bold">Élections</span>
        </a>

        <a *ngIf="authService.hasRole('SUPER_ADMIN')" routerLink="/admin" routerLinkActive="text-[#047857]"
           class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
          <lucide-icon name="shield" class="w-5 h-5 mb-0.5"></lucide-icon>
          <span class="text-[9px] font-bold">Admin</span>
        </a>

        <a *ngIf="authService.hasRole('COMMISSION_ELECTORALE')" routerLink="/commission" routerLinkActive="text-[#047857]"
           class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
          <lucide-icon name="landmark" class="w-5 h-5 mb-0.5"></lucide-icon>
          <span class="text-[9px] font-bold">Commission</span>
        </a>

        <a *ngIf="authService.hasRole('CANDIDAT')" routerLink="/candidat" routerLinkActive="text-[#047857]"
           class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
          <lucide-icon name="megaphone" class="w-5 h-5 mb-0.5"></lucide-icon>
          <span class="text-[9px] font-bold">Candidat</span>
        </a>

        <a *ngIf="authService.hasRole('ELECTEUR') || authService.hasRole('CANDIDAT')" routerLink="/reclamations" routerLinkActive="text-[#047857]"
           class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
          <lucide-icon name="alert-triangle" class="w-5 h-5 mb-0.5 text-amber-600"></lucide-icon>
          <span class="text-[9px] font-bold">Recours</span>
        </a>

        <ng-container *ngIf="authService.isLoggedIn(); else loginBtnMob">
          <button (click)="logout()" class="flex flex-col items-center justify-center p-1.5 text-red-500 hover:text-red-700 transition">
            <lucide-icon name="log-out" class="w-5 h-5 mb-0.5"></lucide-icon>
            <span class="text-[9px] font-bold">Quitter</span>
          </button>
        </ng-container>
        <ng-template #loginBtnMob>
          <a routerLink="/login" routerLinkActive="text-[#047857]"
             class="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-[#047857] transition">
            <lucide-icon name="user" class="w-5 h-5 mb-0.5"></lucide-icon>
            <span class="text-[9px] font-bold">Login</span>
          </a>
        </ng-template>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'COMMISSION_ELECTORALE': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'CANDIDAT': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-emerald-50 text-[#047857] border-emerald-200';
    }
  }
}
