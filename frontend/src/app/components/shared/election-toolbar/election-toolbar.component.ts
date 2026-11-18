import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Election } from '../../../models/vote.models';

interface StatusChip {
  value: string;
  label: string;
}

@Component({
  selector: 'app-election-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm flex flex-wrap xl:flex-nowrap items-center gap-2">
      <!-- Recherche -->
      <div class="relative flex-1 min-w-[180px] xl:max-w-[220px]">
        <lucide-icon name="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></lucide-icon>
        <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()"
               placeholder="Rechercher un scrutin..."
               class="w-full h-8 pl-8 pr-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#047857]"/>
      </div>

      <!-- Chips de filtre par statut avec compteur -->
      <div class="flex items-center gap-1 overflow-x-auto py-0.5 flex-wrap">
        <button *ngFor="let chip of statusChips" type="button"
                (click)="selectStatus(chip.value)"
                [class]="selectedStatus === chip.value
                  ? 'bg-[#047857] text-white border-[#047857]'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/70'"
                class="h-7 px-2.5 rounded-lg border text-[11px] font-semibold transition inline-flex items-center space-x-1 whitespace-nowrap">
          <span>{{ chip.label }}</span>
          <span [class]="selectedStatus === chip.value ? 'bg-white/20 text-white' : 'bg-white text-slate-500'"
                class="px-1.5 py-0 rounded text-[10px] font-bold">
            {{ getStatusCount(chip.value) }}
          </span>
        </button>
      </div>

      <!-- Filtre UFR + Switch Liste / Cartes optionnel -->
      <div class="flex items-center gap-2 ml-auto shrink-0">
        <select [(ngModel)]="selectedUfr" (ngModelChange)="applyFilters()"
                aria-label="Filtrer par UFR"
                class="h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#047857]">
          <option value="">Toutes UFRs</option>
          <option *ngFor="let ufr of ufrList" [value]="ufr">{{ ufr }}</option>
        </select>

        <div *ngIf="showViewSwitch" class="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5" role="group" aria-label="Mode d'affichage">
          <button type="button" (click)="setViewMode('list')" title="Vue Liste"
                  [class]="viewMode === 'list' ? 'bg-white text-[#047857] shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                  class="h-7 w-7 rounded-md flex items-center justify-center transition">
            <lucide-icon name="list" class="w-3.5 h-3.5"></lucide-icon>
          </button>
          <button type="button" (click)="setViewMode('cards')" title="Vue Cartes"
                  [class]="viewMode === 'cards' ? 'bg-white text-[#047857] shadow-sm' : 'text-slate-500 hover:text-slate-800'"
                  class="h-7 w-7 rounded-md flex items-center justify-center transition">
            <lucide-icon name="layout-grid" class="w-3.5 h-3.5"></lucide-icon>
          </button>
        </div>
      </div>
    </div>
  `
})
export class ElectionToolbarComponent implements OnChanges {
  @Input() elections: Election[] = [];
  @Input() ufrList: string[] = [];
  @Input() showViewSwitch = false;
  @Input() viewMode: 'list' | 'cards' = 'list';

  @Output() filteredChange = new EventEmitter<Election[]>();
  @Output() viewModeChange = new EventEmitter<'list' | 'cards'>();

  searchTerm = '';
  selectedStatus = '';
  selectedUfr = '';

  readonly statusChips: StatusChip[] = [
    { value: '', label: 'Tous' },
    { value: 'VOTE_OUVERT', label: 'Vote ouvert' },
    { value: 'DEPOUILLEMENT', label: 'Dépouillement' },
    { value: 'PUBLICATION', label: 'Publication' },
    { value: 'CLOTURE', label: 'Clôturé' },
    { value: 'CONFIGURATION', label: 'Configuration' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elections']) {
      this.applyFilters();
    }
  }

  selectStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  setViewMode(mode: 'list' | 'cards'): void {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }

  reset(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedUfr = '';
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.searchTerm.trim().toLowerCase();
    const filtered = this.elections.filter(e => {
      const matchQuery = !q ||
        e.titre.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q));
      const matchStatus = !this.selectedStatus || e.statut === this.selectedStatus;
      const matchUfr = !this.selectedUfr || e.targetUfr === this.selectedUfr;
      return matchQuery && matchStatus && matchUfr;
    });
    this.filteredChange.emit(filtered);
  }

  getStatusCount(status: string): number {
    if (!status) {
      return this.elections.length;
    }
    return this.elections.filter(e => e.statut === status).length;
  }
}
