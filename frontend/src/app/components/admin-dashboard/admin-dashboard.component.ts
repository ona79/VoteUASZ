import { Component, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { Election, ElectionStatus, UserImportResult, Candidature, AuditReportDto } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { ElectionToolbarComponent } from '../shared/election-toolbar/election-toolbar.component';
import { PaginationComponent } from '../shared/pagination/pagination.component';
import {
  getElectionScopeLabel,
  getElectionStatusBadgeClass,
  getElectionStatusLabel
} from '../../utils/election-ui.utils';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    ElectionToolbarComponent,
    PaginationComponent
  ],
  template: `
    <!-- Barre du haut fine (~48px) -->
    <app-page-header title="Administration">
      <button type="button" (click)="openDrawer('import')"
              class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition inline-flex items-center space-x-1.5">
        <lucide-icon name="upload" class="w-3.5 h-3.5"></lucide-icon>
        <span class="hidden sm:inline">Importer des électeurs</span>
        <span class="sm:hidden">CSV</span>
      </button>
      <button type="button" (click)="openDrawer('election')"
              class="px-3 py-1 rounded-lg bg-white text-[#047857] hover:bg-emerald-50 text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-sm">
        <lucide-icon name="plus" class="w-3.5 h-3.5"></lucide-icon>
        <span>Nouveau scrutin</span>
      </button>
    </app-page-header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3" (click)="closeActionMenu()">
      <!-- Barre d'outils partagée (recherche, chips statut, filtre UFR) -->
      <app-election-toolbar
        #toolbar
        [elections]="elections"
        [ufrList]="ufrList"
        [showViewSwitch]="false"
        (filteredChange)="onFilteredChange($event)">
      </app-election-toolbar>

      <!-- VUE LISTE COMPACTE PLEINE LARGEUR (Desktop ~40px/ligne) -->
      <div *ngIf="paginatedElections.length > 0"
           class="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-2.5 px-3.5">Scrutin</th>
              <th class="py-2.5 px-3 w-28">Type</th>
              <th class="py-2.5 px-3 w-40">Périmètre</th>
              <th class="py-2.5 px-3 w-32">Statut</th>
              <th class="py-2.5 px-3 w-36">Progression</th>
              <th class="py-2.5 px-3.5 w-44 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            <tr *ngFor="let election of paginatedElections" class="h-10 hover:bg-slate-50/80 transition-colors">
              <td class="px-3.5 py-1.5 font-semibold text-slate-900 max-w-xs truncate" [title]="election.titre">
                {{ election.titre }}
              </td>
              <td class="px-3 py-1.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
                  {{ election.type }}
                </span>
              </td>
              <td class="px-3 py-1.5 text-slate-600 truncate max-w-[160px]" [title]="getScopeLabel(election)">
                {{ getScopeLabel(election) }}
              </td>
              <td class="px-3 py-1.5">
                <span [class]="getStatusBadgeClass(election.statut)"
                      class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{{ getStatusLabel(election.statut) }}</span>
                </span>
              </td>
              <td class="px-3 py-1.5">
                <!-- Mini-timeline 6 segments avec tooltip -->
                <div class="flex items-center gap-1" [attr.aria-label]="'Progression : ' + getStatusLabel(election.statut)">
                  <div *ngFor="let step of steps; let i = index"
                       [title]="getStepShortLabel(step)"
                       [class]="i <= getStepIndex(election.statut) ? 'bg-[#047857]' : 'bg-slate-200'"
                       class="h-1.5 flex-1 rounded-full transition-colors">
                  </div>
                </div>
              </td>
              <td class="px-3.5 py-1.5 text-right">
                <div class="inline-flex items-center justify-end gap-1.5 relative">
                  <!-- Bouton principal d'avancement d'état en vert -->
                  <button *ngIf="getNextStatus(election.statut) as next"
                          type="button"
                          (click)="changeStatus(election.id, next.status)"
                          class="h-7 px-2.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold transition whitespace-nowrap">
                    {{ next.label }}
                  </button>
                  <span *ngIf="election.statut === 'CLOTURE'"
                        class="h-7 px-2 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold inline-flex items-center border border-slate-200">
                    Terminé
                  </span>

                  <!-- Menu "..." -->
                  <button type="button"
                          (click)="toggleActionMenu(election.id, $event)"
                          title="Plus d'actions"
                          class="h-7 w-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 inline-flex items-center justify-center transition">
                    <lucide-icon name="more-horizontal" class="w-4 h-4"></lucide-icon>
                  </button>

                  <!-- Dropdown Actions -->
                  <div *ngIf="openMenuElectionId === election.id"
                       (click)="$event.stopPropagation()"
                       class="absolute right-0 top-8 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-left">
                    <button type="button" (click)="openCandidaciesModal(election); closeActionMenu()"
                            class="w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2">
                      <lucide-icon name="file-text" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                      <span>Dossiers</span>
                    </button>
                    <button type="button" (click)="openAuditModal(election); closeActionMenu()"
                            class="w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2">
                      <lucide-icon name="shield" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                      <span>Audit</span>
                    </button>
                    <button *ngIf="election.statut === 'PUBLICATION' || election.statut === 'CLOTURE'"
                            type="button" (click)="downloadPdf(election.id); closeActionMenu()"
                            class="w-full px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2">
                      <lucide-icon name="file-check" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
                      <span>PV PDF</span>
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- VUE MOBILE (Cartes simples) -->
      <div *ngIf="paginatedElections.length > 0" class="grid grid-cols-1 gap-2.5 md:hidden">
        <div *ngFor="let election of paginatedElections"
             class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-700 border-slate-200">
              {{ election.type }}
            </span>
            <span [class]="getStatusBadgeClass(election.statut)"
                  class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border">
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{{ getStatusLabel(election.statut) }}</span>
            </span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900 leading-snug">{{ election.titre }}</h3>
            <p class="text-[11px] text-slate-500 mt-0.5">{{ getScopeLabel(election) }}</p>
          </div>
          <!-- Mini-timeline 6 segments -->
          <div class="flex items-center gap-1">
            <div *ngFor="let step of steps; let i = index"
                 [title]="getStepShortLabel(step)"
                 [class]="i <= getStepIndex(election.statut) ? 'bg-[#047857]' : 'bg-slate-200'"
                 class="h-1.5 flex-1 rounded-full">
            </div>
          </div>
          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <button type="button" (click)="openCandidaciesModal(election)"
                      class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                Dossiers
              </button>
              <button type="button" (click)="openAuditModal(election)"
                      class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                Audit
              </button>
            </div>
            <button *ngIf="getNextStatus(election.statut) as next"
                    type="button" (click)="changeStatus(election.id, next.status)"
                    class="px-2.5 py-1 rounded-lg bg-[#047857] text-white text-[11px] font-bold">
              {{ next.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- État vide -->
      <div *ngIf="filteredElections.length === 0"
           class="bg-white border border-slate-200 rounded-xl py-10 text-center">
        <p class="text-xs font-bold text-slate-600">Aucun scrutin ne correspond à vos critères.</p>
        <button *ngIf="elections.length > 0" type="button" (click)="toolbar.reset()"
                class="mt-2 text-xs font-semibold text-[#047857] hover:underline">
          Réinitialiser les filtres
        </button>
      </div>

      <!-- Pagination partagée (8 par page) -->
      <app-pagination
        [totalItems]="filteredElections.length"
        [pageSize]="pageSize"
        [currentPage]="currentPage"
        itemLabel="scrutin"
        (pageChange)="currentPage = $event">
      </app-pagination>
    </div>

    <!-- DRAWER DROIT (Nouveau scrutin / Import CSV, ~420px sur desktop, plein écran sur mobile) -->
    <div *ngIf="activeDrawer !== 'none'"
         (click)="closeDrawer()"
         class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex justify-end">
      <aside (click)="$event.stopPropagation()"
             class="w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <!-- Header Drawer -->
        <div class="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <h2 class="text-sm font-black text-slate-900">
            {{ activeDrawer === 'election' ? 'Nouveau scrutin' : 'Import électeurs (CSV)' }}
          </h2>
          <button type="button" (click)="closeDrawer()" aria-label="Fermer"
                  class="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <!-- Body Drawer: Nouveau scrutin -->
        <div *ngIf="activeDrawer === 'election'" class="flex-1 overflow-y-auto p-4">
          <form (ngSubmit)="createElection()" class="space-y-3.5">
            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Titre *</label>
              <input type="text" [(ngModel)]="newElection.titre" name="titre" required placeholder="ex: Délégué L3 Informatique"
                     class="uasz-input !py-2 !px-3 text-xs"/>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Type *</label>
              <select [(ngModel)]="newElection.type" name="type" required
                      class="uasz-input !py-2 !px-3 text-xs font-semibold">
                <option value="DELEGUE">DÉLÉGUÉ</option>
                <option value="DUFR">DIR. UFR</option>
                <option value="VICE_RECTEUR">VICE-RECTEUR</option>
              </select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Date d'ouverture *</label>
                <input type="datetime-local" [(ngModel)]="newElection.dateDebut" name="dateDebut" required
                       class="uasz-input !py-2 !px-2.5 text-xs bg-white"/>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Date de clôture *</label>
                <input type="datetime-local" [(ngModel)]="newElection.dateFin" name="dateFin" required
                       class="uasz-input !py-2 !px-2.5 text-xs bg-white"/>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100">
              <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Périmètre électoral (optionnel)</p>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] font-semibold text-slate-600 mb-1">UFR</label>
                  <input type="text" [(ngModel)]="newElection.targetUfr" name="targetUfr" placeholder="UFR_SAT"
                         class="uasz-input !py-1.5 !px-2 text-xs"/>
                </div>
                <div>
                  <label class="block text-[10px] font-semibold text-slate-600 mb-1">Filière</label>
                  <input type="text" [(ngModel)]="newElection.targetFiliere" name="targetFiliere" placeholder="INFO"
                         class="uasz-input !py-1.5 !px-2 text-xs"/>
                </div>
                <div>
                  <label class="block text-[10px] font-semibold text-slate-600 mb-1">Niveau</label>
                  <input type="text" [(ngModel)]="newElection.targetNiveau" name="targetNiveau" placeholder="L3"
                         class="uasz-input !py-1.5 !px-2 text-xs"/>
                </div>
              </div>
            </div>

            <div class="pt-3 flex items-center justify-end gap-2">
              <button type="button" (click)="closeDrawer()"
                      class="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                Annuler
              </button>
              <button type="submit" [disabled]="createLoading"
                      class="px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition inline-flex items-center space-x-1.5 disabled:opacity-50">
                <span *ngIf="!createLoading">Créer le scrutin</span>
                <lucide-icon *ngIf="createLoading" name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
              </button>
            </div>
          </form>
        </div>

        <!-- Body Drawer: Import électeurs (CSV) -->
        <div *ngIf="activeDrawer === 'import'" class="flex-1 overflow-y-auto p-4 space-y-4">
          <p class="text-xs text-slate-600 leading-relaxed">
            Importez les étudiants, enseignants et personnels habilités via un fichier CSV.
          </p>

          <div class="space-y-3">
            <input type="file" (change)="onFileSelected($event)" accept=".csv"
                   class="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>

            <button type="button" (click)="uploadCsv()" [disabled]="!selectedFile || csvLoading"
                    class="w-full py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition inline-flex items-center justify-center space-x-1.5 disabled:opacity-50">
              <span *ngIf="!csvLoading">Lancer l'importation</span>
              <lucide-icon *ngIf="csvLoading" name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            </button>
          </div>

          <!-- Résultat de l'import -->
          <div *ngIf="importResult" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-900">Résultat :</span>
              <span class="text-[#047857] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center space-x-1">
                <lucide-icon name="check-circle-2" class="w-3 h-3"></lucide-icon>
                <span>{{ importResult.totalSuccess }} importé(s)</span>
              </span>
            </div>
            <p *ngIf="importResult.totalFailed > 0" class="text-[#dc2626] font-semibold flex items-center space-x-1">
              <lucide-icon name="alert-triangle" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ importResult.totalFailed }} ignoré(s) / erreur(s)</span>
            </p>
            <div *ngIf="importResult.errors && importResult.errors.length > 0"
                 class="max-h-48 overflow-y-auto space-y-1 text-[11px] text-slate-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <div *ngFor="let err of importResult.errors">{{ err }}</div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- MODAL VALIDATION CANDIDATURES (SUPER-ADMIN) -->
    <div *ngIf="selectedElectionForCandidacies"
         (click)="closeCandidaciesModal()"
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div (click)="$event.stopPropagation()"
           class="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <span class="text-[10px] font-bold text-[#047857] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Validation des dossiers
            </span>
            <h3 class="text-base font-black text-slate-900 mt-1">{{ selectedElectionForCandidacies.titre }}</h3>
          </div>
          <button type="button" (click)="closeCandidaciesModal()"
                  class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div *ngIf="loadingCandidatures" class="py-10 text-center">
          <lucide-icon name="loader-2" class="w-5 h-5 animate-spin text-[#047857] mx-auto"></lucide-icon>
          <p class="text-xs text-slate-500 mt-2">Chargement des dossiers...</p>
        </div>

        <div *ngIf="!loadingCandidatures && candidatures.length === 0"
             class="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p class="text-xs font-semibold text-slate-500">Aucune candidature soumise pour ce scrutin.</p>
        </div>

        <div *ngIf="!loadingCandidatures && candidatures.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div *ngFor="let c of candidatures" class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-xs font-bold text-slate-900">
                  {{ c.candidatNomComplet || (c.candidatPrenom ? (c.candidatPrenom + ' ' + (c.candidatNom || '')) : (c.nomListe || 'Candidat')) }}
                </span>
                <span [class]="getCandidacyStatusClass(c.statut)" class="text-[9px] px-2 py-0.5 rounded font-bold uppercase border">
                  {{ c.statut }}
                </span>
              </div>
              <p *ngIf="c.candidatMatricule" class="text-[10px] text-slate-500 font-semibold mb-2">
                Matricule : {{ c.candidatMatricule }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank"
                   class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1d4ed8] border border-blue-200">
                  Programme PDF
                </a>
                <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank"
                   class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#1d4ed8] border border-blue-200">
                  CV PDF
                </a>
              </div>
            </div>

            <div *ngIf="c.statut === 'PENDING'" class="flex space-x-2 pt-2.5 border-t border-slate-200 mt-3">
              <button type="button" (click)="updateCandidacyStatus(c.id, 'APPROVED')"
                      class="flex-1 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold">
                Valider
              </button>
              <button type="button" (click)="rejectCandidacy(c.id)"
                      class="flex-1 py-1.5 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-[11px] font-bold">
                Rejeter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL AUDIT CRYPTOGRAPHIQUE COMPACT (Tableau paginé 10 par page) -->
    <div *ngIf="selectedElectionForAudit"
         (click)="closeAuditModal()"
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div (click)="$event.stopPropagation()"
           class="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div>
            <span class="text-[10px] font-bold text-[#047857] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Audit Cryptographique SHA-256
            </span>
            <h3 class="text-base font-black text-slate-900 mt-1">Journal de Preuve — {{ selectedElectionForAudit.titre }}</h3>
          </div>
          <button type="button" (click)="closeAuditModal()"
                  class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div *ngIf="loadingAudit" class="py-10 text-center">
          <lucide-icon name="loader-2" class="w-5 h-5 animate-spin text-[#047857] mx-auto"></lucide-icon>
          <p class="text-xs text-slate-500 mt-2">Chargement des preuves...</p>
        </div>

        <div *ngIf="!loadingAudit && auditError" class="py-6 text-center">
          <p class="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{{ auditError }}</p>
        </div>

        <div *ngIf="!loadingAudit && auditReport" class="space-y-3">
          <!-- Compteurs compacts -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-600">Émargements anonymisés</span>
              <span class="text-lg font-black text-[#047857]">{{ auditReport.totalVotersRegistered }}</span>
            </div>
            <div class="bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-600">Bulletins chiffrés (AES-256)</span>
              <span class="text-lg font-black text-slate-900">{{ auditReport.totalBallotsRecorded }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Empreintes SHA-256</h4>
            <button type="button" (click)="exportAuditCsv(selectedElectionForAudit.id)"
                    class="px-2.5 py-1 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-[11px] font-bold transition inline-flex items-center space-x-1">
              <lucide-icon name="upload" class="w-3 h-3"></lucide-icon>
              <span>Exporter CSV</span>
            </button>
          </div>

          <!-- Tableau paginé (10 par page) -->
          <div class="border border-slate-200 rounded-xl overflow-hidden">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                  <th class="py-2 px-3 w-14">#</th>
                  <th class="py-2 px-3">Empreinte SHA-256 du bulletin</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                <tr *ngFor="let hash of paginatedAuditHashes; let i = index" class="h-8 hover:bg-slate-50">
                  <td class="px-3 py-1 text-slate-400">{{ (auditPage - 1) * auditPageSize + i + 1 }}</td>
                  <td class="px-3 py-1 text-slate-800 break-all">{{ hash }}</td>
                </tr>
                <tr *ngIf="auditReport.ballotHashes.length === 0">
                  <td colspan="2" class="py-6 text-center font-sans text-xs text-slate-400">
                    Aucun bulletin enregistré pour ce scrutin.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <app-pagination
            [totalItems]="auditReport.ballotHashes.length"
            [pageSize]="auditPageSize"
            [currentPage]="auditPage"
            itemLabel="empreinte"
            (pageChange)="auditPage = $event">
          </app-pagination>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('toolbar') toolbar!: ElectionToolbarComponent;

  elections: Election[] = [];
  filteredElections: Election[] = [];
  ufrList: string[] = [];

  currentPage = 1;
  readonly pageSize = 8;

  activeDrawer: 'none' | 'election' | 'import' = 'none';
  openMenuElectionId: number | null = null;

  selectedFile: File | null = null;
  csvLoading = false;
  importResult: UserImportResult | null = null;

  createLoading = false;
  newElection: Partial<Election> = {
    type: 'DELEGUE',
    statut: 'CONFIGURATION',
    dateDebut: this.getDefaultDateDebut(),
    dateFin: this.getDefaultDateFin()
  };

  readonly steps: ElectionStatus[] = ['CONFIGURATION', 'CAMPAGNE', 'VOTE_OUVERT', 'DEPOUILLEMENT', 'PUBLICATION', 'CLOTURE'];

  getScopeLabel = getElectionScopeLabel;
  getStatusLabel = getElectionStatusLabel;
  getStatusBadgeClass = getElectionStatusBadgeClass;

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.activeDrawer !== 'none') {
      this.closeDrawer();
    } else if (this.selectedElectionForAudit) {
      this.closeAuditModal();
    } else if (this.selectedElectionForCandidacies) {
      this.closeCandidaciesModal();
    } else {
      this.closeActionMenu();
    }
  }

  ngOnInit(): void {
    this.fetchElections();
  }

  fetchElections(): void {
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.ufrList = [...new Set(data.map(e => e.targetUfr).filter((u): u is string => !!u))];
        this.filteredElections = data;
        this.currentPage = 1;
      },
      error: () => this.notificationService.showError('Erreur lors du chargement des élections.')
    });
  }

  onFilteredChange(filtered: Election[]): void {
    this.filteredElections = filtered;
    this.currentPage = 1;
  }

  get paginatedElections(): Election[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredElections.slice(start, start + this.pageSize);
  }

  openDrawer(drawer: 'election' | 'import'): void {
    this.activeDrawer = drawer;
    this.closeActionMenu();
  }

  closeDrawer(): void {
    this.activeDrawer = 'none';
  }

  toggleActionMenu(electionId: number, event: Event): void {
    event.stopPropagation();
    this.openMenuElectionId = this.openMenuElectionId === electionId ? null : electionId;
  }

  closeActionMenu(): void {
    this.openMenuElectionId = null;
  }

  private getDefaultDateDebut(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }

  private getDefaultDateFin(): string {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  }

  getStepIndex(statut: ElectionStatus): number {
    return this.steps.indexOf(statut);
  }

  getStepShortLabel(statut: ElectionStatus): string {
    switch (statut) {
      case 'CONFIGURATION': return 'Config';
      case 'CAMPAGNE': return 'Campagne';
      case 'VOTE_OUVERT': return 'Vote';
      case 'DEPOUILLEMENT': return 'Dépouillement';
      case 'PUBLICATION': return 'Publication';
      case 'CLOTURE': return 'Clôture';
      default: return statut;
    }
  }

  getNextStatus(statut: ElectionStatus): { status: ElectionStatus; label: string } | null {
    switch (statut) {
      case 'CONFIGURATION': return { status: 'CAMPAGNE', label: 'Campagne' };
      case 'CAMPAGNE': return { status: 'VOTE_OUVERT', label: 'Ouvrir Vote' };
      case 'VOTE_OUVERT': return { status: 'DEPOUILLEMENT', label: 'Dépouiller' };
      case 'DEPOUILLEMENT': return { status: 'PUBLICATION', label: 'Publier' };
      case 'PUBLICATION': return { status: 'CLOTURE', label: 'Clôturer' };
      default: return null;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadCsv(): void {
    if (!this.selectedFile) {
      return;
    }
    this.csvLoading = true;
    this.importResult = null;

    this.electionService.importCsvUsers(this.selectedFile).subscribe({
      next: (result) => {
        this.csvLoading = false;
        this.importResult = result;
        this.notificationService.showSuccess(`Importation CSV terminée : ${result.totalSuccess} utilisateur(s) créé(s).`);
      },
      error: (err) => {
        this.csvLoading = false;
        const msg = err.error?.message || "Erreur lors de l'importation du fichier CSV.";
        this.notificationService.showError(msg);
      }
    });
  }

  createElection(): void {
    if (!this.newElection.titre || !this.newElection.titre.trim()) {
      this.notificationService.showWarning("Veuillez saisir le titre du scrutin.");
      return;
    }
    if (!this.newElection.dateDebut) {
      this.notificationService.showWarning("Veuillez spécifier la date d'ouverture du scrutin.");
      return;
    }
    if (!this.newElection.dateFin) {
      this.notificationService.showWarning("Veuillez spécifier la date de clôture du scrutin.");
      return;
    }
    if (new Date(this.newElection.dateFin) <= new Date(this.newElection.dateDebut)) {
      this.notificationService.showWarning("La date de clôture doit être strictement postérieure à la date d'ouverture.");
      return;
    }

    this.createLoading = true;

    this.electionService.createElection(this.newElection).subscribe({
      next: () => {
        this.createLoading = false;
        this.notificationService.showSuccess("Nouveau scrutin électoral créé avec succès.");
        this.newElection = {
          type: 'DELEGUE',
          statut: 'CONFIGURATION',
          dateDebut: this.getDefaultDateDebut(),
          dateFin: this.getDefaultDateFin()
        };
        this.closeDrawer();
        this.fetchElections();
      },
      error: (err) => {
        this.createLoading = false;
        const serverMsg = err.error?.message;
        const isTechnicalError = !serverMsg || serverMsg.includes("null value") || serverMsg.includes("violates") || serverMsg.includes("SQL");
        const userMsg = isTechnicalError
          ? "Erreur de création : Veuillez vérifier l'ensemble des champs obligatoires du formulaire."
          : "Erreur de création : " + serverMsg;
        this.notificationService.showError(userMsg);
      }
    });
  }

  changeStatus(electionId: number, newStatus: ElectionStatus): void {
    if (!window.confirm(`Confirmer le passage du scrutin #${electionId} au statut ${this.getStatusLabel(newStatus)} ?`)) {
      return;
    }
    this.electionService.updateElectionStatus(electionId, newStatus).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Statut du scrutin ${electionId} mis à jour : ${newStatus}`);
        this.fetchElections();
      },
      error: (err) => {
        const msg = err.error?.message || "Transition d'état impossible pour ce scrutin.";
        this.notificationService.showError(msg);
      }
    });
  }

  // Modal Validation Candidatures (Super-Admin)
  selectedElectionForCandidacies: Election | null = null;
  candidatures: Candidature[] = [];
  loadingCandidatures = false;

  openCandidaciesModal(election: Election): void {
    this.selectedElectionForCandidacies = election;
    this.loadingCandidatures = true;
    this.electionService.getCandidatures(election.id).subscribe({
      next: (data) => {
        this.candidatures = data;
        this.loadingCandidatures = false;
      },
      error: () => {
        this.loadingCandidatures = false;
        this.notificationService.showError("Impossible de charger les candidatures pour ce scrutin.");
      }
    });
  }

  closeCandidaciesModal(): void {
    this.selectedElectionForCandidacies = null;
    this.candidatures = [];
  }

  updateCandidacyStatus(candidatureId: number, status: 'APPROVED' | 'REJECTED', motif?: string): void {
    this.electionService.updateCandidacyStatus(candidatureId, status, motif).subscribe({
      next: () => {
        this.notificationService.showSuccess(status === 'APPROVED' ? 'Candidature validée avec succès.' : 'Candidature rejetée.');
        if (this.selectedElectionForCandidacies) {
          this.electionService.getCandidatures(this.selectedElectionForCandidacies.id).subscribe(d => this.candidatures = d);
        }
      },
      error: (err) => this.notificationService.showError(err.error?.message || err.message || "Erreur lors de la mise à jour.")
    });
  }

  async rejectCandidacy(candidatureId: number): Promise<void> {
    const motif = await this.notificationService.prompt(
      "Motif de Rejet",
      "Saisissez le motif de rejet du dossier de candidature :",
      "ex: Pièces justificatives incomplètes ou non conformes",
      "Confirmer le Rejet"
    );
    if (motif && motif.trim()) {
      this.updateCandidacyStatus(candidatureId, 'REJECTED', motif.trim());
    }
  }

  getCandidacyStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-[#047857] border-[#047857]/20';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-[#dc2626]/20';
      default: return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  }

  // Modal Audit Cryptographique (Super-Admin - UC5)
  selectedElectionForAudit: Election | null = null;
  auditReport: AuditReportDto | null = null;
  loadingAudit = false;
  auditError = '';
  auditPage = 1;
  readonly auditPageSize = 10;

  get paginatedAuditHashes(): string[] {
    if (!this.auditReport?.ballotHashes) {
      return [];
    }
    const start = (this.auditPage - 1) * this.auditPageSize;
    return this.auditReport.ballotHashes.slice(start, start + this.auditPageSize);
  }

  openAuditModal(election: Election): void {
    this.selectedElectionForAudit = election;
    this.loadingAudit = true;
    this.auditError = '';
    this.auditPage = 1;
    this.electionService.getAuditReport(election.id).subscribe({
      next: (data) => {
        this.auditReport = data;
        this.loadingAudit = false;
      },
      error: (err) => {
        this.loadingAudit = false;
        this.auditError = err.error?.message || "Impossible de charger les preuves d'audit pour ce scrutin.";
        this.notificationService.showError(this.auditError);
      }
    });
  }

  closeAuditModal(): void {
    this.selectedElectionForAudit = null;
    this.auditReport = null;
    this.auditError = '';
  }

  exportAuditCsv(electionId: number): void {
    this.electionService.exportAuditCsv(electionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-election-${electionId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.showSuccess("Journal d'audit CSV téléchargé avec succès.");
      },
      error: () => this.notificationService.showError("Échec du téléchargement du journal d'audit CSV.")
    });
  }

  downloadPdf(electionId: number): void {
    this.electionService.exportPdfReport(electionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proces-verbal-election-${electionId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.notificationService.showSuccess('Procès-verbal PDF téléchargé avec succès.');
      },
      error: () => this.notificationService.showError('Échec du téléchargement du procès-verbal PDF.')
    });
  }
}
