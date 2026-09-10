import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { VoteService } from '../../services/vote.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, LiveResultsDto, CampaignPost } from '../../models/vote.models';

@Component({
  selector: 'app-election-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule
  ],
  template: `
    <!-- Header Mobile & Desktop -->
    <div class="uasz-header-mobile md:mx-auto md:max-w-7xl md:mt-6 relative overflow-hidden mb-6" *ngIf="election">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col p-5 md:p-8">
        <a routerLink="/elections" class="text-[11px] font-bold text-white/90 hover:text-white mb-4 inline-flex items-center space-x-1.5 transition-colors bg-white/10 px-3 py-1.5 rounded-lg w-max border border-white/20 hover:bg-white/20">
          <span class="text-sm leading-none">←</span>
          <span>Retour aux élections</span>
        </a>
        
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div class="flex-1 text-center md:text-left w-full flex flex-col items-center md:items-start">
            <div class="w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg mb-3 mx-auto md:mx-0 border border-white/20 overflow-hidden">
              <img src="assets/logo_vote_uasz.PNG" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
            </div>
            
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white mb-2 leading-tight">{{ election.titre }}</h1>
            <span class="px-3 py-1 rounded-lg text-[10px] font-black bg-white text-[#047857] uppercase tracking-widest shadow-sm mb-3 inline-block">
              {{ election.statut }}
            </span>
            <p class="text-xs md:text-sm text-emerald-50 max-w-2xl font-medium leading-relaxed" *ngIf="election.description">
              {{ election.description }}
            </p>
          </div>

          <!-- Scope info -->
          <div class="bg-black/15 backdrop-blur-md p-4 rounded-xl border border-white/20 text-xs space-y-2 min-w-[210px] text-white w-full md:w-auto shadow-inner">
            <div class="flex justify-between items-center pb-1.5 border-b border-white/15">
              <span class="text-emerald-100/90 font-bold uppercase tracking-wider text-[10px]">Type</span>
              <span class="font-extrabold text-xs text-white">{{ election.type }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-emerald-100/90 font-bold uppercase tracking-wider text-[10px]">UFR</span>
              <span class="font-bold text-white">{{ election.targetUfr || 'Globale UASZ' }}</span>
            </div>
            <div class="flex justify-between items-center" *ngIf="election.targetFiliere">
              <span class="text-emerald-100/90 font-bold uppercase tracking-wider text-[10px]">Filière</span>
              <span class="font-bold text-white">{{ election.targetFiliere }}</span>
            </div>
            <div class="flex justify-between items-center pt-1.5 border-t border-white/15" *ngIf="election.targetNiveau">
              <span class="text-emerald-100/90 font-bold uppercase tracking-wider text-[10px]">Niveau</span>
              <span class="font-bold text-white">{{ election.targetNiveau }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8" *ngIf="election">
      <!-- Live Results Section (WebSocket) -->
      <div *ngIf="liveResults || election.statut === 'DEPOUILLEMENT' || election.statut === 'PUBLICATION'"
           class="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">

        <!-- Section header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#047857] animate-ping shrink-0"></span>
            <h2 class="text-base font-black text-slate-900 tracking-tight">Résultats en Direct</h2>
          </div>
          <span class="text-[10px] font-black text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-widest">
            Live (STOMP)
          </span>
        </div>

        <!-- Results grid when data is available -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4"
             *ngIf="liveResults && liveResults.results && liveResults.results.length > 0">
          <div *ngFor="let item of liveResults.results" class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors group">
            <div class="flex justify-between items-center mb-2">
              <span class="font-bold text-slate-900 text-sm group-hover:text-[#047857] transition-colors truncate pr-2">{{ item.nomListe }}</span>
              <span class="text-[11px] font-black text-[#047857] bg-emerald-100/60 px-2 py-0.5 rounded-md shrink-0">{{ item.percentage }}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 mb-1.5 overflow-hidden">
              <div class="bg-[#047857] h-full rounded-full transition-all duration-700 ease-out" [style.width.%]="item.percentage"></div>
            </div>
            <p class="text-[10px] font-bold text-slate-400 text-right uppercase tracking-wider">{{ item.voteCount }} suffrages</p>
          </div>
        </div>

        <!-- Empty state: centered, medium -->
        <div *ngIf="!liveResults || !liveResults.results || liveResults.results.length === 0"
             class="flex flex-col items-center justify-center py-6 text-center px-4">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
            <lucide-icon name="bar-chart-2" class="w-5 h-5 text-emerald-400"></lucide-icon>
          </div>
          <p class="text-sm font-bold text-slate-700 mb-0.5">Résultats en attente</p>
          <p class="text-xs text-slate-400 font-medium max-w-xs">Disponibles dès l'ouverture du dépouillement.</p>
        </div>
      </div>

      <!-- Candidates List -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
          <lucide-icon name="users" class="w-5 h-5 text-[#047857] shrink-0"></lucide-icon>
          <span>Candidats &amp; Programmes</span>
        </h2>
        <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">PDF &amp; Vidéos</span>
      </div>

      <!-- Empty state: centered, medium -->
      <div *ngIf="candidatures.length === 0"
           class="flex flex-col items-center justify-center py-6 text-center bg-white rounded-2xl border border-slate-200 shadow-sm mb-5">
        <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
          <lucide-icon name="inbox" class="w-5 h-5 text-slate-400"></lucide-icon>
        </div>
        <p class="text-sm font-bold text-slate-700 mb-0.5">Aucune candidature publiée</p>
        <p class="text-xs text-slate-400 font-medium max-w-xs">Aucun candidat n'a encore publié son programme.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6" *ngIf="candidatures.length > 0">
        <div *ngFor="let c of candidatures"
             class="bg-white p-4 rounded-2xl border border-slate-200/90 flex flex-col justify-between relative shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group overflow-hidden">
          
          <!-- Hover side border indicator -->
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#047857] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="pl-1.5">
            <div class="flex items-center space-x-3.5 mb-3.5">
              <div class="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                <img *ngIf="c.photoUrl" [src]="c.photoUrl" class="w-full h-full object-cover"/>
                <lucide-icon *ngIf="!c.photoUrl" name="user" class="w-5 h-5 text-slate-400"></lucide-icon>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900 group-hover:text-[#047857] transition-colors leading-snug">{{ c.nomListe }}</h3>
                <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{{ c.candidatPrenom }} {{ c.candidatNom }} <span class="text-[#1d4ed8]">#{{ c.candidatMatricule }}</span></p>
              </div>
            </div>

            <!-- Documents PDF -->
            <div class="flex flex-wrap gap-2 mb-3.5">
              <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank"
                 class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition-colors flex items-center space-x-1">
                 <lucide-icon name="file-text" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                 <span>Programme</span>
              </a>
              <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank"
                 class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition-colors flex items-center space-x-1">
                <lucide-icon name="file-check" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>CV</span>
              </a>
            </div>

            <!-- Campaign Posts with Video Support -->
            <div *ngIf="c.posts && c.posts.length > 0" class="mt-2 pt-3 border-t border-slate-100 space-y-2.5">
              <h4 class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Publications</h4>
              <div *ngFor="let post of c.posts" class="bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <p class="text-xs font-bold text-slate-900 mb-1 leading-snug">{{ post.titre }}</p>
                <p class="text-[11px] text-slate-600 mb-2 font-medium leading-relaxed">{{ post.contenu }}</p>

                <!-- YouTube / Vimeo Video Embed -->
                <div *ngIf="post.videoEmbedUrl" class="mt-2 rounded-lg overflow-hidden aspect-video border border-slate-200 bg-slate-900">
                  <iframe [src]="getSafeVideoUrl(post.videoEmbedUrl)" class="w-full h-full" frameborder="0" allowfullscreen></iframe>
                </div>
              </div>
            </div>
          </div>

          <!-- Vote Button -->
          <div class="mt-5 pt-3.5 border-t border-slate-100 pl-1.5">
            <button *ngIf="election.statut === 'VOTE_OUVERT'" (click)="openVoteModal(c)"
                    class="uasz-btn-primary w-full py-2 text-xs">
              <lucide-icon name="vote" class="w-4 h-4 shrink-0"></lucide-icon>
              <span>Choisir {{ c.nomListe }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Voting Modal (3-Step OTP Process) -->
      <div *ngIf="showVoteModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
        <div class="bg-white w-full max-w-lg p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-2xl relative animate-fade-in-up">

          <button (click)="closeVoteModal()" class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors">
            <lucide-icon name="x" class="w-4 h-4 text-slate-500"></lucide-icon>
          </button>

          <!-- Step 1: Confirmation -->
          <div *ngIf="voteStep === 1">
            <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-[#047857] flex items-center justify-center mb-4">
              <lucide-icon name="vote" class="w-6 h-6 text-[#047857]"></lucide-icon>
            </div>
            <h3 class="text-xl font-black text-slate-900 mb-2 tracking-tight">Confirmer votre Choix</h3>
            <p class="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
              Vous vous apprêtez à voter pour la liste <b class="text-[#047857]">{{ selectedCandidature?.nomListe }}</b> dans l'élection <b class="text-slate-900">{{ election.titre }}</b>.
            </p>

            <button (click)="requestOtp()" [disabled]="otpLoading"
                    class="uasz-btn-primary w-full py-2.5 text-xs font-bold shadow-md">
              <span *ngIf="!otpLoading" class="flex items-center justify-center space-x-1.5">
                <lucide-icon name="send" class="w-4 h-4 shrink-0"></lucide-icon>
                <span>Recevoir le Code OTP</span>
              </span>
              <lucide-icon *ngIf="otpLoading" name="loader-2" class="w-4.5 h-4.5 animate-spin mx-auto text-white"></lucide-icon>
            </button>
            <p class="text-[9px] text-center text-slate-400 mt-2 font-bold uppercase tracking-wider">Valide 5 min</p>
          </div>

          <!-- Step 2: Enter OTP Code -->
          <div *ngIf="voteStep === 2">
            <div class="w-12 h-12 rounded-2xl bg-blue-100 text-[#1d4ed8] flex items-center justify-center mb-4">
              <lucide-icon name="key" class="w-6 h-6 text-[#1d4ed8]"></lucide-icon>
            </div>
            <h3 class="text-xl font-black text-slate-900 mb-2 tracking-tight">Code de Sécurité OTP</h3>
            <p class="text-xs text-slate-600 mb-5 font-medium leading-relaxed">
              Saisissez le code à 6 chiffres envoyé. Valide pendant <b class="text-[#1d4ed8]">5 minutes</b>.
            </p>

            <input type="text" [(ngModel)]="otpCode" maxlength="6" placeholder="------"
                   class="w-full text-center tracking-[0.5em] text-2xl font-mono py-2.5 rounded-xl bg-slate-50 border-2 border-[#1d4ed8]/30 text-[#1d4ed8] mb-5 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 transition-all font-black"/>

            <button (click)="verifyOtp()" [disabled]="otpLoading"
                    class="uasz-btn-primary w-full py-2.5 text-xs font-bold shadow-md !bg-gradient-to-r !from-[#1d4ed8] !to-blue-700 hover:!from-blue-700 hover:!to-[#1d4ed8]">
              <span *ngIf="!otpLoading">Valider et Voter</span>
              <lucide-icon *ngIf="otpLoading" name="loader-2" class="w-4.5 h-4.5 animate-spin mx-auto text-white"></lucide-icon>
            </button>
          </div>

          <!-- Step 3: Success Confirmation -->
          <div *ngIf="voteStep === 3" class="text-center py-2">
            <div class="w-16 h-16 rounded-full bg-emerald-100 border-4 border-white shadow-[0_0_15px_rgba(4,120,87,0.2)] text-[#047857] flex items-center justify-center mx-auto mb-4">
              <lucide-icon name="check-circle-2" class="w-9 h-9 text-[#047857]"></lucide-icon>
            </div>
            <h3 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">Vote Enregistré !</h3>
            <p class="text-xs text-slate-600 mb-6 font-medium leading-relaxed">
              Votre bulletin chiffré a été déposé de manière strictly anonyme dans l'urne électronique.
            </p>

            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-500 break-all mb-6 font-bold text-left shadow-inner">
              <span class="block text-[9px] uppercase tracking-widest text-slate-400 mb-1">Empreinte Hash (Preuve)</span>
              {{ ballotHash }}
            </div>

            <button (click)="closeVoteModal()" class="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-md">
              Terminer
            </button>
          </div>

          <!-- Error Alert inside modal (Rouge UASZ) -->
          <div *ngIf="modalError" class="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#dc2626] text-xs font-bold flex items-start space-x-2 animate-fade-in-up">
            <lucide-icon name="alert-triangle" class="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5"></lucide-icon>
            <span>{{ modalError }}</span>
          </div>

        </div>
      </div>

    </div>
  `
})
export class ElectionDetailComponent implements OnInit, OnDestroy {
  electionId!: number;
  election: Election | null = null;
  candidatures: Candidature[] = [];
  liveResults: LiveResultsDto | null = null;

  // Vote Modal State
  showVoteModal = false;
  voteStep = 1; // 1: confirm, 2: OTP, 3: Success
  selectedCandidature: Candidature | null = null;
  otpCode = '';
  voteToken = '';
  ballotHash = '';
  otpLoading = false;
  modalError = '';

  private route = inject(ActivatedRoute);
  private electionService = inject(ElectionService);
  private voteService = inject(VoteService);
  private wsService = inject(WebSocketService);
  private sanitizer = inject(DomSanitizer);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.electionId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchData();

    // Connect WebSocket for live results
    this.wsService.connect(this.electionId);
    this.wsService.results$.subscribe((results) => {
      if (results) this.liveResults = results;
    });
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }

  fetchData(): void {
    this.electionService.getElection(this.electionId).subscribe({
      next: (data) => this.election = data,
      error: (err) => this.notificationService.showError("Scrutin introuvable.")
    });

    this.electionService.getCandidatures(this.electionId).subscribe({
      next: (data) => this.candidatures = data,
      error: (err) => this.notificationService.showError("Erreur lors de la récupération des candidatures.")
    });

    this.electionService.getLiveResults(this.electionId).subscribe({
      next: (data) => this.liveResults = data,
      error: (err) => console.error('WebSocket / Live initial fetch error', err)
    });
  }

  openVoteModal(c: Candidature): void {
    this.selectedCandidature = c;
    this.voteStep = 1;
    this.modalError = '';
    this.showVoteModal = true;
  }

  closeVoteModal(): void {
    this.showVoteModal = false;
    this.otpCode = '';
    this.voteToken = '';
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
        this.modalError = err.error?.message || 'Erreur lors de l\'envoi du code OTP.';
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
    if (!this.selectedCandidature) return;

    this.voteService.submitVote(this.voteToken, this.electionId, this.selectedCandidature.id).subscribe({
      next: (res) => {
        this.otpLoading = false;
        this.ballotHash = res.ballotHash;
        this.voteStep = 3;
      },
      error: (err) => {
        this.otpLoading = false;
        this.modalError = err.error?.message || 'Erreur lors de l\'émission du bulletin.';
      }
    });
  }

  getSafeVideoUrl(url: string): SafeResourceUrl {
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      embedUrl = url.replace('watch?v=', 'embed/');
    } else if (url.includes('youtu.be/')) {
      embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }
}
