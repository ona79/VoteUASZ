import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ElectionService } from '../../services/election.service';
import { ComplaintService, ComplaintResponse } from '../../services/complaint.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, ComplaintStatus } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import { CandidateAvatarComponent } from '../shared/candidate-avatar/candidate-avatar.component';
import { getElectionStatusBadgeClass, getElectionStatusLabel } from '../../utils/election-ui.utils';

@Component({
  selector: 'app-commission-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    PaginationComponent,
    CandidateAvatarComponent
  ],
  template: `
    <!-- Barre du haut fine (~48px) -->
    <app-page-header title="Commission électorale"></app-page-header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
      <!-- Sélecteur compact du scrutin (dropdown + badge statut) -->
      <div class="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <label for="commission-election-select" class="text-xs font-bold text-slate-600 whitespace-nowrap">
            Scrutin :
          </label>
          <select id="commission-election-select"
                  [ngModel]="selectedElectionId"
                  (ngModelChange)="onElectionSelect($event)"
                  class="h-8 flex-1 max-w-md px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#047857]">
            <option *ngFor="let e of elections" [ngValue]="e.id">
              {{ e.titre }} ({{ getElectionStatusLabel(e.statut) }}){{ pendingComplaintsByElection[e.id] ? ' — ' + pendingComplaintsByElection[e.id] + ' récl. en attente' : '' }}
            </option>
          </select>
        </div>

        <span *ngIf="selectedElection as el"
              [class]="getElectionStatusBadgeClass(el.statut)"
              class="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-md border w-max shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
          <span>{{ getElectionStatusLabel(el.statut) }}</span>
        </span>
      </div>

      <!-- Alerte compacte si des réclamations en attente existent sur d'autres scrutins -->
      <div *ngIf="pendingComplaintAlerts.length > 0"
           class="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 flex flex-wrap items-center gap-2 text-xs text-amber-900">
        <span class="inline-flex items-center space-x-1.5 font-semibold shrink-0">
          <lucide-icon name="alert-triangle" class="w-3.5 h-3.5 text-amber-600 shrink-0"></lucide-icon>
          <span>Réclamation(s) en attente :</span>
        </span>
        <button *ngFor="let alert of pendingComplaintAlerts"
                type="button"
                (click)="jumpToComplaints(alert.id)"
                class="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition inline-flex items-center space-x-1">
          <span>{{ alert.titre }}</span>
          <span class="px-1 rounded bg-amber-100 text-amber-800">{{ alert.count }}</span>
        </button>
      </div>

      <!-- Deux onglets avec compteurs -->
      <div *ngIf="selectedElectionId" class="flex items-center gap-1 border-b border-slate-200">
        <button type="button" (click)="activeTab = 'candidatures'"
                [class]="activeTab === 'candidatures'
                  ? 'border-[#047857] text-[#047857] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'"
                class="px-3.5 py-2 border-b-2 text-xs font-bold transition inline-flex items-center space-x-2">
          <span>Dossiers de candidature</span>
          <span [class]="activeTab === 'candidatures' ? 'bg-emerald-50 text-[#047857] border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                class="px-1.5 py-0 rounded text-[10px] font-bold border">
            {{ candidatures.length }}
          </span>
        </button>

        <button type="button" (click)="activeTab = 'complaints'"
                [class]="activeTab === 'complaints'
                  ? 'border-[#047857] text-[#047857] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'"
                class="px-3.5 py-2 border-b-2 text-xs font-bold transition inline-flex items-center space-x-2">
          <span>Réclamations</span>
          <span [class]="activeTab === 'complaints' ? 'bg-emerald-50 text-[#047857] border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                class="px-1.5 py-0 rounded text-[10px] font-bold border">
            {{ complaints.length }}
          </span>
        </button>
      </div>

      <!-- ONGLET 1 : DOSSIERS DE CANDIDATURE -->
      <ng-container *ngIf="selectedElectionId && activeTab === 'candidatures'">
        <!-- Tableau compact Desktop (~40px/ligne) -->
        <div *ngIf="paginatedCandidatures.length > 0"
             class="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th class="py-2.5 px-3.5">Candidat</th>
                <th class="py-2.5 px-3 w-32">Matricule</th>
                <th class="py-2.5 px-3">Liste</th>
                <th class="py-2.5 px-3 w-28">Statut</th>
                <th class="py-2.5 px-3 w-28">Documents</th>
                <th class="py-2.5 px-3.5 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr *ngFor="let c of paginatedCandidatures"
                  (click)="openCandidatureDrawer(c)"
                  class="h-10 hover:bg-slate-50/80 transition-colors cursor-pointer">
                <td class="px-3.5 py-1.5">
                  <div class="flex items-center space-x-2.5">
                    <app-candidate-avatar [photoUrl]="c.photoUrl" [name]="getCandidateName(c)"></app-candidate-avatar>
                    <span class="font-semibold text-slate-900 truncate max-w-[200px]">{{ getCandidateName(c) }}</span>
                  </div>
                </td>
                <td class="px-3 py-1.5 text-slate-600 font-mono text-[11px]">
                  {{ c.candidatMatricule || '—' }}
                </td>
                <td class="px-3 py-1.5 text-slate-700 truncate max-w-[180px]">
                  {{ c.nomListe || '—' }}
                </td>
                <td class="px-3 py-1.5">
                  <span [class]="getCandidacyStatusClass(c.statut)"
                        class="text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                    {{ getCandidacyStatusLabel(c.statut) }}
                  </span>
                </td>
                <td class="px-3 py-1.5" (click)="$event.stopPropagation()">
                  <div class="inline-flex items-center space-x-1.5">
                    <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank" title="CV PDF"
                       class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center transition">
                      <lucide-icon name="file-check" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                    </a>
                    <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank" title="Programme PDF"
                       class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center transition">
                      <lucide-icon name="file-text" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
                    </a>
                    <span *ngIf="!c.cvUrl && !c.programmePdf" class="text-slate-400">—</span>
                  </div>
                </td>
                <td class="px-3.5 py-1.5 text-right">
                  <button type="button" (click)="openCandidatureDrawer(c); $event.stopPropagation()"
                          title="Examiner le dossier"
                          class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#047857] hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition">
                    <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cartes simples (Candidatures) -->
        <div *ngIf="paginatedCandidatures.length > 0" class="grid grid-cols-1 gap-2.5 md:hidden">
          <div *ngFor="let c of paginatedCandidatures"
               (click)="openCandidatureDrawer(c)"
               class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 cursor-pointer">
            <div class="flex items-center space-x-2.5 min-w-0">
              <app-candidate-avatar [photoUrl]="c.photoUrl" [name]="getCandidateName(c)" sizeClass="w-9 h-9 text-xs"></app-candidate-avatar>
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-900 truncate">{{ getCandidateName(c) }}</p>
                <p class="text-[11px] text-slate-500 truncate">{{ c.nomListe || c.candidatMatricule || 'Candidature' }}</p>
              </div>
            </div>
            <span [class]="getCandidacyStatusClass(c.statut)"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
              {{ getCandidacyStatusLabel(c.statut) }}
            </span>
          </div>
        </div>

        <!-- État vide Candidatures -->
        <div *ngIf="candidatures.length === 0"
             class="bg-white border border-slate-200 rounded-xl py-10 text-center">
          <p class="text-xs font-semibold text-slate-500">Aucune candidature soumise pour ce scrutin.</p>
        </div>

        <app-pagination
          [totalItems]="candidatures.length"
          [pageSize]="pageSize"
          [currentPage]="candidaturesPage"
          itemLabel="dossier"
          (pageChange)="candidaturesPage = $event">
        </app-pagination>
      </ng-container>

      <!-- ONGLET 2 : RÉCLAMATIONS -->
      <ng-container *ngIf="selectedElectionId && activeTab === 'complaints'">
        <!-- Tableau compact Desktop (~40px/ligne) -->
        <div *ngIf="paginatedComplaints.length > 0"
             class="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th class="py-2.5 px-3.5">Sujet</th>
                <th class="py-2.5 px-3 w-44">Auteur</th>
                <th class="py-2.5 px-3 w-36">Date</th>
                <th class="py-2.5 px-3 w-32">Statut</th>
                <th class="py-2.5 px-3.5 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr *ngFor="let item of paginatedComplaints"
                  (click)="openComplaintDrawer(item)"
                  class="h-10 hover:bg-slate-50/80 transition-colors cursor-pointer">
                <td class="px-3.5 py-1.5 font-semibold text-slate-900 truncate max-w-sm" [title]="item.sujet">
                  {{ item.sujet }}
                </td>
                <td class="px-3 py-1.5 text-slate-600 truncate">
                  {{ item.auteurNomComplet || 'Électeur' }}
                </td>
                <td class="px-3 py-1.5 text-slate-500 text-[11px]">
                  {{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}
                </td>
                <td class="px-3 py-1.5">
                  <span [class]="getComplaintStatusClass(item.statut)"
                        class="text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                    {{ getComplaintStatusLabel(item.statut) }}
                  </span>
                </td>
                <td class="px-3.5 py-1.5 text-right">
                  <button type="button" (click)="openComplaintDrawer(item); $event.stopPropagation()"
                          title="Examiner le recours"
                          class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#047857] hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition">
                    <lucide-icon name="arrow-right" class="w-4 h-4"></lucide-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cartes simples (Réclamations) -->
        <div *ngIf="paginatedComplaints.length > 0" class="grid grid-cols-1 gap-2.5 md:hidden">
          <div *ngFor="let item of paginatedComplaints"
               (click)="openComplaintDrawer(item)"
               class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5 cursor-pointer">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-bold text-slate-900 truncate">{{ item.sujet }}</p>
              <span [class]="getComplaintStatusClass(item.statut)"
                    class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
                {{ getComplaintStatusLabel(item.statut) }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500">
              {{ item.auteurNomComplet || 'Électeur' }} · {{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}
            </p>
          </div>
        </div>

        <!-- État vide Réclamations -->
        <div *ngIf="complaints.length === 0"
             class="bg-white border border-slate-200 rounded-xl py-10 text-center">
          <p class="text-xs font-semibold text-slate-500">Aucune réclamation enregistrée pour ce scrutin.</p>
        </div>

        <app-pagination
          [totalItems]="complaints.length"
          [pageSize]="pageSize"
          [currentPage]="complaintsPage"
          itemLabel="réclamation"
          (pageChange)="complaintsPage = $event">
        </app-pagination>
      </ng-container>
    </div>

    <!-- DRAWER DÉTAIL CANDIDATURE (~420px sur desktop, plein écran sur mobile) -->
    <div *ngIf="selectedCandidature"
         (click)="closeCandidatureDrawer()"
         class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex justify-end">
      <aside (click)="$event.stopPropagation()"
             class="w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <h2 class="text-sm font-black text-slate-900">Dossier de candidature</h2>
          <button type="button" (click)="closeCandidatureDrawer()" aria-label="Fermer"
                  class="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex items-center space-x-3 pb-3 border-b border-slate-100">
            <app-candidate-avatar
              [photoUrl]="selectedCandidature.photoUrl"
              [name]="getCandidateName(selectedCandidature)"
              sizeClass="w-12 h-12 text-sm">
            </app-candidate-avatar>
            <div class="min-w-0">
              <h3 class="text-sm font-black text-slate-900 truncate">{{ getCandidateName(selectedCandidature) }}</h3>
              <p *ngIf="selectedCandidature.nomListe" class="text-xs text-slate-600 font-medium truncate">
                {{ selectedCandidature.nomListe }}
              </p>
              <p *ngIf="selectedCandidature.candidatMatricule" class="text-[11px] text-slate-500 font-mono">
                {{ selectedCandidature.candidatMatricule }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-500">Statut actuel</span>
            <span [class]="getCandidacyStatusClass(selectedCandidature.statut)"
                  class="text-[10px] font-bold px-2.5 py-0.5 rounded-md border">
              {{ getCandidacyStatusLabel(selectedCandidature.statut) }}
            </span>
          </div>

          <!-- Pièces jointes -->
          <div class="space-y-2">
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Documents du dossier</p>
            <div class="flex flex-wrap gap-2">
              <a *ngIf="selectedCandidature.cvUrl" [href]="selectedCandidature.cvUrl" target="_blank"
                 class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 inline-flex items-center space-x-1.5">
                <lucide-icon name="file-check" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                <span>Consulter le CV</span>
              </a>
              <a *ngIf="selectedCandidature.programmePdf" [href]="selectedCandidature.programmePdf" target="_blank"
                 class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 inline-flex items-center space-x-1.5">
                <lucide-icon name="file-text" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
                <span>Programme PDF</span>
              </a>
              <span *ngIf="!selectedCandidature.cvUrl && !selectedCandidature.programmePdf" class="text-xs text-slate-400">
                Aucun document fourni.
              </span>
            </div>
          </div>

          <div *ngIf="selectedCandidature.motifRejet" class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <strong class="block font-bold mb-0.5">Motif du rejet :</strong>
            {{ selectedCandidature.motifRejet }}
          </div>

          <!-- Zone de rejet (motif obligatoire) -->
          <div *ngIf="selectedCandidature.statut === 'PENDING' && showRejectForm" class="space-y-2 pt-2 border-t border-slate-100">
            <label for="reject-motif" class="block text-xs font-bold text-slate-700">Motif du rejet *</label>
            <textarea id="reject-motif" [(ngModel)]="rejectMotif" rows="3"
                      placeholder="Saisissez le motif du rejet (obligatoire)..."
                      class="uasz-input text-xs"></textarea>
            <p *ngIf="rejectError" class="text-[11px] font-semibold text-[#dc2626]">{{ rejectError }}</p>
            <div class="flex items-center gap-2 pt-1">
              <button type="button" (click)="showRejectForm = false; rejectError = ''"
                      class="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
              <button type="button" (click)="confirmRejectCandidacy()" [disabled]="actionLoading"
                      class="flex-1 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50">
                Confirmer le rejet
              </button>
            </div>
          </div>

          <!-- Boutons principaux Valider / Rejeter -->
          <div *ngIf="selectedCandidature.statut === 'PENDING' && !showRejectForm"
               class="flex items-center gap-2 pt-3 border-t border-slate-100">
            <button type="button" (click)="approveSelectedCandidacy()" [disabled]="actionLoading"
                    class="flex-1 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5 disabled:opacity-50">
              <lucide-icon name="check" class="w-3.5 h-3.5"></lucide-icon>
              <span>Valider</span>
            </button>
            <button type="button" (click)="showRejectForm = true; rejectMotif = ''; rejectError = ''"
                    class="flex-1 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5">
              <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
              <span>Rejeter</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- DRAWER DÉTAIL RÉCLAMATION (~420px sur desktop, plein écran sur mobile) -->
    <div *ngIf="selectedComplaint"
         (click)="closeComplaintDrawer()"
         class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex justify-end">
      <aside (click)="$event.stopPropagation()"
             class="w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <h2 class="text-sm font-black text-slate-900">Détail de la réclamation</h2>
          <button type="button" (click)="closeComplaintDrawer()" aria-label="Fermer"
                  class="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-sm font-black text-slate-900">{{ selectedComplaint.sujet }}</h3>
              <p class="text-[11px] text-slate-500 mt-0.5">
                {{ selectedComplaint.auteurNomComplet || 'Électeur' }} · {{ selectedComplaint.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <span [class]="getComplaintStatusClass(selectedComplaint.statut)"
                  class="text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0">
              {{ getComplaintStatusLabel(selectedComplaint.statut) }}
            </span>
          </div>

          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
            {{ selectedComplaint.description }}
          </div>

          <div *ngIf="selectedComplaint.reponseCommission"
               class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong class="block font-bold text-[#047857] mb-0.5">Décision de la Commission :</strong>
            {{ selectedComplaint.reponseCommission }}
          </div>

          <!-- Formulaire de réponse si PENDING / UNDER_REVIEW -->
          <div *ngIf="selectedComplaint.statut === 'PENDING' || selectedComplaint.statut === 'UNDER_REVIEW'"
               class="space-y-2.5 pt-2 border-t border-slate-100">
            <label for="complaint-response" class="block text-xs font-bold text-slate-700">Réponse officielle *</label>
            <textarea id="complaint-response" [(ngModel)]="complaintResponseText" rows="3"
                      placeholder="Saisissez les motifs et la décision de la Commission..."
                      class="uasz-input text-xs"></textarea>
            <p *ngIf="complaintError" class="text-[11px] font-semibold text-[#dc2626]">{{ complaintError }}</p>
            <div class="flex items-center gap-2 pt-1">
              <button type="button" (click)="submitComplaintDecision('RESOLVED')" [disabled]="actionLoading"
                      class="flex-1 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold disabled:opacity-50">
                Accorder
              </button>
              <button type="button" (click)="submitComplaintDecision('REJECTED')" [disabled]="actionLoading"
                      class="flex-1 py-2 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50">
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  `
})
export class CommissionDashboardComponent implements OnInit {
  private static readonly LAST_ELECTION_KEY = 'voteuasz_commission_election_id';

  elections: Election[] = [];
  selectedElectionId: number | null = null;
  candidatures: Candidature[] = [];
  complaints: ComplaintResponse[] = [];

  activeTab: 'candidatures' | 'complaints' = 'candidatures';
  candidaturesPage = 1;
  complaintsPage = 1;
  readonly pageSize = 8;
  pendingComplaintsByElection: Record<number, number> = {};

  // Drawers & formulaires
  selectedCandidature: Candidature | null = null;
  showRejectForm = false;
  rejectMotif = '';
  rejectError = '';

  selectedComplaint: ComplaintResponse | null = null;
  complaintResponseText = '';
  complaintError = '';
  actionLoading = false;

  getElectionStatusLabel = getElectionStatusLabel;
  getElectionStatusBadgeClass = getElectionStatusBadgeClass;

  private electionService = inject(ElectionService);
  private complaintService = inject(ComplaintService);
  private notificationService = inject(NotificationService);

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.selectedCandidature) {
      this.closeCandidatureDrawer();
    } else if (this.selectedComplaint) {
      this.closeComplaintDrawer();
    }
  }

  ngOnInit(): void {
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.refreshPendingComplaintsCounts();
        if (data.length > 0) {
          const savedId = Number(localStorage.getItem(CommissionDashboardComponent.LAST_ELECTION_KEY));
          const exists = savedId && data.some(e => e.id === savedId);
          this.onElectionSelect(exists ? savedId : data[0].id);
        }
      },
      error: () => this.notificationService.showError('Impossible de charger les scrutins.')
    });
  }

  get pendingComplaintAlerts(): { id: number; titre: string; count: number }[] {
    return this.elections
      .filter(e => (this.pendingComplaintsByElection[e.id] || 0) > 0)
      .map(e => ({ id: e.id, titre: e.titre, count: this.pendingComplaintsByElection[e.id] }));
  }

  jumpToComplaints(electionId: number): void {
    this.activeTab = 'complaints';
    if (this.selectedElectionId !== electionId) {
      this.onElectionSelect(electionId);
    }
  }

  private refreshPendingComplaintsCounts(): void {
    if (this.elections.length === 0) {
      this.pendingComplaintsByElection = {};
      return;
    }
    const calls = this.elections.map(e =>
      this.complaintService.getComplaintsByElection(e.id).pipe(catchError(() => of([] as ComplaintResponse[])))
    );
    forkJoin(calls).subscribe((lists) => {
      const counts: Record<number, number> = {};
      this.elections.forEach((e, idx) => {
        const pending = lists[idx].filter(c => c.statut === 'PENDING' || c.statut === 'UNDER_REVIEW').length;
        if (pending > 0) {
          counts[e.id] = pending;
        }
      });
      this.pendingComplaintsByElection = counts;
    });
  }

  get selectedElection(): Election | undefined {
    return this.elections.find(e => e.id === this.selectedElectionId);
  }

  onElectionSelect(id: number): void {
    if (!id || this.selectedElectionId === id) {
      return;
    }
    this.selectedElectionId = id;
    localStorage.setItem(CommissionDashboardComponent.LAST_ELECTION_KEY, String(id));
    this.candidaturesPage = 1;
    this.complaintsPage = 1;
    this.closeCandidatureDrawer();
    this.closeComplaintDrawer();
    this.loadElectionData(id);
  }

  private loadElectionData(id: number): void {
    this.electionService.getCandidatures(id).subscribe({
      next: (data) => {
        this.candidatures = data;
      },
      error: () => this.notificationService.showError("Impossible de charger les dossiers de candidature.")
    });
    this.complaintService.getComplaintsByElection(id).subscribe({
      next: (data) => {
        this.complaints = data;
      },
      error: () => {
        this.complaints = [];
      }
    });
  }

  get paginatedCandidatures(): Candidature[] {
    const start = (this.candidaturesPage - 1) * this.pageSize;
    return this.candidatures.slice(start, start + this.pageSize);
  }

  get paginatedComplaints(): ComplaintResponse[] {
    const start = (this.complaintsPage - 1) * this.pageSize;
    return this.complaints.slice(start, start + this.pageSize);
  }

  getCandidateName(c: Candidature): string {
    return c.candidatNomComplet || (c.candidatPrenom ? `${c.candidatPrenom} ${c.candidatNom || ''}`.trim() : (c.nomListe || 'Candidat'));
  }

  openCandidatureDrawer(c: Candidature): void {
    this.selectedComplaint = null;
    this.selectedCandidature = c;
    this.showRejectForm = false;
    this.rejectMotif = '';
    this.rejectError = '';
  }

  closeCandidatureDrawer(): void {
    this.selectedCandidature = null;
    this.showRejectForm = false;
    this.rejectMotif = '';
    this.rejectError = '';
  }

  approveSelectedCandidacy(): void {
    if (!this.selectedCandidature) {
      return;
    }
    this.updateStatus(this.selectedCandidature.id, 'APPROVED');
  }

  confirmRejectCandidacy(): void {
    if (!this.selectedCandidature) {
      return;
    }
    const motif = this.rejectMotif.trim();
    if (!motif) {
      this.rejectError = 'Le motif du rejet est obligatoire.';
      return;
    }
    if (!window.confirm('Confirmer le rejet de cette candidature ?')) {
      return;
    }
    this.rejectError = '';
    this.updateStatus(this.selectedCandidature.id, 'REJECTED', motif);
  }

  updateStatus(candidatureId: number, status: 'APPROVED' | 'REJECTED', motif?: string): void {
    this.actionLoading = true;
    this.electionService.updateCandidacyStatus(candidatureId, status, motif).subscribe({
      next: () => {
        this.actionLoading = false;
        this.notificationService.showSuccess(status === 'APPROVED' ? 'Candidature validée avec succès.' : 'Candidature rejetée.');
        this.closeCandidatureDrawer();
        if (this.selectedElectionId) {
          this.electionService.getCandidatures(this.selectedElectionId).subscribe(d => this.candidatures = d);
        }
      },
      error: (err) => {
        this.actionLoading = false;
        this.notificationService.showError(err.error?.message || err.message || "Erreur lors de la mise à jour.");
      }
    });
  }

  openComplaintDrawer(item: ComplaintResponse): void {
    this.selectedCandidature = null;
    this.selectedComplaint = item;
    this.complaintResponseText = '';
    this.complaintError = '';
  }

  closeComplaintDrawer(): void {
    this.selectedComplaint = null;
    this.complaintResponseText = '';
    this.complaintError = '';
  }

  submitComplaintDecision(status: ComplaintStatus): void {
    if (!this.selectedComplaint) {
      return;
    }
    const reponse = this.complaintResponseText.trim();
    if (!reponse) {
      this.complaintError = 'La réponse officielle est obligatoire.';
      return;
    }
    if (!window.confirm(status === 'RESOLVED' ? 'Confirmer la décision d’accorder ce recours ?' : 'Confirmer le rejet de ce recours ?')) {
      return;
    }
    this.complaintError = '';
    this.actionLoading = true;
    this.complaintService.resolveComplaint(this.selectedComplaint.id, status, reponse).subscribe({
      next: () => {
        this.actionLoading = false;
        this.notificationService.showSuccess("Décision sur le recours enregistrée.");
        this.closeComplaintDrawer();
        this.refreshPendingComplaintsCounts();
        if (this.selectedElectionId) {
          this.complaintService.getComplaintsByElection(this.selectedElectionId).subscribe(data => this.complaints = data);
        }
      },
      error: (err) => {
        this.actionLoading = false;
        this.notificationService.showError(err.error?.message || "Erreur lors de l'enregistrement de la décision.");
      }
    });
  }

  getCandidacyStatusLabel(status: string): string {
    switch (status) {
      case 'APPROVED': return 'Approuvé';
      case 'REJECTED': return 'Rejeté';
      default: return 'En attente';
    }
  }

  getCandidacyStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }

  getComplaintStatusLabel(status: string): string {
    switch (status) {
      case 'RESOLVED': return 'Accordé';
      case 'REJECTED': return 'Rejeté';
      case 'UNDER_REVIEW': return 'En examen';
      default: return 'En attente';
    }
  }

  getComplaintStatusClass(status: string): string {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-red-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }
}
