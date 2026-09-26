import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Election } from '../../models/vote.models';
import { ElectionFilterComponent } from '../shared/election-filter/election-filter.component';

@Component({
  selector: 'app-election-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    ElectionFilterComponent
  ],
  template: `
    <!-- Hero Header Mobile & Desktop -->
    <div class="uasz-header-mobile md:mx-auto md:max-w-7xl md:mt-6 relative overflow-hidden mb-6">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-5 md:p-8">
        <div>
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-[11px] font-bold mb-3 border border-white/20">
            <img src="assets/logo_vote_uasz.PNG" alt="Vote UASZ" class="w-4 h-4 object-contain rounded-sm" />
            <span>Université Assane Seck</span>
          </div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-2 text-white">Scrutins Officiels</h1>
          <p class="text-xs md:text-sm text-emerald-100 max-w-2xl font-medium leading-relaxed">
            Consultez les élections académiques, découvrez les programmes et vidéos des candidats, et exprimez votre vote en toute sécurité.
          </p>
        </div>

        <div *ngIf="authService.currentUser() as user; else loginHeaderBtn" class="bg-black/15 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-white min-w-[210px] shadow-lg w-full md:w-auto flex flex-col justify-between">
          <div class="flex items-center space-x-3 mb-2">
            <div class="w-10 h-10 rounded-xl bg-white text-[#047857] flex items-center justify-center text-base font-black shadow-md shrink-0">
              {{ user.prenom.charAt(0) }}{{ user.nom.charAt(0) }}
            </div>
            <div>
              <p class="text-xs font-black tracking-tight text-white">{{ user.prenom }} {{ user.nom }}</p>
              <p class="text-[10px] text-emerald-100/90 font-medium">UFR : {{ user.ufr || 'Toutes' }} | {{ user.filiere || 'N/A' }} {{ user.niveau || '' }}</p>
            </div>
          </div>
          <a *ngIf="authService.hasRole('ELECTEUR') || authService.hasRole('CANDIDAT')"
             routerLink="/reclamations"
             class="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-400/30 transition">
            <lucide-icon name="alert-triangle" class="w-3.5 h-3.5 text-amber-300"></lucide-icon>
            <span>Déposer une réclamation</span>
          </a>

          <a *ngIf="authService.hasRole('COMMISSION_ELECTORALE')"
             routerLink="/commission"
             class="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-[11px] font-bold border border-emerald-400/30 transition">
            <lucide-icon name="landmark" class="w-3.5 h-3.5 text-emerald-300"></lucide-icon>
            <span>Espace Commission</span>
          </a>

          <a *ngIf="authService.hasRole('SUPER_ADMIN')"
             routerLink="/admin"
             class="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 text-[11px] font-bold border border-blue-400/30 transition">
            <lucide-icon name="shield" class="w-3.5 h-3.5 text-blue-300"></lucide-icon>
            <span>Espace Super-Admin</span>
          </a>
        </div>

        <ng-template #loginHeaderBtn>
          <a routerLink="/login" class="px-5 py-3 rounded-xl bg-white text-[#047857] hover:bg-emerald-50 text-xs font-black transition-all shadow-lg flex items-center space-x-2 shrink-0 border border-white/30">
            <lucide-icon name="log-in" class="w-4 h-4 text-[#047857]"></lucide-icon>
            <span>Se connecter pour voter</span>
          </a>
        </ng-template>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <!-- Titre avec compteur total -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-black text-slate-900 flex items-center space-x-2 tracking-tight">
          <lucide-icon name="vote" class="w-5 h-5 text-[#047857] shrink-0"></lucide-icon>
          <span>Élections</span>
          <span class="text-xs px-2.5 py-0.5 rounded-lg bg-[#047857]/10 text-[#047857] font-black border border-[#047857]/20">
            {{ filteredElections.length }}<span *ngIf="filteredElections.length !== elections.length" class="opacity-60"> / {{ elections.length }}</span>
          </span>
        </h2>
      </div>

      <!-- Barre de filtres -->
      <app-election-filter
        [elections]="elections"
        [ufrList]="ufrList"
        [showUfrFilter]="true"
        (filtered)="filteredElections = $event"
      ></app-election-filter>

      <!-- Loading State -->
      <div *ngIf="loading" class="py-12 text-center text-slate-500 animate-pulse">
        <lucide-icon name="loader-2" class="w-6 h-6 animate-spin mx-auto text-[#047857] mb-2"></lucide-icon>
        <p class="text-xs font-bold tracking-wide">Chargement des scrutins électoraux...</p>
      </div>

      <!-- Elections Grid -->
      <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div *ngFor="let election of filteredElections"
             class="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between relative shadow-sm hover:shadow-md transition-all group overflow-hidden">

          <!-- Hover side border indicator -->
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#047857] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="pl-1.5">
            <!-- Status Badges -->
            <div class="flex items-center justify-between mb-3">
              <span [class]="getTypeBadgeClass(election.type)" class="text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border">
                {{ election.type }}
              </span>
              <span [class]="getStatusBadgeClass(election.statut)" class="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border flex items-center space-x-1 shadow-sm">
                <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                <span>{{ election.statut }}</span>
              </span>
            </div>

            <!-- Title & Description -->
            <h3 class="text-base font-black text-slate-900 group-hover:text-[#047857] transition-colors mb-1.5 leading-snug tracking-tight">
              {{ election.titre }}
            </h3>
            <p *ngIf="election.description" class="text-xs text-slate-500 line-clamp-2 mb-3.5 font-medium leading-relaxed">
              {{ election.description }}
            </p>

            <!-- Target Scope details -->
            <div class="space-y-1 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 font-medium">
              <div class="flex justify-between items-center pb-1 border-b border-slate-200/50">
                <span class="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Périmètre UFR</span>
                <span class="font-black text-slate-900 text-xs">{{ election.targetUfr || 'Toutes les UFRs' }}</span>
              </div>
              <div class="flex justify-between items-center" *ngIf="election.targetFiliere">
                <span class="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Filière</span>
                <span class="font-bold text-[#1d4ed8] text-[10px]">{{ election.targetFiliere }}</span>
              </div>
              <div class="flex justify-between items-center pt-1 border-t border-slate-200/50" *ngIf="election.targetNiveau">
                <span class="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Niveau</span>
                <span class="font-bold text-[#1d4ed8] text-[10px]">{{ election.targetNiveau }}</span>
              </div>
            </div>
          </div>

          <!-- Actions & Eligibility Status -->
          <div class="pt-3 border-t border-slate-100 flex items-center justify-between pl-1.5">
            <span *ngIf="election.statut === 'VOTE_OUVERT'" class="text-xs font-black text-[#047857] flex items-center space-x-1">
              <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#047857] shrink-0"></lucide-icon>
              <span>Vote Ouvert</span>
            </span>
            <span *ngIf="election.statut !== 'VOTE_OUVERT'" class="text-xs font-bold text-slate-400">
              {{ election.statut }}
            </span>

            <a [routerLink]="['/elections', election.id]"
               class="px-3.5 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition-all shadow-md shadow-[#047857]/10 flex items-center space-x-1">
              <span>Accéder</span>
              <span class="group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
          </div>

        </div>
      </div>
      <!-- État vide après filtrage -->
      <div *ngIf="!loading && filteredElections.length === 0 && elections.length > 0"
           class="py-16 text-center">
        <div class="inline-flex flex-col items-center gap-3">
          <span class="text-4xl">🗳️</span>
          <p class="text-sm font-bold text-slate-600">Aucune élection ne correspond à ces filtres.</p>
          <p class="text-xs text-slate-400">Modifiez ou réinitialisez vos critères de recherche.</p>
        </div>
      </div>

    </div>
  `
})
export class ElectionListComponent implements OnInit {
  elections: Election[] = [];
  filteredElections: Election[] = [];
  ufrList: string[] = [];
  loading = true;

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.fetchElections();
  }

  fetchElections(): void {
    this.loading = true;
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.filteredElections = data;
        this.ufrList = [...new Set(data.map(e => e.targetUfr).filter((u): u is string => !!u))];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Impossible de charger les scrutins électoraux.');
      }
    });
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'DELEGUE': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'DUFR': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'VICE_RECTEUR': return 'bg-red-50 text-[#dc2626] border-red-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'VOTE_OUVERT': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'CAMPAGNE': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'DEPOUILLEMENT': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PUBLICATION': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'CLOTURE': return 'bg-red-50 text-[#dc2626] border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
}
