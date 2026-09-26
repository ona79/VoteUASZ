import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, ElectionStatus, TypeElection, UserImportResult, AuditReportDto } from '../../models/vote.models';
import { ElectionFilterComponent } from '../shared/election-filter/election-filter.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    ElectionFilterComponent
  ],
  template: `
    <!-- Header Mobile & Desktop -->
    <div class="uasz-header-mobile md:mx-auto md:max-w-7xl md:mt-6 relative overflow-hidden mb-6">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col items-center justify-center p-5 md:p-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg mb-3 border border-white/20 overflow-hidden">
          <img src="assets/logo_vote_uasz.PNG" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
        </div>
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-2 leading-tight">Super-Admin Électoral</h1>
        <p class="text-xs md:text-sm text-emerald-50 max-w-2xl font-medium leading-relaxed">
          Gestion des utilisateurs, configuration des collèges électoraux et pilotage sécurisé de la machine à états des scrutins.
        </p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      
      <!-- MOBILE QUICK ACTION TOOLBAR (1-line toggle bar) -->
      <div class="lg:hidden mb-5 space-y-3">
        <div class="flex items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <button (click)="toggleMobileForm('import')"
                  [class]="activeMobileForm === 'import' ? 'bg-[#047857] text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
                  class="flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5">
            <lucide-icon name="upload" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span class="truncate">Import Électeurs</span>
          </button>

          <button (click)="toggleMobileForm('election')"
                  [class]="activeMobileForm === 'election' ? 'bg-[#1d4ed8] text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
                  class="flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5">
            <lucide-icon name="plus" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span class="truncate">+ Nouveau Scrutin</span>
          </button>
        </div>

        <!-- Mobile Drawer: CSV Import -->
        <div *ngIf="activeMobileForm === 'import'" class="glass-card rounded-2xl p-4 animate-fade-in-up border-emerald-200 shadow-md">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 class="text-xs font-black text-slate-900 flex items-center space-x-1.5">
              <lucide-icon name="upload" class="w-4 h-4 text-[#047857]"></lucide-icon>
              <span>Importation CSV des Électeurs</span>
            </h3>
            <button (click)="activeMobileForm = 'none'" class="text-slate-400 hover:text-slate-600 p-1">
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          </div>

          <p class="text-[10px] text-slate-500 mb-3 font-medium">
            Format CSV : <code class="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-700 font-mono">matricule, nom, prenom, email, telephone, role, type_electeur, ufr, filiere, niveau</code>
          </p>

          <div class="space-y-2.5">
            <input type="file" (change)="onFileSelected($event)" accept=".csv"
                   class="w-full text-[11px] text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-emerald-50 file:text-[#047857] cursor-pointer"/>

            <button (click)="uploadCsv()" [disabled]="!selectedFile || csvLoading"
                    class="uasz-btn-primary w-full py-2 text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50">
              <span *ngIf="!csvLoading">Lancer l'Importation</span>
              <lucide-icon *ngIf="csvLoading" name="loader-2" class="w-4 h-4 animate-spin mx-auto text-white"></lucide-icon>
            </button>
          </div>

          <!-- Import Result Report -->
          <div *ngIf="importResult" class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-fade-in-up">
            <div class="flex justify-between items-center mb-1">
              <span class="font-black text-slate-900 text-[11px]">Résultat :</span>
              <span class="text-[#047857] font-black bg-emerald-50 px-2 py-0.5 rounded text-[10px] flex items-center space-x-1">
                <lucide-icon name="check-circle-2" class="w-3 h-3 text-[#047857]"></lucide-icon>
                <span>{{ importResult.totalSuccess }} OK</span>
              </span>
            </div>
            <p *ngIf="importResult.totalFailed > 0" class="text-[#dc2626] font-bold text-[10px] flex items-center space-x-1 mb-1">
              <lucide-icon name="alert-triangle" class="w-3 h-3 text-[#dc2626]"></lucide-icon>
              <span>{{ importResult.totalFailed }} ignoré(s) / déjà existant(s)</span>
            </p>

            <div *ngIf="importResult.errors && importResult.errors.length > 0" class="max-h-28 overflow-y-auto space-y-1 text-[10px] text-slate-700 bg-amber-50/90 p-2 rounded-lg border border-amber-200 hide-scrollbar mt-1">
              <div *ngFor="let err of importResult.errors" class="font-semibold leading-relaxed">
                ⚠️ {{ err }}
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Drawer: Nouveau Scrutin -->
        <div *ngIf="activeMobileForm === 'election'" class="glass-card rounded-2xl p-4 animate-fade-in-up border-blue-200 shadow-md">
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 class="text-xs font-black text-slate-900 flex items-center space-x-1.5">
              <lucide-icon name="plus" class="w-4 h-4 text-[#1d4ed8]"></lucide-icon>
              <span>Créer un Nouveau Scrutin</span>
            </h3>
            <button (click)="activeMobileForm = 'none'" class="text-slate-400 hover:text-slate-600 p-1">
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          </div>

          <form (ngSubmit)="createElection()" class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Titre *</label>
                <input type="text" [(ngModel)]="newElection.titre" name="titre" required placeholder="ex: Délégué L3"
                       class="uasz-input !py-1.5 !px-2.5 text-xs"/>
              </div>

              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Type *</label>
                <select [(ngModel)]="newElection.type" name="type" required
                        class="uasz-input !py-1.5 !px-2 text-xs font-bold">
                  <option value="DELEGUE">DÉLÉGUÉ</option>
                  <option value="DUFR">DIR. UFR</option>
                  <option value="VICE_RECTEUR">VICE-RECTEUR</option>
                </select>
              </div>
            </div>

            <!-- Dates du Scrutin -->
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Date d'Ouverture *</label>
                <input type="datetime-local" [(ngModel)]="newElection.dateDebut" name="dateDebut" required
                       class="uasz-input !py-1.5 !px-2 text-[11px] font-medium bg-white"/>
              </div>

              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Date de Clôture *</label>
                <input type="datetime-local" [(ngModel)]="newElection.dateFin" name="dateFin" required
                       class="uasz-input !py-1.5 !px-2 text-[11px] font-medium bg-white"/>
              </div>
            </div>

            <!-- Optional scope details -->
            <div class="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label class="block text-[8px] font-bold text-slate-500 uppercase">UFR</label>
                <input type="text" [(ngModel)]="newElection.targetUfr" name="targetUfr" placeholder="UFR_SAT" class="uasz-input !py-1 !px-2 text-[11px] bg-slate-50"/>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-slate-500 uppercase">Filière</label>
                <input type="text" [(ngModel)]="newElection.targetFiliere" name="targetFiliere" placeholder="INFO" class="uasz-input !py-1 !px-2 text-[11px] bg-slate-50"/>
              </div>
              <div>
                <label class="block text-[8px] font-bold text-slate-500 uppercase">Niveau</label>
                <input type="text" [(ngModel)]="newElection.targetNiveau" name="targetNiveau" placeholder="L3" class="uasz-input !py-1 !px-2 text-[11px] bg-slate-50"/>
              </div>
            </div>

            <button type="submit" [disabled]="createLoading"
                    class="w-full py-2 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5">
              <span *ngIf="!createLoading">Créer l'Élection</span>
              <lucide-icon *ngIf="createLoading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
            </button>
          </form>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left Column: CSV Import & New Election Form (Desktop PC Only) -->
        <div class="hidden lg:block lg:col-span-1 space-y-4">

          <!-- CSV Import Card (Compact PC) -->
          <div class="glass-card rounded-2xl p-4 uasz-card-hover group border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <div class="w-7 h-7 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center shrink-0">
                  <lucide-icon name="upload" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                </div>
                <h2 class="text-sm font-black text-slate-900 tracking-tight">Import Électeurs (CSV)</h2>
              </div>
              <span class="text-[9px] font-extrabold text-[#047857] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">CSV</span>
            </div>

            <p class="text-[10px] text-slate-500 mb-3 leading-tight font-medium">
              Importation directe des étudiants &amp; personnels habilités.
            </p>

            <div class="space-y-2.5">
              <input type="file" (change)="onFileSelected($event)" accept=".csv"
                     class="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>

              <button (click)="uploadCsv()" [disabled]="!selectedFile || csvLoading"
                      class="uasz-btn-primary w-full py-2 text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                <span *ngIf="!csvLoading">Lancer l'Importation</span>
                <lucide-icon *ngIf="csvLoading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
              </button>
            </div>

            <!-- Import Result Report -->
            <div *ngIf="importResult" class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs animate-fade-in-up">
              <div class="flex justify-between items-center mb-1">
                <span class="font-black text-slate-900 text-[11px]">Résultat :</span>
                <span class="text-[#047857] font-black bg-emerald-50 px-2 py-0.5 rounded text-[10px] flex items-center space-x-1">
                  <lucide-icon name="check-circle-2" class="w-3 h-3 text-[#047857]"></lucide-icon>
                  <span>{{ importResult.totalSuccess }} OK</span>
                </span>
              </div>
              <p *ngIf="importResult.totalFailed > 0" class="text-[#dc2626] font-bold text-[10px] flex items-center space-x-1 mb-1">
                <lucide-icon name="alert-triangle" class="w-3 h-3 text-[#dc2626]"></lucide-icon>
                <span>{{ importResult.totalFailed }} ignoré(s) / déjà existant(s)</span>
              </p>

              <div *ngIf="importResult.errors && importResult.errors.length > 0" class="max-h-28 overflow-y-auto space-y-1 text-[10px] text-slate-700 bg-amber-50/90 p-2 rounded-lg border border-amber-200 hide-scrollbar mt-1">
                <div *ngFor="let err of importResult.errors" class="font-semibold leading-relaxed">
                  ⚠️ {{ err }}
                </div>
              </div>
            </div>
          </div>

          <!-- New Election Form (Compact PC) -->
          <div class="glass-card rounded-2xl p-4 uasz-card-hover group border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <div class="w-7 h-7 rounded-lg bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <lucide-icon name="plus" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
                </div>
                <h2 class="text-sm font-black text-slate-900 tracking-tight">Nouveau Scrutin</h2>
              </div>
              <span class="text-[9px] font-extrabold text-[#1d4ed8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">Création</span>
            </div>

            <form (ngSubmit)="createElection()" class="space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Titre *</label>
                  <input type="text" [(ngModel)]="newElection.titre" name="titre" required placeholder="ex: Délégué L3"
                         class="uasz-input !py-1.5 !px-2.5 text-xs"/>
                </div>

                <div>
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Type *</label>
                  <select [(ngModel)]="newElection.type" name="type" required
                          class="uasz-input !py-1.5 !px-2 text-xs font-bold">
                    <option value="DELEGUE">DÉLÉGUÉ</option>
                    <option value="DUFR">DIR. UFR</option>
                    <option value="VICE_RECTEUR">VICE-RECTEUR</option>
                  </select>
                </div>
              </div>

              <!-- Dates du Scrutin -->
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Date d'Ouverture *</label>
                  <input type="datetime-local" [(ngModel)]="newElection.dateDebut" name="dateDebut" required
                         class="uasz-input !py-1.5 !px-2 text-[11px] font-medium bg-white"/>
                </div>

                <div>
                  <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Date de Clôture *</label>
                  <input type="datetime-local" [(ngModel)]="newElection.dateFin" name="dateFin" required
                         class="uasz-input !py-1.5 !px-2 text-[11px] font-medium bg-white"/>
                </div>
              </div>

              <!-- Collapsible scope section -->
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 space-y-2">
                <div class="flex justify-between items-center cursor-pointer" (click)="togglePerimetre()">
                  <span class="text-[9px] font-black text-slate-600 uppercase tracking-wider">Périmètre Électoral</span>
                  <span class="text-[9px] font-bold text-[#1d4ed8] hover:underline">{{ showPerimetre ? 'Réduire' : 'Spécifier →' }}</span>
                </div>

                <div *ngIf="showPerimetre" class="space-y-2 pt-1 animate-fade-in-up">
                  <div>
                    <label class="block text-[8px] font-bold text-slate-500 uppercase">UFR Target</label>
                    <input type="text" [(ngModel)]="newElection.targetUfr" name="targetUfr" placeholder="ex: UFR_SAT"
                           class="uasz-input !py-1 !px-2 text-[11px] bg-white"/>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="block text-[8px] font-bold text-slate-500 uppercase">Filière</label>
                      <input type="text" [(ngModel)]="newElection.targetFiliere" name="targetFiliere" placeholder="ex: INFO"
                             class="uasz-input !py-1 !px-2 text-[11px] bg-white"/>
                    </div>
                    <div>
                      <label class="block text-[8px] font-bold text-slate-500 uppercase">Niveau</label>
                      <input type="text" [(ngModel)]="newElection.targetNiveau" name="targetNiveau" placeholder="ex: L3"
                             class="uasz-input !py-1 !px-2 text-[11px] bg-white"/>
                    </div>
                  </div>
                </div>
              </div>

              <button type="submit" [disabled]="createLoading"
                      class="w-full py-2 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5">
                <span *ngIf="!createLoading">Créer l'Élection</span>
                <lucide-icon *ngIf="createLoading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
              </button>
            </form>
          </div>

        </div>

        <!-- Right Column: Election State Machine Management -->
        <div class="lg:col-span-2 space-y-6">

          <div class="glass-card rounded-2xl p-4 md:p-5 h-full border border-slate-200/80 shadow-sm">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div class="flex items-center space-x-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center shrink-0">
                  <lucide-icon name="refresh-cw" class="w-4 h-4 text-[#047857]"></lucide-icon>
                </div>
                <h2 class="text-base md:text-lg font-black text-slate-900 tracking-tight">Machines à États Électorales</h2>
              </div>
              <span class="text-xs font-black text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">
                {{ filteredElections.length }}<span *ngIf="filteredElections.length !== elections.length" class="opacity-60"> / {{ elections.length }}</span> Scrutin(s)
              </span>
            </div>

            <!-- Barre de filtres Admin -->
            <app-election-filter
              [elections]="elections"
              [ufrList]="ufrList"
              [showUfrFilter]="true"
              (filtered)="filteredElections = $event"
            ></app-election-filter>

            <div class="space-y-3">
              <!-- État vide -->
              <div *ngIf="filteredElections.length === 0 && elections.length > 0" class="py-10 text-center">
                <p class="text-sm font-bold text-slate-500">🗳️ Aucun scrutin ne correspond à ces filtres.</p>
              </div>
              <div *ngFor="let election of filteredElections"
                   class="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                   
                <!-- Left side border indicator (appears on hover) -->
                <div [class]="getStepStripColor(election.statut)" class="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pl-2">
                  
                  <div class="flex-1 min-w-0 w-full">
                    <div class="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 class="font-black text-slate-900 text-sm md:text-base leading-tight group-hover:text-[#047857] transition-colors break-words">
                        {{ election.titre }}
                      </h3>
                      
                      <!-- Type Badge -->
                      <span *ngIf="election.type === 'DELEGUE'" class="text-[9px] px-2 py-0.5 rounded-md bg-blue-50 text-[#1d4ed8] border border-blue-200/70 font-black uppercase tracking-wider">
                        {{ election.type }}
                      </span>
                      <span *ngIf="election.type === 'DUFR'" class="text-[9px] px-2 py-0.5 rounded-md bg-emerald-50 text-[#047857] border border-emerald-200/70 font-black uppercase tracking-wider">
                        {{ election.type }}
                      </span>
                      <span *ngIf="election.type === 'VICE_RECTEUR'" class="text-[9px] px-2 py-0.5 rounded-md bg-red-50 text-[#dc2626] border border-red-200/70 font-black uppercase tracking-wider">
                        {{ election.type }}
                      </span>
                      <span *ngIf="election.type && election.type !== 'DELEGUE' && election.type !== 'DUFR' && election.type !== 'VICE_RECTEUR'" class="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-black uppercase tracking-wider">
                        {{ election.type }}
                      </span>

                      <!-- Target Scope Badge -->
                      <span *ngIf="election.targetUfr" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {{ election.targetUfr }} <span *ngIf="election.targetNiveau">• {{ election.targetNiveau }}</span>
                      </span>
                    </div>
                    
                    <!-- Progress Stepper Track -->
                    <div class="mt-3 pt-3 border-t border-slate-100">
                      <div class="flex items-center justify-between gap-1 mb-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progression de la Machine à États :</span>
                        <span [class]="getStatusBadgeColor(election.statut)" class="text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider shrink-0 flex items-center space-x-1">
                          <span *ngIf="election.statut === 'VOTE_OUVERT'" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>{{ getStatusLabel(election.statut) }}</span>
                        </span>
                      </div>

                      <div class="grid grid-cols-6 gap-1 w-full mt-1">
                        <div *ngFor="let s of steps; let i = index" 
                             [title]="getStatusLabel(s)"
                             class="flex flex-col items-center group/step relative">
                          <div [class]="i <= getStepIndex(election.statut) ? (i === getStepIndex(election.statut) ? 'bg-[#047857] ring-2 ring-emerald-300 shadow-sm' : 'bg-emerald-500') : 'bg-slate-200'"
                               class="h-1.5 w-full rounded-full transition-all duration-300"></div>
                          <span [class]="i <= getStepIndex(election.statut) ? (i === getStepIndex(election.statut) ? 'text-[#047857] font-black scale-105' : 'text-emerald-700 font-bold') : 'text-slate-400 font-medium'"
                                class="text-[8px] sm:text-[9px] mt-1 text-center truncate max-w-full tracking-tighter">
                            {{ getStepShortLabel(s) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Ultra-compact Action Buttons Toolbar -->
                  <div class="shrink-0 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100 flex flex-wrap items-center justify-end gap-1.5">
                    <button (click)="openCandidaciesModal(election)"
                            type="button"
                            title="Consulter et valider les dossiers de candidature"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80 shadow-2xs transition flex items-center space-x-1 cursor-pointer">
                      <lucide-icon name="file-text" class="w-3 h-3 text-[#047857] shrink-0"></lucide-icon>
                      <span>Dossiers</span>
                    </button>

                    <button (click)="openAuditModal(election)"
                            type="button"
                            title="Consulter le journal d'audit cryptographique SHA-256"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-50 hover:bg-emerald-100 text-[#047857] border border-emerald-200/80 shadow-2xs transition flex items-center space-x-1 cursor-pointer">
                      <lucide-icon name="shield" class="w-3 h-3 text-[#047857] shrink-0"></lucide-icon>
                      <span>Audit</span>
                    </button>

                    <button *ngIf="election.statut === 'PUBLICATION' || election.statut === 'CLOTURE'" (click)="downloadPdf(election.id)"
                            type="button"
                            title="Télécharger le Procès-Verbal Officiel PDF"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-100/90 hover:bg-emerald-200 text-emerald-800 border border-emerald-300/80 shadow-2xs transition flex items-center space-x-1 cursor-pointer">
                      <lucide-icon name="file-text" class="w-3 h-3 text-emerald-700 shrink-0"></lucide-icon>
                      <span>PV PDF</span>
                    </button>

                    <!-- Machine à états (Transition principale) -->
                    <button *ngIf="election.statut === 'CONFIGURATION'" (click)="changeStatus(election.id, 'CAMPAGNE')"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-2xs transition uppercase tracking-wider flex items-center space-x-1">
                      <span>Campagne →</span>
                    </button>

                    <button *ngIf="election.statut === 'CAMPAGNE'" (click)="changeStatus(election.id, 'VOTE_OUVERT')"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-[#047857] hover:bg-emerald-700 text-white shadow-2xs transition uppercase tracking-wider flex items-center space-x-1">
                      <lucide-icon name="vote" class="w-3 h-3 text-white shrink-0"></lucide-icon>
                      <span>Ouvrir Vote</span>
                    </button>

                    <button *ngIf="election.statut === 'VOTE_OUVERT'" (click)="changeStatus(election.id, 'DEPOUILLEMENT')"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-2xs transition uppercase tracking-wider flex items-center space-x-1">
                      <lucide-icon name="bar-chart-2" class="w-3 h-3 text-white shrink-0"></lucide-icon>
                      <span>Dépouiller</span>
                    </button>

                    <button *ngIf="election.statut === 'DEPOUILLEMENT'" (click)="changeStatus(election.id, 'PUBLICATION')"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition uppercase tracking-wider flex items-center space-x-1">
                      <lucide-icon name="megaphone" class="w-3 h-3 text-white shrink-0"></lucide-icon>
                      <span>Publier</span>
                    </button>

                    <button *ngIf="election.statut === 'PUBLICATION'" (click)="changeStatus(election.id, 'CLOTURE')"
                            class="px-2.5 py-1 rounded-lg text-[9px] font-black bg-red-50 text-[#dc2626] hover:bg-red-100 border border-red-200 shadow-2xs transition uppercase tracking-wider flex items-center space-x-1">
                      <lucide-icon name="lock" class="w-3 h-3 text-[#dc2626] shrink-0"></lucide-icon>
                      <span>Clôturer</span>
                    </button>

                    <span *ngIf="election.statut === 'CLOTURE'" class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                      Terminé
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- MODAL VALIDATION CANDIDATURES (SUPER-ADMIN) -->
      <div *ngIf="selectedElectionForCandidacies" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in-up max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <span class="text-[10px] font-black text-[#047857] uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Validation des Dossiers
              </span>
              <h3 class="text-lg font-black text-slate-900 mt-1">Candidatures — {{ selectedElectionForCandidacies.titre }}</h3>
            </div>
            <button (click)="closeCandidaciesModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          </div>

          <div *ngIf="loadingCandidatures" class="py-12 text-center">
            <lucide-icon name="loader-2" class="w-6 h-6 animate-spin text-[#047857] mx-auto"></lucide-icon>
            <p class="text-xs text-slate-500 mt-2 font-medium">Chargement des dossiers...</p>
          </div>

          <div *ngIf="!loadingCandidatures && candidatures.length === 0" class="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <lucide-icon name="inbox" class="w-8 h-8 text-slate-400 mx-auto mb-2"></lucide-icon>
            <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Aucune candidature soumise pour ce scrutin.</p>
          </div>

          <div *ngIf="!loadingCandidatures && candidatures.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div *ngFor="let c of candidatures" class="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    <img *ngIf="c.photoUrl" [src]="c.photoUrl" class="w-full h-full object-cover"/>
                    <lucide-icon *ngIf="!c.photoUrl" name="user" class="w-5 h-5 text-slate-400"></lucide-icon>
                  </div>
                  <span [class]="getCandidacyStatusClass(c.statut)" class="text-[9px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider border">
                    {{ c.statut }}
                  </span>
                </div>
                <h4 class="font-black text-slate-900 text-sm mb-0.5">
                  {{ c.candidatNomComplet || (c.candidatPrenom ? (c.candidatPrenom + ' ' + (c.candidatNom || '')) : (c.nomListe || 'Candidat')) }}
                </h4>
                <p *ngIf="c.candidatMatricule" class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                  Matricule : <span class="text-[#1d4ed8]">{{ c.candidatMatricule }}</span>
                </p>

                <!-- Documents -->
                <div class="flex flex-wrap gap-2 my-2">
                  <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank"
                     class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition flex items-center space-x-1">
                    <lucide-icon name="file-text" class="w-3 h-3"></lucide-icon>
                    <span>Programme PDF</span>
                  </a>
                  <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank"
                     class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition flex items-center space-x-1">
                    <lucide-icon name="file-check" class="w-3 h-3"></lucide-icon>
                    <span>CV PDF</span>
                  </a>
                </div>
              </div>

              <!-- Actions Validation (Super-Admin) -->
              <div class="flex space-x-2 pt-3 border-t border-slate-200 mt-3">
                <button *ngIf="c.statut === 'PENDING'" (click)="updateCandidacyStatus(c.id, 'APPROVED')"
                        class="flex-1 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-[10px] font-black shadow-sm transition flex items-center justify-center space-x-1">
                  <lucide-icon name="check" class="w-3 h-3"></lucide-icon>
                  <span>Valider</span>
                </button>
                <button *ngIf="c.statut === 'PENDING'" (click)="rejectCandidacy(c.id)"
                        class="flex-1 py-1.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-[10px] font-black shadow-sm transition flex items-center justify-center space-x-1">
                  <lucide-icon name="x" class="w-3 h-3"></lucide-icon>
                  <span>Rejeter</span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button (click)="closeCandidaciesModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Fermer
            </button>
          </div>
        </div>
      </div>

      <!-- MODAL AUDIT CRYPTOGRAPHIQUE (SUPER-ADMIN - UC5) -->
      <div *ngIf="selectedElectionForAudit" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-fade-in-up max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <span class="text-[10px] font-black text-[#047857] uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Audit Cryptographique Registre Immuable
              </span>
              <h3 class="text-lg font-black text-slate-900 mt-1">Journal de Preuve — {{ selectedElectionForAudit.titre }}</h3>
            </div>
            <button (click)="closeAuditModal()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          </div>

          <div *ngIf="loadingAudit" class="py-12 text-center">
            <lucide-icon name="loader-2" class="w-6 h-6 animate-spin text-[#047857] mx-auto"></lucide-icon>
            <p class="text-xs text-slate-500 mt-2 font-medium">Chargement des preuves d'audit cryptographique...</p>
          </div>

          <div *ngIf="!loadingAudit && auditReport" class="space-y-6">
            <!-- Statistiques d'intégrité -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <p class="text-[10px] font-black text-[#047857] uppercase tracking-wider mb-1">Émargements Anonymisés</p>
                <p class="text-2xl font-black text-slate-900">{{ auditReport.totalVotersRegistered }}</p>
                <p class="text-[10px] text-slate-500 mt-1">Empreintes d'horodatage enregistrées</p>
              </div>
              <div class="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
                <p class="text-[10px] font-black text-[#1d4ed8] uppercase tracking-wider mb-1">Bulletins Chiffrés (AES-256)</p>
                <p class="text-2xl font-black text-slate-900">{{ auditReport.totalBallotsRecorded }}</p>
                <p class="text-[10px] text-slate-500 mt-1">Empreintes SHA-256 dans le journal</p>
              </div>
            </div>

            <!-- Preuves d'Empreinte SHA-256 -->
            <div>
              <h4 class="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Journal d'Empreintes Chiffrées SHA-256</span>
                <button (click)="exportAuditCsv(selectedElectionForAudit.id)" class="px-3 py-1 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-[10px] font-bold transition flex items-center space-x-1">
                  <lucide-icon name="upload" class="w-3 h-3"></lucide-icon>
                  <span>Exporter Audit (CSV)</span>
                </button>
              </h4>

              <div class="bg-slate-900 rounded-xl p-4 text-emerald-400 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 shadow-inner border border-slate-800">
                <div *ngFor="let hash of auditReport.ballotHashes" class="flex items-center space-x-2">
                  <span class="text-slate-500 select-none">▶</span>
                  <span class="break-all">{{ hash }}</span>
                </div>
                <div *ngIf="auditReport.ballotHashes.length === 0" class="text-slate-500 italic text-center py-4">
                  Aucun bulletin enregistré pour ce scrutin.
                </div>
              </div>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span class="text-[10px] font-bold text-slate-400">Intégrité garantie par signature asymétrique RSA / SHA-256</span>
            <button (click)="closeAuditModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
              Fermer
            </button>
          </div>
        </div>
      </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  elections: Election[] = [];
  filteredElections: Election[] = [];
  ufrList: string[] = [];
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

  // Mobile & Compact toggles
  activeMobileForm: 'none' | 'import' | 'election' = 'none';
  showPerimetre = false;

  // Lifecycle steps
  steps: ElectionStatus[] = ['CONFIGURATION', 'CAMPAGNE', 'VOTE_OUVERT', 'DEPOUILLEMENT', 'PUBLICATION', 'CLOTURE'];

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);

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

  toggleMobileForm(formName: 'import' | 'election'): void {
    if (this.activeMobileForm === formName) {
      this.activeMobileForm = 'none';
    } else {
      this.activeMobileForm = formName;
    }
  }

  togglePerimetre(): void {
    this.showPerimetre = !this.showPerimetre;
  }

  getStepIndex(statut: ElectionStatus): number {
    return this.steps.indexOf(statut);
  }

  getStepStripColor(statut: ElectionStatus): string {
    switch (statut) {
      case 'CONFIGURATION': return 'bg-amber-400';
      case 'CAMPAGNE': return 'bg-[#1d4ed8]';
      case 'VOTE_OUVERT': return 'bg-[#047857]';
      case 'DEPOUILLEMENT': return 'bg-[#1d4ed8]';
      case 'PUBLICATION': return 'bg-indigo-600';
      case 'CLOTURE': return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  }

  getStatusBadgeColor(statut: ElectionStatus): string {
    switch (statut) {
      case 'CONFIGURATION': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'CAMPAGNE': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'VOTE_OUVERT': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'DEPOUILLEMENT': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'PUBLICATION': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CLOTURE': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  }

  getStatusLabel(statut: ElectionStatus): string {
    switch (statut) {
      case 'CONFIGURATION': return 'Configuration';
      case 'CAMPAGNE': return 'Campagne';
      case 'VOTE_OUVERT': return 'Vote Ouvert';
      case 'DEPOUILLEMENT': return 'Dépouillement';
      case 'PUBLICATION': return 'Publication';
      case 'CLOTURE': return 'Clôturé';
      default: return statut;
    }
  }

  getStepShortLabel(statut: ElectionStatus): string {
    switch (statut) {
      case 'CONFIGURATION': return 'Config.';
      case 'CAMPAGNE': return 'Campagne';
      case 'VOTE_OUVERT': return 'Vote';
      case 'DEPOUILLEMENT': return 'Dépouil.';
      case 'PUBLICATION': return 'Publi.';
      case 'CLOTURE': return 'Clôture';
      default: return statut;
    }
  }

  ngOnInit(): void {
    this.fetchElections();
  }

  fetchElections(): void {
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.filteredElections = data;
        this.ufrList = [...new Set(data.map(e => e.targetUfr).filter((u): u is string => !!u))];
      },
      error: () => this.notificationService.showError('Erreur lors du chargement des élections.')
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.selectedFile = file;
  }

  uploadCsv(): void {
    if (!this.selectedFile) return;
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
        this.activeMobileForm = 'none';
        this.fetchElections();
      },
      error: (err) => {
        this.createLoading = false;
        console.error("[Create Election Error]", err);
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

  openAuditModal(election: Election): void {
    this.selectedElectionForAudit = election;
    this.loadingAudit = true;
    this.electionService.getAuditReport(election.id).subscribe({
      next: (data) => {
        this.auditReport = data;
        this.loadingAudit = false;
      },
      error: () => {
        this.loadingAudit = false;
        this.notificationService.showError("Impossible de charger les preuves d'audit pour ce scrutin.");
      }
    });
  }

  closeAuditModal(): void {
    this.selectedElectionForAudit = null;
    this.auditReport = null;
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
        this.notificationService.showSuccess('Journal d\'audit CSV téléchargé avec succès.');
      },
      error: (err) => {
        console.error('Erreur export audit CSV:', err);
        this.notificationService.showError('Échec du téléchargement du journal d\'audit CSV.');
      }
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
      error: (err) => {
        console.error('Erreur export PDF:', err);
        this.notificationService.showError('Échec du téléchargement du procès-verbal PDF.');
      }
    });
  }
}
