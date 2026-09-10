import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { Election, ElectionStatus, TypeElection, UserImportResult } from '../../models/vote.models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
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
            Format CSV : <code class="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] text-slate-700 font-mono">matricule, nom, prenom, email, role, ufr, filiere, niveau</code>
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
          <div *ngIf="importResult" class="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div class="flex justify-between items-center mb-1">
              <span class="font-black text-slate-900">Rapport :</span>
              <span class="text-[#047857] font-black bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1 text-[10px]">
                <lucide-icon name="check-circle-2" class="w-3 h-3 text-[#047857]"></lucide-icon>
                <span>{{ importResult.totalSuccess }} Succès</span>
              </span>
            </div>
            <p *ngIf="importResult.totalFailed > 0" class="text-[#dc2626] text-[10px] font-bold">
              {{ importResult.totalFailed }} échec(s)
            </p>
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
              <p *ngIf="importResult.totalFailed > 0" class="text-[#dc2626] font-bold text-[10px] flex items-center space-x-1">
                <lucide-icon name="alert-triangle" class="w-3 h-3 text-[#dc2626]"></lucide-icon>
                <span>{{ importResult.totalFailed }} échec(s)</span>
              </p>

              <div *ngIf="importResult.errors.length > 0" class="max-h-20 overflow-y-auto space-y-1 font-mono text-[9px] text-[#dc2626] bg-red-50 p-1.5 rounded-lg border border-red-100 hide-scrollbar mt-1">
                <div *ngFor="let err of importResult.errors">{{ err }}</div>
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
                {{ elections.length }} Scrutin(s)
              </span>
            </div>

            <div class="space-y-3">
              <div *ngFor="let election of elections"
                   class="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                   
                <!-- Left side border indicator (appears on hover) -->
                <div [class]="getStepStripColor(election.statut)" class="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pl-2">
                  
                  <div class="flex-1 min-w-0 w-full">
                    <div class="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 class="font-black text-slate-900 text-sm md:text-base leading-tight group-hover:text-[#047857] transition-colors truncate">
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

                  <!-- State Transition Action Button -->
                  <div class="shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex justify-end">
                    <button *ngIf="election.statut === 'CONFIGURATION'" (click)="changeStatus(election.id, 'CAMPAGNE')"
                            class="w-full md:w-auto px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-sm transition-all uppercase tracking-wider flex items-center justify-center space-x-1">
                      <span>Passer en Campagne</span>
                      <span>→</span>
                    </button>

                    <button *ngIf="election.statut === 'CAMPAGNE'" (click)="changeStatus(election.id, 'VOTE_OUVERT')"
                            class="w-full md:w-auto px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-[#047857] hover:bg-emerald-700 text-white shadow-sm transition-all uppercase tracking-wider flex items-center justify-center space-x-1">
                      <span>Ouvrir le Vote</span>
                      <lucide-icon name="vote" class="w-3.5 h-3.5 text-white"></lucide-icon>
                    </button>

                    <button *ngIf="election.statut === 'VOTE_OUVERT'" (click)="changeStatus(election.id, 'DEPOUILLEMENT')"
                            class="w-full md:w-auto px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-[#1d4ed8] hover:bg-blue-700 text-white shadow-sm transition-all uppercase tracking-wider flex items-center justify-center space-x-1">
                      <span>Dépouillement</span>
                      <lucide-icon name="bar-chart-3" class="w-3.5 h-3.5 text-white"></lucide-icon>
                    </button>

                    <button *ngIf="election.statut === 'DEPOUILLEMENT'" (click)="changeStatus(election.id, 'PUBLICATION')"
                            class="w-full md:w-auto px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all uppercase tracking-wider flex items-center justify-center space-x-1">
                      <span>Publier Résult.</span>
                      <lucide-icon name="megaphone" class="w-3.5 h-3.5 text-white"></lucide-icon>
                    </button>

                    <button *ngIf="election.statut === 'PUBLICATION'" (click)="changeStatus(election.id, 'CLOTURE')"
                            class="w-full md:w-auto px-3.5 py-1.5 rounded-xl text-[10px] font-black bg-red-50 text-[#dc2626] hover:bg-red-100 border border-red-200 shadow-sm transition-all uppercase tracking-wider flex items-center justify-center space-x-1">
                      <lucide-icon name="lock" class="w-3 h-3 text-[#dc2626] shrink-0"></lucide-icon>
                      <span>Clôturer</span>
                    </button>

                    <span *ngIf="election.statut === 'CLOTURE'" class="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      Scrutin Terminé
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  elections: Election[] = [];
  selectedFile: File | null = null;
  csvLoading = false;
  importResult: UserImportResult | null = null;

  createLoading = false;
  newElection: Partial<Election> = {
    type: 'DELEGUE',
    statut: 'CONFIGURATION'
  };

  // Mobile & Compact toggles
  activeMobileForm: 'none' | 'import' | 'election' = 'none';
  showPerimetre = false;

  // Lifecycle steps
  steps: ElectionStatus[] = ['CONFIGURATION', 'CAMPAGNE', 'VOTE_OUVERT', 'DEPOUILLEMENT', 'PUBLICATION', 'CLOTURE'];

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);

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
      next: (data) => this.elections = data,
      error: (err) => this.notificationService.showError("Erreur lors du chargement des élections.")
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
        this.notificationService.showError("Erreur lors de l'import CSV : " + (err.error?.message || err.message));
      }
    });
  }

  createElection(): void {
    if (!this.newElection.titre) return;
    this.createLoading = true;

    this.electionService.createElection(this.newElection).subscribe({
      next: () => {
        this.createLoading = false;
        this.notificationService.showSuccess("Nouveau scrutin électoral créé avec succès.");
        this.newElection = { type: 'DELEGUE', statut: 'CONFIGURATION' };
        this.fetchElections();
      },
      error: (err) => {
        this.createLoading = false;
        this.notificationService.showError("Erreur de création : " + (err.error?.message || err.message));
      }
    });
  }

  changeStatus(electionId: number, newStatus: ElectionStatus): void {
    this.electionService.updateElectionStatus(electionId, newStatus).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Statut du scrutin #${electionId} mis à jour : ${newStatus}`);
        this.fetchElections();
      },
      error: (err) => this.notificationService.showError("Transition d'état impossible : " + (err.error?.message || err.message))
    });
  }
}
