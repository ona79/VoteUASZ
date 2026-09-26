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
    <!-- DESKTOP SIDEBAR (hidden on mobile, fixed left) -->
    <aside class="uasz-sidebar-desktop flex flex-col h-full bg-white border-r border-slate-200 shadow-sm fixed left-0 top-0 z-40 hidden md:flex">
      <!-- Logo -->
      <div class="p-5 border-b border-slate-100">
        <a routerLink="/" class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md border border-slate-100 shrink-0 overflow-hidden">
            <img src="assets/logo_vote_uasz.PNG" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
          </div>
          <div class="flex flex-col">
            <span class="font-black text-lg tracking-tight text-slate-900 leading-none">Vote<span class="text-[#047857]">UASZ</span></span>
            <span class="text-[9px] text-[#047857] font-bold tracking-wider uppercase mt-0.5">Université Assane Seck</span>
          </div>
        </a>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
        <ng-container *ngIf="authService.isLoggedIn()">
          <a routerLink="/elections" routerLinkActive="bg-emerald-50 text-[#047857] font-bold border-emerald-200"
             class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#047857] hover:bg-emerald-50/60 transition border border-transparent">
            <lucide-icon name="vote" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Élections</span>
          </a>

          <a *ngIf="authService.hasRole('SUPER_ADMIN')" routerLink="/admin"
             routerLinkActive="bg-emerald-50 text-[#047857] font-bold border-emerald-200"
             class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#047857] hover:bg-emerald-50/60 transition border border-transparent">
            <lucide-icon name="shield" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Super-Admin</span>
          </a>

          <a *ngIf="authService.hasRole('COMMISSION_ELECTORALE')" routerLink="/commission"
             routerLinkActive="bg-emerald-50 text-[#047857] font-bold border-emerald-200"
             class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#047857] hover:bg-emerald-50/60 transition border border-transparent">
            <lucide-icon name="landmark" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Commission</span>
          </a>

          <a *ngIf="authService.hasRole('CANDIDAT')" routerLink="/candidat"
             routerLinkActive="bg-emerald-50 text-[#047857] font-bold border-emerald-200"
             class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#047857] hover:bg-emerald-50/60 transition border border-transparent">
            <lucide-icon name="megaphone" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Espace Candidat</span>
          </a>

          <a *ngIf="authService.hasRole('ELECTEUR') || authService.hasRole('CANDIDAT')"
             routerLink="/reclamations"
             routerLinkActive="bg-emerald-50 text-[#047857] font-bold border-emerald-200"
             class="flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#047857] hover:bg-emerald-50/60 transition border border-transparent">
            <lucide-icon name="alert-triangle" class="w-4 h-4 shrink-0 text-amber-600"></lucide-icon>
            <span>Réclamations</span>
          </a>
        </ng-container>
      </div>

      <!-- User Profile (Bottom) -->
      <div class="p-3.5 border-t border-slate-100 bg-slate-50/50">
        <ng-container *ngIf="authService.currentUser() as user; else loginBtnDesk">
          <div class="flex flex-col mb-2.5">
            <span class="text-xs font-black text-slate-900 leading-tight">{{ user.prenom }} {{ user.nom }}</span>
            <span [class]="getRoleBadgeClass(user.role)" class="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase mt-1 border w-max">
              {{ user.role }}
            </span>
          </div>
          <button (click)="logout()" class="w-full px-3 py-1.5 rounded-lg text-xs font-bold text-[#dc2626] bg-red-50 hover:bg-red-100 border border-red-200 transition flex items-center justify-center space-x-1.5 shadow-sm">
            <lucide-icon name="log-out" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span>Déconnexion</span>
          </button>
        </ng-container>
        <ng-template #loginBtnDesk>
          <a routerLink="/login" class="uasz-btn-primary w-full block text-center py-2 text-xs">
            Se Connecter
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
