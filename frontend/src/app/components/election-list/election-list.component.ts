import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { Election } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { ElectionToolbarComponent } from '../shared/election-toolbar/election-toolbar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
  getElectionScopeLabel,
  getElectionStatusBadgeClass,
  getElectionStatusLabel
} from '../../utils/election-ui.utils';

@Component({
  selector: 'app-election-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    ElectionToolbarComponent,
    PaginationComponent
  ],
  template: `
    <!-- Barre du haut fine (~48px) réutilisable -->
    <app-page-header title="Scrutins">
      <ng-container *ngIf="authService.isLoggedIn(); else loginHeaderBtn">
        <a *ngIf="authService.hasRole('SUPER_ADMIN')" routerLink="/admin"
           class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition inline-flex items-center space-x-1.5">
          <lucide-icon name="shield" class="w-3.5 h-3.5"></lucide-icon>
          <span>Admin</span>
        </a>
        <a *ngIf="authService.hasRole('COMMISSION_ELECTORALE')" routerLink="/commission"
           class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition inline-flex items-center space-x-1.5">
          <lucide-icon name="landmark" class="w-3.5 h-3.5"></lucide-icon>
          <span>Commission</span>
        </a>
        <a *ngIf="authService.hasRole('ELECTEUR') || authService.hasRole('CANDIDAT')" routerLink="/reclamations"
           class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition inline-flex items-center space-x-1.5">
          <lucide-icon name="alert-triangle" class="w-3.5 h-3.5"></lucide-icon>
          <span>Réclamation</span>
        </a>
      </ng-container>
      <ng-template #loginHeaderBtn>
        <a routerLink="/login"
           class="px-3 py-1 rounded-lg bg-white text-[#047857] hover:bg-emerald-50 text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-sm">
          <lucide-icon name="log-in" class="w-3.5 h-3.5"></lucide-icon>
          <span>Se connecter</span>
        </a>
      </ng-template>
    </app-page-header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
      <!-- Barre d'outils partagée -->
      <app-election-toolbar
        #toolbar
        [elections]="elections"
        [ufrList]="ufrList"
        [showViewSwitch]="true"
        [viewMode]="viewMode"
        (filteredChange)="onFilteredChange($event)"
        (viewModeChange)="setViewMode($event)">
      </app-election-toolbar>

      <!-- Loading State (skeleton réservant la hauteur pour éviter tout décalage CLS) -->
      <div *ngIf="loading" class="min-h-[720px] space-y-2.5" aria-busy="true" aria-label="Chargement des scrutins">
        <div *ngFor="let s of [1, 2, 3, 4, 5]"
             class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm h-[140px] flex flex-col justify-between animate-pulse">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="h-4 w-20 bg-slate-200 rounded"></div>
              <div class="h-4 w-24 bg-slate-200 rounded"></div>
            </div>
            <div class="h-4 w-3/4 bg-slate-200 rounded"></div>
            <div class="h-3 w-1/3 bg-slate-100 rounded"></div>
          </div>
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div class="h-3 w-20 bg-slate-100 rounded"></div>
            <div class="h-6 w-20 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      </div>

      <!-- VUE LISTE PAR DÉFAUT (Desktop Table compacte ~38-40px/ligne) -->
      <div *ngIf="!loading && viewMode === 'list' && paginatedElections.length > 0"
           class="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-2.5 px-3.5">Scrutin</th>
              <th class="py-2.5 px-3 w-32">Type</th>
              <th class="py-2.5 px-3 w-48">Périmètre</th>
              <th class="py-2.5 px-3 w-36">Statut</th>
              <th class="py-2.5 px-3.5 w-20 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            <tr *ngFor="let election of paginatedElections"
                class="h-10 hover:bg-slate-50/80 transition-colors">
              <td class="px-3.5 py-1.5 font-semibold text-slate-900 max-w-md truncate" [title]="election.titre">
                <a [routerLink]="['/elections', election.id]" class="hover:text-[#047857] transition-colors">
                  {{ election.titre }}
                </a>
              </td>
              <td class="px-3 py-1.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                  {{ election.type }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-slate-600 truncate max-w-[190px]">
                {{ getScopeLabel(election) }}
              </td>
              <td class="px-3 py-1.5">
                <span [class]="getStatusBadgeClass(election.statut)"
                      class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{{ getStatusLabel(election.statut) }}</span>
                </span>
              </td>
              <td class="px-3.5 py-1.5 text-right">
                <a [routerLink]="['/elections', election.id]" title="Accéder au scrutin"
                   class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#047857] hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition">
                  <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- VUE CARTES COMPACTES (Desktop si mode cartes, ou Mobile toujours en cartes simples) -->
      <div *ngIf="!loading && paginatedElections.length > 0"
           [class]="viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' : 'grid grid-cols-1 gap-2.5 md:hidden'">
        <div *ngFor="let election of paginatedElections"
             class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:border-[#047857]/40 transition flex flex-col justify-between gap-2.5">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                {{ election.type }}
              </span>
              <span [class]="getStatusBadgeClass(election.statut)"
                    class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>{{ getStatusLabel(election.statut) }}</span>
              </span>
            </div>
            <h2 class="text-sm font-bold text-slate-900 leading-snug line-clamp-1" [title]="election.titre">
              {{ election.titre }}
            </h2>
            <p class="text-[11px] text-slate-500 mt-1">{{ getScopeLabel(election) }}</p>
          </div>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span class="text-[11px] text-slate-600 font-medium">
              {{ election.dateFin ? (election.dateFin | date:'dd/MM/yyyy') : 'Scrutin UASZ' }}
            </span>
            <a [routerLink]="['/elections', election.id]"
               class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold transition">
              <span>Accéder</span>
              <lucide-icon name="arrow-right" class="w-3 h-3"></lucide-icon>
            </a>
          </div>
        </div>
      </div>

      <!-- État vide -->
      <div *ngIf="!loading && filteredElections.length === 0"
           class="bg-white border border-slate-200 rounded-xl py-10 text-center">
        <p class="text-xs font-bold text-slate-600">Aucun scrutin ne correspond à vos critères.</p>
        <button type="button" (click)="toolbar.reset()"
                class="mt-2 text-xs font-semibold text-[#047857] hover:underline">
          Réinitialiser les filtres
        </button>
      </div>

      <!-- Pagination partagée (8 par page) -->
      <app-pagination
        *ngIf="!loading"
        [totalItems]="filteredElections.length"
        [pageSize]="pageSize"
        [currentPage]="currentPage"
        itemLabel="scrutin"
        (pageChange)="currentPage = $event">
      </app-pagination>
    </div>
  `
})
export class ElectionListComponent implements OnInit {
  private static readonly VIEW_STORAGE_KEY = 'voteuasz_elections_view';

  @ViewChild('toolbar') toolbar!: ElectionToolbarComponent;

  elections: Election[] = [];
  filteredElections: Election[] = [];
  ufrList: string[] = [];
  loading = true;

  viewMode: 'list' | 'cards' = 'list';
  currentPage = 1;
  readonly pageSize = 8;

  getScopeLabel = getElectionScopeLabel;
  getStatusLabel = getElectionStatusLabel;
  getStatusBadgeClass = getElectionStatusBadgeClass;

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  ngOnInit(): void {
    const savedView = localStorage.getItem(ElectionListComponent.VIEW_STORAGE_KEY);
    if (savedView === 'list' || savedView === 'cards') {
      this.viewMode = savedView;
    }
    this.fetchElections();
  }

  fetchElections(): void {
    this.loading = true;
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.ufrList = [...new Set(data.map(e => e.targetUfr).filter((u): u is string => !!u))];
        this.filteredElections = data;
        this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Impossible de charger les scrutins électoraux.');
      }
    });
  }

  onFilteredChange(filtered: Election[]): void {
    this.filteredElections = filtered;
    this.currentPage = 1;
  }

  setViewMode(mode: 'list' | 'cards'): void {
    this.viewMode = mode;
    localStorage.setItem(ElectionListComponent.VIEW_STORAGE_KEY, mode);
  }

  get paginatedElections(): Election[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredElections.slice(start, start + this.pageSize);
  }
}
