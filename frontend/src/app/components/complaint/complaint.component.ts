import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ComplaintService, ComplaintResponse } from '../../services/complaint.service';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Election } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';

@Component({
  selector: 'app-complaint',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    PaginationComponent
  ],
  template: `
    <!-- Barre du haut fine (~48px) -->
    <app-page-header title="Réclamations">
      <button type="button"
              (click)="showMobileForm = !showMobileForm"
              class="lg:hidden px-2.5 py-1 rounded-lg bg-white text-[#047857] text-xs font-bold inline-flex items-center space-x-1 shadow-sm">
        <lucide-icon [name]="showMobileForm ? 'x' : 'plus'" class="w-3.5 h-3.5"></lucide-icon>
        <span>{{ showMobileForm ? 'Fermer' : 'Nouvelle réclamation' }}</span>
      </button>
    </app-page-header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
      <!-- Bloc "À savoir" compact et repliable -->
      <div class="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm">
        <button type="button" (click)="showInfo = !showInfo"
                class="w-full flex items-center justify-between text-xs font-semibold text-slate-700">
          <span class="inline-flex items-center space-x-2">
            <lucide-icon name="info" class="w-3.5 h-3.5 text-[#047857] shrink-0"></lucide-icon>
            <span>À savoir — Procédure de réclamation (délai légal 48h ouvrées)</span>
          </span>
          <lucide-icon [name]="showInfo ? 'chevron-down' : 'chevron-right'" class="w-3.5 h-3.5 text-slate-400"></lucide-icon>
        </button>
        <div *ngIf="showInfo" class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5 leading-relaxed">
          <span>• Transmise à la Commission Électorale (traitement sous <strong>48h ouvrées</strong>).</span>
          <span>• Soyez précis et joignez toute preuve disponible dans la description.</span>
          <span class="sm:col-span-2 text-amber-700">• Une réclamation abusive ou de mauvaise foi peut entraîner des sanctions.</span>
        </div>
      </div>

      <!-- Mise en page deux zones (~40% formulaire à gauche, liste à droite) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

        <!-- Zone gauche : Formulaire (replié par défaut sur mobile) -->
        <div class="lg:col-span-5" [class.hidden]="!showMobileForm" [class.lg:block]="true">
          <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 class="text-sm font-black text-slate-900 mb-3 pb-2 border-b border-slate-100">
              Nouvelle réclamation
            </h2>

            <form (ngSubmit)="submitComplaint()" #complaintForm="ngForm" class="space-y-3">
              <!-- Élection concernée -->
              <div>
                <label for="electionId" class="block text-[11px] font-bold text-slate-700 mb-1">
                  Élection concernée <span class="text-red-500">*</span>
                </label>
                <select id="electionId"
                        name="electionId"
                        [(ngModel)]="form.electionId"
                        required
                        [disabled]="loadingElections"
                        class="uasz-input !py-1.5 !px-2.5 text-xs">
                  <option [ngValue]="0" disabled>
                    {{ loadingElections ? 'Chargement...' : '-- Sélectionnez une élection --' }}
                  </option>
                  <option *ngFor="let e of elections" [ngValue]="e.id">{{ e.titre }}</option>
                </select>
              </div>

              <!-- Sujet -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="sujet" class="text-[11px] font-bold text-slate-700">
                    Sujet <span class="text-red-500">*</span>
                  </label>
                  <span class="text-[10px] text-slate-400">{{ form.sujet.length }}/120</span>
                </div>
                <input id="sujet"
                       type="text"
                       name="sujet"
                       [(ngModel)]="form.sujet"
                       required
                       minlength="5"
                       maxlength="120"
                       placeholder="Ex : Anomalie lors du dépouillement"
                       class="uasz-input !py-1.5 !px-2.5 text-xs" />
              </div>

              <!-- Description détaillée -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="description" class="text-[11px] font-bold text-slate-700">
                    Description détaillée <span class="text-red-500">*</span>
                  </label>
                  <span class="text-[10px] text-slate-400">{{ form.description.length }}/2000</span>
                </div>
                <textarea id="description"
                          name="description"
                          [(ngModel)]="form.description"
                          required
                          minlength="20"
                          maxlength="2000"
                          rows="4"
                          placeholder="Décrivez précisément la situation constatée : date, heure, personnes impliquées, preuves disponibles..."
                          class="uasz-input !py-1.5 !px-2.5 text-xs resize-none leading-relaxed"></textarea>
              </div>

              <button type="submit"
                      [disabled]="submitting || !complaintForm.valid || form.electionId === 0"
                      class="w-full py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition inline-flex items-center justify-center space-x-1.5 disabled:opacity-50">
                <lucide-icon *ngIf="submitting" name="loader-2" class="w-3.5 h-3.5 animate-spin"></lucide-icon>
                <lucide-icon *ngIf="!submitting" name="send" class="w-3.5 h-3.5"></lucide-icon>
                <span>{{ submitting ? 'Envoi en cours...' : 'Soumettre la réclamation' }}</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Zone droite : Mes réclamations -->
        <div class="lg:col-span-7 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black text-slate-900">
              Mes réclamations ({{ myComplaints.length }})
            </h2>
          </div>

          <div *ngIf="loadingHistory" class="py-10 text-center text-slate-500">
            <lucide-icon name="loader-2" class="w-5 h-5 animate-spin mx-auto text-[#047857]"></lucide-icon>
          </div>

          <div *ngIf="!loadingHistory && myComplaints.length === 0"
               class="bg-white border border-slate-200 rounded-xl py-10 text-center text-xs text-slate-500 font-medium">
            Aucune réclamation pour le moment
          </div>

          <!-- Tableau compact Desktop (~40px/ligne) -->
          <div *ngIf="!loadingHistory && paginatedComplaints.length > 0"
               class="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th class="py-2.5 px-3.5">Sujet</th>
                  <th class="py-2.5 px-3 w-44">Élection</th>
                  <th class="py-2.5 px-3 w-28">Date</th>
                  <th class="py-2.5 px-3.5 w-28">Statut</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                <tr *ngFor="let c of paginatedComplaints"
                    (click)="openDetailDrawer(c)"
                    class="h-10 hover:bg-slate-50/80 transition-colors cursor-pointer">
                  <td class="px-3.5 py-1.5 font-semibold text-slate-900 truncate max-w-[200px]" [title]="c.sujet">
                    {{ c.sujet }}
                  </td>
                  <td class="px-3 py-1.5 text-slate-600 truncate max-w-[170px]" [title]="getElectionTitle(c)">
                    {{ getElectionTitle(c) }}
                  </td>
                  <td class="px-3 py-1.5 text-slate-500 text-[11px] whitespace-nowrap">
                    {{ c.createdAt | date:'dd/MM/yyyy' }}
                  </td>
                  <td class="px-3.5 py-1.5">
                    <span [class]="getStatusClass(c.statut)"
                          class="text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                      {{ getStatusLabel(c.statut) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile : Cartes simples -->
          <div *ngIf="!loadingHistory && paginatedComplaints.length > 0" class="grid grid-cols-1 gap-2.5 md:hidden">
            <div *ngFor="let c of paginatedComplaints"
                 (click)="openDetailDrawer(c)"
                 class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5 cursor-pointer">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-bold text-slate-900 truncate">{{ c.sujet }}</p>
                <span [class]="getStatusClass(c.statut)"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
                  {{ getStatusLabel(c.statut) }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 truncate">
                {{ getElectionTitle(c) }} · {{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
          </div>

          <!-- Pagination (8 par page) -->
          <app-pagination
            *ngIf="!loadingHistory"
            [totalItems]="myComplaints.length"
            [pageSize]="pageSize"
            [currentPage]="currentPage"
            itemLabel="réclamation"
            (pageChange)="currentPage = $event">
          </app-pagination>
        </div>
      </div>
    </div>

    <!-- DRAWER DÉTAIL RÉCLAMATION (Lecture seule, ~420px sur desktop, plein écran sur mobile) -->
    <div *ngIf="selectedComplaint"
         (click)="closeDetailDrawer()"
         class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex justify-end">
      <aside (click)="$event.stopPropagation()"
             class="w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <h2 class="text-sm font-black text-slate-900">Détail de la réclamation</h2>
          <button type="button" (click)="closeDetailDrawer()" aria-label="Fermer"
                  class="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div class="min-w-0">
              <h3 class="text-sm font-black text-slate-900">{{ selectedComplaint.sujet }}</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ getElectionTitle(selectedComplaint) }} · {{ selectedComplaint.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <span [class]="getStatusClass(selectedComplaint.statut)"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
              {{ getStatusLabel(selectedComplaint.statut) }}
            </span>
          </div>

          <div class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
            <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {{ selectedComplaint.description }}
            </div>
          </div>

          <div *ngIf="selectedComplaint.reponseCommission" class="space-y-1">
            <p class="text-[10px] font-bold uppercase tracking-wider text-[#047857]">Réponse de la Commission</p>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed whitespace-pre-line">
              {{ selectedComplaint.reponseCommission }}
            </div>
          </div>
        </div>
      </aside>
    </div>
  `
})
export class ComplaintComponent implements OnInit {
  form = { electionId: 0, sujet: '', description: '' };
  elections: Election[] = [];
  myComplaints: ComplaintResponse[] = [];
  submitting = false;
  loadingElections = true;
  loadingHistory = true;

  showInfo = false;
  showMobileForm = false;
  currentPage = 1;
  readonly pageSize = 8;
  selectedComplaint: ComplaintResponse | null = null;

  private complaintService = inject(ComplaintService);
  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);
  authService = inject(AuthService);

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedComplaint) {
      this.closeDetailDrawer();
    }
  }

  ngOnInit(): void {
    this.loadElections();
    this.loadMyComplaints();
  }

  loadElections(): void {
    this.loadingElections = true;
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.loadingElections = false;
      },
      error: () => {
        this.loadingElections = false;
        this.notificationService.showError('Impossible de charger la liste des élections.');
      }
    });
  }

  loadMyComplaints(): void {
    this.loadingHistory = true;
    this.complaintService.getMyComplaints().subscribe({
      next: (data) => {
        this.myComplaints = data;
        this.currentPage = 1;
        this.loadingHistory = false;
      },
      error: () => {
        this.loadingHistory = false;
      }
    });
  }

  get paginatedComplaints(): ComplaintResponse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.myComplaints.slice(start, start + this.pageSize);
  }

  getElectionTitle(c: ComplaintResponse): string {
    if (c.electionTitre) {
      return c.electionTitre;
    }
    const found = this.elections.find(e => e.id === c.electionId);
    return found ? found.titre : `Scrutin #${c.electionId}`;
  }

  openDetailDrawer(c: ComplaintResponse): void {
    this.selectedComplaint = c;
  }

  closeDetailDrawer(): void {
    this.selectedComplaint = null;
  }

  submitComplaint(): void {
    if (this.form.electionId === 0 || !this.form.sujet.trim() || !this.form.description.trim()) {
      this.notificationService.showWarning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.submitting = true;
    this.complaintService.submitComplaint({
      electionId: this.form.electionId,
      sujet: this.form.sujet.trim(),
      description: this.form.description.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.notificationService.showSuccess(
          'Votre réclamation a été transmise à la Commission Électorale.',
          'Réclamation enregistrée'
        );
        this.form = { electionId: 0, sujet: '', description: '' };
        this.showMobileForm = false;
        this.loadMyComplaints();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Une erreur est survenue lors de la soumission.';
        this.notificationService.showError(msg, "Échec de l'envoi");
      }
    });
  }

  getStatusLabel(statut: string): string {
    switch (statut) {
      case 'PENDING': return 'En attente';
      case 'UNDER_REVIEW': return 'En cours';
      case 'RESOLVED': return 'Accordée';
      case 'REJECTED': return 'Rejetée';
      default: return statut;
    }
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNDER_REVIEW': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'RESOLVED': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
}
