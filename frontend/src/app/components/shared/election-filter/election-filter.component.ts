import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Election, ElectionStatus } from '../../../models/vote.models';

interface StatusPill {
  label: string;
  value: ElectionStatus | 'TOUTES';
  count: number;
}

@Component({
  selector: 'app-election-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="election-filter-bar">

      <!-- Ligne principale : recherche + UFR (desktop inline, mobile stacked) -->
      <div class="filter-top-row">

        <!-- Barre de recherche -->
        <div class="search-wrapper">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="election-search-input"
            type="text"
            [(ngModel)]="searchText"
            (input)="applyFilters()"
            placeholder="Rechercher un scrutin…"
            class="search-input"
            autocomplete="off"
          />
          <button *ngIf="searchText" (click)="clearSearch()" class="clear-btn" aria-label="Effacer la recherche">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Dropdown UFR — desktop visible, mobile derrière bouton Filtres -->
        <div class="ufr-wrapper" [class.mobile-hidden]="!mobileFiltersOpen">
          <select
            *ngIf="showUfrFilter && ufrList.length > 0"
            id="ufr-select"
            [(ngModel)]="activeUfr"
            (change)="applyFilters()"
            class="ufr-select"
          >
            <option value="TOUTES">Toutes les UFR</option>
            <option *ngFor="let ufr of ufrList" [value]="ufr">{{ ufr }}</option>
          </select>
        </div>

        <!-- Bouton entonnoir mobile (visible uniquement si filtre UFR disponible) -->
        <button
          *ngIf="showUfrFilter && ufrList.length > 0"
          (click)="toggleMobileFilters()"
          class="mobile-filter-btn"
          [class.active]="activeUfr !== 'TOUTES'"
          aria-label="Ouvrir/fermer les filtres avancés"
          id="mobile-filter-toggle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Filtres</span>
          <span *ngIf="activeUfr !== 'TOUTES'" class="filter-dot"></span>
        </button>
      </div>

      <!-- Pilules de statut : scroll horizontal sur mobile -->
      <div class="pills-row" role="group" aria-label="Filtrer par statut">
        <button
          *ngFor="let pill of statusPills"
          [id]="'pill-' + pill.value"
          (click)="setStatut(pill.value)"
          [class.active]="activeStatut === pill.value"
          class="status-pill"
          [attr.aria-pressed]="activeStatut === pill.value"
        >
          {{ pill.label }}
          <span class="pill-count" [class.active]="activeStatut === pill.value">{{ pill.count }}</span>
        </button>
      </div>

      <!-- Résumé des filtres actifs (affiché seulement si un filtre non-défaut est actif) -->
      <div *ngIf="hasActiveFilters()" class="active-filters-summary">
        <span class="active-filters-label">Filtres actifs :</span>
        <span *ngIf="activeStatut !== 'TOUTES'" class="active-tag">{{ getStatutLabel(activeStatut) }}</span>
        <span *ngIf="activeUfr !== 'TOUTES'" class="active-tag">{{ activeUfr }}</span>
        <span *ngIf="searchText.trim()" class="active-tag">"{{ searchText.trim() }}"</span>
        <button (click)="resetAll()" class="reset-btn" id="reset-filters-btn">Réinitialiser</button>
      </div>

    </div>
  `,
  styles: [`
    .election-filter-bar {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }

    /* ── Ligne du haut ── */
    .filter-top-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
    }

    /* ── Recherche ── */
    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 15px;
      height: 15px;
      color: #94a3b8;
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      padding: 8px 32px 8px 32px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 500;
      color: #1e293b;
      background: #f8fafc;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .search-input:focus {
      outline: none;
      border-color: #047857;
      box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.08);
      background: #ffffff;
    }
    .search-input::placeholder { color: #94a3b8; }
    .clear-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: #94a3b8;
      display: flex;
      align-items: center;
    }
    .clear-btn svg { width: 14px; height: 14px; }
    .clear-btn:hover { color: #64748b; }

    /* ── UFR Dropdown ── */
    .ufr-wrapper { flex-shrink: 0; }
    .ufr-select {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      background: #f8fafc;
      cursor: pointer;
      min-height: 36px;
      transition: border-color 0.15s;
    }
    .ufr-select:focus { outline: none; border-color: #047857; }

    /* ── Bouton filtre mobile ── */
    .mobile-filter-btn {
      display: none;
      align-items: center;
      gap: 5px;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      background: #f8fafc;
      cursor: pointer;
      white-space: nowrap;
      min-height: 36px;
      position: relative;
      flex-shrink: 0;
    }
    .mobile-filter-btn svg { width: 14px; height: 14px; }
    .mobile-filter-btn.active { border-color: #047857; color: #047857; }
    .filter-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #047857;
    }

    /* ── Pilules de statut ── */
    .pills-row {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      white-space: nowrap;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .pills-row::-webkit-scrollbar { display: none; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 12px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
      min-height: 36px;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .status-pill:hover:not(.active) {
      border-color: #047857;
      color: #047857;
      background: #f0fdf4;
    }
    .status-pill.active {
      background: #047857;
      border-color: #047857;
      color: #ffffff;
    }
    .pill-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #e2e8f0;
      color: #374151;
      font-size: 10px;
      font-weight: 700;
    }
    .pill-count.active {
      background: rgba(255,255,255,0.25);
      color: #ffffff;
    }

    /* ── Résumé filtres actifs ── */
    .active-filters-summary {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding-top: 4px;
      border-top: 1px solid #f1f5f9;
    }
    .active-filters-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .active-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 6px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #047857;
      font-size: 11px;
      font-weight: 700;
    }
    .reset-btn {
      margin-left: auto;
      padding: 3px 10px;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      background: #fff1f2;
      color: #dc2626;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
    }
    .reset-btn:hover { background: #fee2e2; }

    /* ── Responsive mobile ── */
    @media (max-width: 639px) {
      .election-filter-bar { padding: 12px; gap: 8px; }

      /* Cacher le select UFR sur mobile, afficher le bouton entonnoir */
      .ufr-wrapper { display: none !important; }
      .mobile-filter-btn { display: inline-flex; }

      /* Panneau UFR mobile déroulant */
      .ufr-wrapper.mobile-hidden { display: none; }
      .ufr-wrapper:not(.mobile-hidden) {
        display: block !important;
        width: 100%;
      }
      .ufr-wrapper:not(.mobile-hidden) .ufr-select { width: 100%; }
    }
  `]
})
export class ElectionFilterComponent implements OnChanges {

  @Input() elections: Election[] = [];
  @Input() ufrList: string[] = [];
  @Input() showUfrFilter: boolean = true;
  @Output() filtered = new EventEmitter<Election[]>();

  searchText = '';
  activeStatut: ElectionStatus | 'TOUTES' = 'TOUTES';
  activeUfr = 'TOUTES';
  mobileFiltersOpen = false;

  statusPills: StatusPill[] = [];

  private readonly PILL_CONFIG: Array<{ label: string; value: ElectionStatus | 'TOUTES' }> = [
    { label: 'Toutes',        value: 'TOUTES'        },
    { label: 'Vote ouvert',   value: 'VOTE_OUVERT'   },
    { label: 'En campagne',   value: 'CAMPAGNE'      },
    { label: 'Publication',   value: 'PUBLICATION'   },
    { label: 'Clôturé',       value: 'CLOTURE'       },
    { label: 'Configuration', value: 'CONFIGURATION' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elections']) {
      this.buildPills();
      this.applyFilters();
    }
  }

  /** Construit les pilules avec compteurs basés sur la liste COMPLÈTE (pas filtrée) */
  buildPills(): void {
    this.statusPills = this.PILL_CONFIG
      .map(cfg => ({
        ...cfg,
        count: cfg.value === 'TOUTES'
          ? this.elections.length
          : this.elections.filter(e => e.statut === cfg.value).length
      }))
      .filter(p => p.value === 'TOUTES' || p.count > 0); // masquer les pilules à 0
  }

  applyFilters(): void {
    let result = [...this.elections];

    // 1. Filtre par statut
    if (this.activeStatut !== 'TOUTES') {
      result = result.filter(e => e.statut === this.activeStatut);
    }

    // 2. Filtre par UFR — les élections sans targetUfr (portée globale) restent toujours visibles
    if (this.activeUfr !== 'TOUTES') {
      result = result.filter(e =>
        !e.targetUfr || e.targetUfr.toLowerCase() === this.activeUfr.toLowerCase()
      );
    }

    // 3. Filtre par texte (insensible à la casse, sur le titre)
    const q = this.searchText.trim().toLowerCase();
    if (q) {
      result = result.filter(e => e.titre.toLowerCase().includes(q));
    }

    this.filtered.emit(result);
  }

  setStatut(statut: ElectionStatus | 'TOUTES'): void {
    this.activeStatut = statut;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchText = '';
    this.applyFilters();
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }

  resetAll(): void {
    this.searchText = '';
    this.activeStatut = 'TOUTES';
    this.activeUfr = 'TOUTES';
    this.mobileFiltersOpen = false;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.activeStatut !== 'TOUTES' || this.activeUfr !== 'TOUTES' || this.searchText.trim().length > 0;
  }

  getStatutLabel(statut: ElectionStatus | 'TOUTES'): string {
    const found = this.PILL_CONFIG.find(p => p.value === statut);
    return found ? found.label : statut;
  }
}
