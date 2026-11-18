import { Component, HostListener, OnInit, OnDestroy, ViewChild, ElementRef, inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { LucideAngularModule } from 'lucide-angular';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend
);

import { ElectionService } from '../../services/election.service';
import { VoteService } from '../../services/vote.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, LiveResultsDto, LiveResult } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { CandidateAvatarComponent } from '../shared/candidate-avatar/candidate-avatar.component';
import { getElectionStatusBadgeClass, getElectionStatusLabel } from '../../utils/election-ui.utils';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    CandidateAvatarComponent
  ],
  template: `
    <ng-container *ngIf="election">
      <!-- Barre du haut fine (~48px) -->
      <app-page-header [title]="election.titre">
        <a routerLink="/elections" title="Retour aux scrutins"
           class="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 transition inline-flex items-center space-x-1">
          <lucide-icon name="arrow-left" class="w-3.5 h-3.5"></lucide-icon>
          <span class="hidden sm:inline">Scrutins</span>
        </a>
        <button *ngIf="(election.statut === 'CLOTURE' || election.statut === 'PUBLICATION') && canShowResultsBlock"
                type="button"
                (click)="downloadPdfReport()"
                class="px-2.5 py-1 rounded-lg bg-white text-[#047857] hover:bg-emerald-50 text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-sm">
          <lucide-icon name="file-text" class="w-3.5 h-3.5"></lucide-icon>
          <span class="hidden sm:inline">Procès-verbal (PDF)</span>
          <span class="sm:hidden">PV PDF</span>
        </button>
      </app-page-header>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-4">
        <!-- Petite ligne grise : Statut, Type et Périmètre -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-2 border-b border-slate-200">
          <div class="flex flex-wrap items-center gap-2">
            <span [class]="getStatusBadgeClass(election.statut)"
                  class="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border">
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>{{ getStatusLabel(election.statut) }}</span>
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
              {{ election.type }}
            </span>
            <span class="text-slate-500 font-medium">{{ scopeLine }}</span>
          </div>
          <span *ngIf="election.description" class="text-[11px] text-slate-400 truncate max-w-md">
            {{ election.description }}
          </span>
        </div>

        <!-- ══ BLOCS VOTE_OUVERT (tout en haut sous l'en-tête) ══ -->
        <ng-container *ngIf="election.statut === 'VOTE_OUVERT'">
          <!-- 1. Non connecté -->
          <div *ngIf="!authService.isLoggedIn()"
               class="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <p class="text-xs font-medium text-slate-700">
              Ce scrutin est ouvert. Connectez-vous avec votre matricule UASZ pour voter.
            </p>
            <a routerLink="/login"
               class="px-3.5 py-1.5 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold inline-flex items-center justify-center space-x-1.5 shrink-0">
              <lucide-icon name="log-in" class="w-3.5 h-3.5"></lucide-icon>
              <span>Se connecter pour voter</span>
            </a>
          </div>

          <!-- 2. Mode supervision (ligne fine) -->
          <div *ngIf="authService.isLoggedIn() && isSupervisor()"
               class="bg-blue-50/70 border border-blue-200 rounded-xl px-3.5 py-2 flex items-center space-x-2 text-xs text-[#1d4ed8] font-semibold">
            <lucide-icon name="shield" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Mode supervision actif — vous suivez le déroulement et le dépouillement en direct.</span>
          </div>

          <!-- 3. Vote déjà enregistré -->
          <div *ngIf="authService.isLoggedIn() && hasAlreadyVoted && voteStep !== 3"
               class="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center space-x-2.5 text-xs text-[#047857] font-bold">
            <lucide-icon name="check-circle-2" class="w-4 h-4 shrink-0"></lucide-icon>
            <span>Vote enregistré — votre bulletin anonyme est scellé dans l'urne numérique.</span>
          </div>

          <!-- 4. Non éligible -->
          <div *ngIf="authService.isLoggedIn() && !isSupervisor() && !hasAlreadyVoted && !eligibilityInfo.isEligible"
               class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 space-y-1">
            <div class="flex items-center space-x-2 font-bold">
              <lucide-icon name="alert-triangle" class="w-4 h-4 text-amber-700 shrink-0"></lucide-icon>
              <span>Vous n'êtes pas éligible pour ce scrutin : {{ eligibilityInfo.reason }}</span>
            </div>
            <p class="text-[11px] text-amber-800 pl-6">
              Requis : <strong>{{ eligibilityInfo.requiredProfile }}</strong> · Votre profil : <strong>{{ eligibilityInfo.userProfile }}</strong>
            </p>
          </div>

          <!-- 5. Stepper de vote en 3 étapes (éligible et pas encore voté, ou étape 3 reçu) -->
          <div *ngIf="authService.isLoggedIn() && !isSupervisor() && (!hasAlreadyVoted || voteStep === 3)"
               id="vote-stepper"
               class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <!-- Barre d'étapes -->
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div class="flex items-center gap-2 text-xs font-bold">
                <span [class]="voteStep >= 1 ? 'bg-[#047857] text-white' : 'bg-slate-200 text-slate-600'"
                      class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px]">1</span>
                <span [class]="voteStep === 1 ? 'text-slate-900' : 'text-slate-400'" class="hidden sm:inline">Choix du candidat</span>
              </div>
              <div class="h-px flex-1 bg-slate-200"></div>
              <div class="flex items-center gap-2 text-xs font-bold">
                <span [class]="voteStep >= 2 ? 'bg-[#047857] text-white' : 'bg-slate-200 text-slate-600'"
                      class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px]">2</span>
                <span [class]="voteStep === 2 ? 'text-slate-900' : 'text-slate-400'" class="hidden sm:inline">Code OTP</span>
              </div>
              <div class="h-px flex-1 bg-slate-200"></div>
              <div class="flex items-center gap-2 text-xs font-bold">
                <span [class]="voteStep >= 3 ? 'bg-[#047857] text-white' : 'bg-slate-200 text-slate-600'"
                      class="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px]">3</span>
                <span [class]="voteStep === 3 ? 'text-slate-900' : 'text-slate-400'" class="hidden sm:inline">Confirmation</span>
              </div>
            </div>

            <p *ngIf="modalError" class="text-xs font-semibold text-[#dc2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {{ modalError }}
            </p>

            <!-- Étape 1 : Choix du candidat -->
            <div *ngIf="voteStep === 1" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex-1">
                <p *ngIf="selectedCandidature" class="text-xs text-slate-700">
                  Candidat sélectionné : <strong class="text-[#047857]">{{ getCandidatDisplayName(selectedCandidature) }}</strong>
                  <span *ngIf="selectedCandidature.nomListe" class="text-slate-500">({{ selectedCandidature.nomListe }})</span>
                </p>
                <p *ngIf="!selectedCandidature" class="text-xs text-slate-500">
                  Sélectionnez un candidat dans la liste ci-dessous pour recevoir votre code OTP par e-mail.
                </p>
              </div>
              <button type="button"
                      (click)="requestOtp()"
                      [disabled]="!selectedCandidature || otpLoading"
                      class="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition disabled:opacity-40 inline-flex items-center justify-center space-x-1.5">
                <lucide-icon *ngIf="otpLoading" name="loader-2" class="w-3.5 h-3.5 animate-spin"></lucide-icon>
                <span>Recevoir le code OTP</span>
              </button>
            </div>

            <!-- Étape 2 : Code OTP -->
            <div *ngIf="voteStep === 2" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input type="text" [(ngModel)]="otpCode" maxlength="6" placeholder="Code OTP à 6 chiffres"
                     class="w-full sm:w-48 h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono tracking-widest text-center focus:outline-none focus:border-[#047857]"/>
              <button type="button" (click)="verifyOtp()" [disabled]="otpLoading || otpCode.length < 6"
                      class="w-full sm:w-auto px-4 h-9 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition disabled:opacity-40 inline-flex items-center justify-center space-x-1.5">
                <lucide-icon *ngIf="otpLoading" name="loader-2" class="w-3.5 h-3.5 animate-spin"></lucide-icon>
                <span>Confirmer mon vote</span>
              </button>
              <button type="button" (click)="requestOtp()" [disabled]="otpLoading"
                      class="w-full sm:w-auto px-3 h-9 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Renvoyer
              </button>
              <button type="button" (click)="voteStep = 1; modalError = ''"
                      class="w-full sm:w-auto px-3 h-9 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800">
                Changer de candidat
              </button>
            </div>

            <!-- Étape 3 : Confirmation & reçu -->
            <div *ngIf="voteStep === 3" class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1">
              <div class="flex items-center space-x-2 text-xs font-bold text-[#047857]">
                <lucide-icon name="check-circle-2" class="w-4 h-4"></lucide-icon>
                <span>Vote enregistré avec succès !</span>
              </div>
              <p class="text-[11px] text-slate-600 font-mono break-all">
                Empreinte du bulletin : {{ ballotHash }}
              </p>
            </div>
          </div>
        </ng-container>

        <!-- ══ RÉSULTATS EN DIRECT ══ -->
        <section *ngIf="canShowResultsBlock"
                 class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div class="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-black text-slate-900">
                {{ election.statut === 'CLOTURE' ? 'Résultats Officiels' : 'Résultats en Direct' }}
              </h2>
              <span class="text-[10px] font-bold text-[#047857] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
                {{ election.statut === 'CLOTURE' ? 'Officiel' : 'LIVE (STOMP)' }}
              </span>
            </div>

            <div *ngIf="hasVotes" class="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-bold">
              <button type="button" (click)="setChartType('bar')"
                      [class]="chartType === 'bar' ? 'bg-white text-[#047857] shadow-sm' : 'text-slate-600'"
                      class="px-2.5 py-0.5 rounded-md transition">
                Barres
              </button>
              <button type="button" (click)="setChartType('doughnut')"
                      [class]="chartType === 'doughnut' ? 'bg-white text-[#047857] shadow-sm' : 'text-slate-600'"
                      class="px-2.5 py-0.5 rounded-md transition">
                Camembert
              </button>
            </div>
          </div>

          <!-- État vide court si aucun suffrage -->
          <div *ngIf="!hasVotes" class="py-8 text-center text-xs text-slate-500 font-medium">
            Aucun suffrage pour le moment.
          </div>

          <!-- Graphique (max ~220px) + Tableau compact côte à côte -->
          <div *ngIf="hasVotes" class="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div class="lg:col-span-7 relative h-[220px] bg-slate-50/60 rounded-xl border border-slate-200 p-2.5">
              <canvas #resultsChartCanvas></canvas>
            </div>

            <div class="lg:col-span-5 border border-slate-200 rounded-xl overflow-hidden">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <th class="py-2 px-3">Candidat</th>
                    <th class="py-2 px-2 w-14 text-right">Voix</th>
                    <th class="py-2 px-3 w-28">Pourcentage</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr *ngFor="let item of resultsList" class="h-9 hover:bg-slate-50">
                    <td class="px-3 py-1 font-semibold text-slate-800 truncate max-w-[140px]">
                      {{ item.nomCandidat || item.nomListe }}
                    </td>
                    <td class="px-2 py-1 text-right font-bold text-slate-900">{{ item.voteCount }}</td>
                    <td class="px-3 py-1">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full bg-[#047857] rounded-full" [style.width.%]="item.percentage"></div>
                        </div>
                        <span class="text-[10px] font-bold text-slate-600 w-9 text-right">{{ item.percentage | number:'1.0-1' }}%</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- ══ CANDIDATS ET PROGRAMMES ══ -->
        <section id="candidates-section" class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black text-slate-900">
              Candidats ({{ approvedCandidatures.length }})
            </h2>
          </div>

          <div *ngIf="approvedCandidatures.length === 0"
               class="bg-white border border-slate-200 rounded-xl py-8 text-center text-xs text-slate-500">
            {{ candidaturesEmptyTitle }}
          </div>

          <!-- Grille compacte (3 par ligne desktop, 1 sur mobile) -->
          <div *ngIf="approvedCandidatures.length > 0"
               class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div *ngFor="let c of approvedCandidatures"
                 [class]="selectedCandidature?.id === c.id ? 'border-[#047857] ring-1 ring-[#047857]/30' : 'border-slate-200'"
                 class="bg-white p-3.5 rounded-xl border shadow-sm flex flex-col justify-between gap-3 transition">
              <div class="flex items-center space-x-3 min-w-0">
                <app-candidate-avatar
                  [photoUrl]="c.photoUrl"
                  [name]="getCandidatDisplayName(c)"
                  sizeClass="w-10 h-10 text-xs">
                </app-candidate-avatar>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-slate-900 truncate">{{ getCandidatDisplayName(c) }}</h3>
                  <p *ngIf="c.nomListe" class="text-[11px] text-slate-500 truncate">{{ c.nomListe }}</p>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <!-- Petits boutons icône CV / Programme / Campagne -->
                <div class="flex items-center gap-1">
                  <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank" title="CV PDF"
                     class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center transition">
                    <lucide-icon name="file-check" class="w-3.5 h-3.5 text-[#047857]"></lucide-icon>
                  </a>
                  <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank" title="Programme PDF"
                     class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center justify-center transition">
                    <lucide-icon name="file-text" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
                  </a>
                  <button *ngIf="hasCampaignContent(c)" type="button" (click)="openCampaignDrawer(c)"
                          class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center space-x-1 transition">
                    <lucide-icon name="megaphone" class="w-3 h-3 text-[#047857]"></lucide-icon>
                    <span>Voir la campagne</span>
                  </button>
                </div>

                <!-- Bouton Voter si éligible -->
                <button *ngIf="election.statut === 'VOTE_OUVERT' && authService.isLoggedIn() && !isSupervisor() && !hasAlreadyVoted && eligibilityInfo.isEligible"
                        type="button"
                        (click)="selectCandidateForVote(c)"
                        [class]="selectedCandidature?.id === c.id ? 'bg-[#065f46]' : 'bg-[#047857] hover:bg-[#065f46]'"
                        class="px-2.5 py-1 rounded-lg text-white text-[11px] font-bold transition shrink-0">
                  {{ selectedCandidature?.id === c.id ? 'Sélectionné' : 'Voter' }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ng-container>

    <!-- DRAWER CAMPAGNE (~420px sur desktop, plein écran sur mobile) -->
    <div *ngIf="drawerCandidature"
         (click)="closeCampaignDrawer()"
         class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex justify-end">
      <aside (click)="$event.stopPropagation()"
             class="w-full sm:w-[420px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div class="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
          <h2 class="text-sm font-black text-slate-900 truncate">
            Campagne — {{ getCandidatDisplayName(drawerCandidature) }}
          </h2>
          <button type="button" (click)="closeCampaignDrawer()" aria-label="Fermer"
                  class="w-8 h-8 rounded-lg hover:bg-slate-200/70 flex items-center justify-center text-slate-500 transition">
            <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div *ngFor="let post of drawerCandidature.posts" class="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-slate-50/50">
            <h3 class="text-sm font-bold text-slate-900">{{ post.titre }}</h3>
            <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{{ post.contenu }}</p>
            <img *ngIf="post.afficheUrl" [src]="post.afficheUrl" [alt]="post.titre"
                 class="w-full rounded-lg border border-slate-200 object-cover max-h-56"/>
            <div *ngIf="post.videoEmbedUrl" class="aspect-video rounded-lg overflow-hidden border border-slate-200 bg-black">
              <iframe [src]="getSafeVideoUrl(post.videoEmbedUrl)" class="w-full h-full" allowfullscreen></iframe>
            </div>
          </div>

          <p *ngIf="!drawerCandidature.posts || drawerCandidature.posts.length === 0"
             class="text-xs text-slate-500 text-center py-8">
            Aucune publication de campagne pour ce candidat.
          </p>
        </div>
      </aside>
    </div>
  `
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  electionId!: number;
  election: Election | null = null;
  candidatures: Candidature[] = [];
  liveResults: LiveResultsDto | null = null;
  drawerCandidature: Candidature | null = null;

  getStatusLabel = getElectionStatusLabel;
  getStatusBadgeClass = getElectionStatusBadgeClass;

  @ViewChild('resultsChartCanvas')
  set resultsChartCanvas(ref: ElementRef<HTMLCanvasElement> | undefined) {
    if (ref?.nativeElement !== this.canvasEl?.nativeElement) {
      if (!ref) {
        this.resultsChart?.destroy();
        this.resultsChart = undefined;
      }
      this.canvasEl = ref;
      if (ref && this.hasVotes) {
        this.syncResultsChart();
      }
    }
  }

  private canvasEl?: ElementRef<HTMLCanvasElement>;
  chartType: 'bar' | 'doughnut' = 'bar';
  private resultsChart?: Chart;

  // Vote Stepper State
  voteStep = 1;
  selectedCandidature: Candidature | null = null;
  otpCode = '';
  voteToken = '';
  ballotHash = '';
  otpLoading = false;
  modalError = '';
  hasAlreadyVoted = false;

  private route = inject(ActivatedRoute);
  private electionService = inject(ElectionService);
  private voteService = inject(VoteService);
  private wsService = inject(WebSocketService);
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private notificationService = inject(NotificationService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.drawerCandidature) {
      this.closeCampaignDrawer();
    }
  }

  ngOnInit(): void {
    this.electionId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchData();

    this.wsService.results$.subscribe((results) => {
      if (results) {
        this.ngZone.run(() => {
          this.liveResults = results;
          this.cdr.detectChanges();
          this.syncResultsChart();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    this.resultsChart?.destroy();
    this.resultsChart = undefined;
  }

  get scopeLine(): string {
    if (!this.election) {
      return '';
    }
    const parts: string[] = [];
    parts.push(this.election.targetUfr || 'Globale UASZ');
    if (this.election.targetFiliere) {
      parts.push(this.election.targetFiliere);
    }
    if (this.election.targetNiveau) {
      parts.push(this.election.targetNiveau);
    }
    return parts.join(' · ');
  }

  get approvedCandidatures(): Candidature[] {
    return this.candidatures.filter(c => !c.statut || c.statut === 'APPROVED');
  }

  get resultsList(): LiveResult[] {
    if (!this.liveResults) {
      return [];
    }
    return this.liveResults.candidateResults || this.liveResults.results || [];
  }

  get hasVotes(): boolean {
    if (this.resultsList.length === 0) {
      return false;
    }
    return (this.liveResults?.totalVotes ?? 0) > 0 || this.resultsList.some(r => r.voteCount > 0);
  }

  get canShowResultsBlock(): boolean {
    if (!this.election) {
      return false;
    }
    return !!(this.liveResults ||
      this.election.statut === 'DEPOUILLEMENT' ||
      this.election.statut === 'PUBLICATION' ||
      this.election.statut === 'CLOTURE');
  }

  get candidaturesEmptyTitle(): string {
    if (!this.election) {
      return 'Aucune candidature publiée';
    }
    return this.election.statut === 'VOTE_OUVERT'
      ? 'Aucun candidat validé pour ce scrutin'
      : 'Aucune candidature publiée';
  }

  getCandidatDisplayName(c?: Candidature | null): string {
    if (!c) {
      return '';
    }
    if (c.candidatPrenom || c.candidatNom) {
      return `${c.candidatPrenom || ''} ${c.candidatNom || ''}`.trim();
    }
    return c.candidatNomComplet || c.nomListe || 'Candidat';
  }

  hasCampaignContent(c: Candidature): boolean {
    return !!(c.posts && c.posts.length > 0);
  }

  openCampaignDrawer(c: Candidature): void {
    this.drawerCandidature = c;
  }

  closeCampaignDrawer(): void {
    this.drawerCandidature = null;
  }

  selectCandidateForVote(c: Candidature): void {
    this.selectedCandidature = c;
    this.voteStep = 1;
    this.modalError = '';
    const el = document.getElementById('vote-stepper');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  isSupervisor(): boolean {
    const user = this.authService.currentUser();
    return !!(user && (user.role === 'SUPER_ADMIN' || user.role === 'COMMISSION_ELECTORALE'));
  }

  get eligibilityInfo(): { isEligible: boolean; reason: string; requiredProfile: string; userProfile: string } {
    const user = this.authService.currentUser();
    const election = this.election;

    if (!user || !election) {
      return { isEligible: false, reason: 'Utilisateur non identifié.', requiredProfile: 'Non spécifié', userProfile: 'Non connecté' };
    }

    const reqParts: string[] = [];
    if (election.targetUfr) reqParts.push(election.targetUfr);
    if (election.targetFiliere) reqParts.push(election.targetFiliere);
    if (election.targetNiveau) reqParts.push(election.targetNiveau);
    const requiredProfile = reqParts.length > 0 ? reqParts.join(' · ') : "Tous les membres de l'UASZ";

    const userParts: string[] = [];
    if (user.ufr) userParts.push(user.ufr);
    if (user.filiere) userParts.push(user.filiere);
    if (user.niveau) userParts.push(user.niveau);
    const userProfile = userParts.length > 0 ? userParts.join(' · ') : (user.typeElecteur || user.role || 'Électeur UASZ');

    if (user.role === 'SUPER_ADMIN' || user.role === 'COMMISSION_ELECTORALE') {
      return {
        isEligible: false,
        reason: `Votre rôle (${user.role === 'SUPER_ADMIN' ? 'Super-Admin' : 'Commission Électorale'}) supervise les scrutins et ne participe pas au vote.`,
        requiredProfile,
        userProfile
      };
    }

    if (election.type === 'DELEGUE') {
      if (user.typeElecteur !== 'ETUDIANT') {
        return {
          isEligible: false,
          reason: "Seuls les étudiants peuvent voter pour l'élection d'un délégué de classe.",
          requiredProfile,
          userProfile
        };
      }
      if (election.targetUfr && (!user.ufr || election.targetUfr.trim().toUpperCase() !== user.ufr.trim().toUpperCase())) {
        return { isEligible: false, reason: `Ce scrutin est réservé aux membres de l'UFR ${election.targetUfr}.`, requiredProfile, userProfile };
      }
      if (election.targetFiliere && (!user.filiere || election.targetFiliere.trim().toUpperCase() !== user.filiere.trim().toUpperCase())) {
        return { isEligible: false, reason: `Ce scrutin est réservé aux étudiants de la filière ${election.targetFiliere}.`, requiredProfile, userProfile };
      }
      if (election.targetNiveau && (!user.niveau || election.targetNiveau.trim().toUpperCase() !== user.niveau.trim().toUpperCase())) {
        return { isEligible: false, reason: `Ce scrutin est réservé aux étudiants de niveau ${election.targetNiveau}.`, requiredProfile, userProfile };
      }
    } else if (election.type === 'DUFR') {
      if (election.targetUfr && (!user.ufr || election.targetUfr.trim().toUpperCase() !== user.ufr.trim().toUpperCase())) {
        return { isEligible: false, reason: `Ce scrutin est réservé aux membres de l'UFR ${election.targetUfr}.`, requiredProfile, userProfile };
      }
    }

    return { isEligible: true, reason: '', requiredProfile, userProfile };
  }

  setChartType(type: 'bar' | 'doughnut'): void {
    if (this.chartType === type) {
      return;
    }
    this.chartType = type;
    this.resultsChart?.destroy();
    this.resultsChart = undefined;
    this.syncResultsChart();
  }

  syncResultsChart(): void {
    const canvas = this.canvasEl?.nativeElement;
    const list = this.resultsList;
    if (!canvas || !this.hasVotes || list.length === 0) {
      return;
    }

    const labels = list.map(r => r.nomCandidat || r.nomListe || 'Candidat');
    const data = list.map(r => r.voteCount);
    const palette = ['#047857', '#1d4ed8', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];
    const colors = labels.map((_, i) => palette[i % palette.length]);

    if (this.resultsChart) {
      this.resultsChart.data.labels = labels;
      this.resultsChart.data.datasets[0].data = data;
      this.resultsChart.data.datasets[0].backgroundColor = colors;
      this.resultsChart.update();
      return;
    }

    this.resultsChart = new Chart(canvas, {
      type: this.chartType,
      data: {
        labels,
        datasets: [{
          label: 'Suffrages',
          data,
          backgroundColor: colors,
          borderRadius: this.chartType === 'bar' ? 6 : 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: this.chartType === 'doughnut', position: 'bottom' }
        },
        scales: this.chartType === 'bar' ? {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        } : undefined
      }
    });
  }

  private canViewLiveResults(statut?: string): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    if (this.isSupervisor()) {
      return true;
    }
    return statut === 'DEPOUILLEMENT' || statut === 'PUBLICATION' || statut === 'CLOTURE';
  }

  fetchData(): void {
    this.electionService.getElection(this.electionId).subscribe({
      next: (data) => {
        this.election = data;
        if (this.canViewLiveResults(data.statut)) {
          this.wsService.connect(this.electionId);
          this.electionService.getLiveResults(this.electionId).subscribe({
            next: (res) => {
              this.liveResults = res;
              this.cdr.detectChanges();
              this.syncResultsChart();
            },
            error: (err) => console.error('WebSocket / Live initial fetch error', err)
          });
        }
      },
      error: () => this.notificationService.showError('Scrutin introuvable.')
    });

    if (this.authService.isLoggedIn()) {
      this.electionService.getCandidatures(this.electionId).subscribe({
        next: (data) => {
          this.candidatures = data;
          this.electionService.getCampaignPostsByElection(this.electionId).subscribe({
            next: (posts) => {
              if (posts && posts.length > 0 && this.candidatures) {
                this.candidatures.forEach(c => {
                  const cPosts = posts.filter(p => p.candidatureId === c.id);
                  if (cPosts.length > 0) {
                    c.posts = cPosts;
                  }
                });
              }
            },
            error: (err) => console.error('Erreur lors du chargement des posts de campagne:', err)
          });
        },
        error: () => this.notificationService.showError('Erreur lors de la récupération des candidatures.')
      });

      this.electionService.getVoteStatus(this.electionId).subscribe({
        next: (status) => {
          this.hasAlreadyVoted = status.hasVoted;
        },
        error: () => {}
      });
    }
  }

  downloadPdfReport(): void {
    if (this.electionId) {
      this.electionService.exportPdfReport(this.electionId).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `proces-verbal-election-${this.electionId}.pdf`;
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

  requestOtp(): void {
    this.otpLoading = true;
    this.modalError = '';
    this.voteService.requestOtp(this.electionId).subscribe({
      next: () => {
        this.otpLoading = false;
        this.voteStep = 2;
      },
      error: (err) => {
        this.otpLoading = false;
        this.modalError = err.error?.message || "Erreur lors de l'envoi du code OTP.";
      }
    });
  }

  verifyOtp(): void {
    if (!this.otpCode || this.otpCode.length < 6) {
      this.modalError = 'Code OTP incomplet.';
      return;
    }

    this.otpLoading = true;
    this.modalError = '';

    this.voteService.verifyOtp(this.electionId, this.otpCode).subscribe({
      next: (res) => {
        this.voteToken = res.voteToken;
        this.submitVote();
      },
      error: (err) => {
        this.otpLoading = false;
        this.modalError = err.error?.message || 'Code OTP invalide ou expiré.';
      }
    });
  }

  submitVote(): void {
    if (!this.selectedCandidature) {
      return;
    }

    this.voteService.submitVote(this.voteToken, this.electionId, this.selectedCandidature.id).subscribe({
      next: (res) => {
        this.otpLoading = false;
        this.ballotHash = res.ballotHash;
        this.hasAlreadyVoted = true;
        this.voteStep = 3;
      },
      error: (err) => {
        this.otpLoading = false;
        this.modalError = err.error?.message || "Erreur lors de l'émission du bulletin.";
      }
    });
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    if (!url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    let embedUrl = url.trim();

    if (embedUrl.includes('youtube.com/watch?v=')) {
      const parts = embedUrl.split('watch?v=');
      const videoId = parts[1] ? parts[1].split('&')[0] : '';
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (embedUrl.includes('youtu.be/')) {
      const parts = embedUrl.split('youtu.be/');
      const videoId = parts[1] ? parts[1].split('?')[0] : '';
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (embedUrl.includes('vimeo.com/')) {
      const parts = embedUrl.split('vimeo.com/');
      const videoId = parts[1] ? parts[1].split('?')[0] : '';
      if (!embedUrl.includes('player.vimeo.com')) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
}
