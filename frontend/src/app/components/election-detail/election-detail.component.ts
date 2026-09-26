import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  LucideAngularModule,
  AlertTriangle,
  Lock,
  BarChart2,
  Users,
  Inbox,
  User,
  FileText,
  FileCheck,
  Vote,
  X,
  Send,
  Loader2,
  Key,
  CheckCircle2
} from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { VoteService } from '../../services/vote.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, LiveResultsDto, LiveResult, CampaignPost } from '../../models/vote.models';

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

      <!-- Ineligibility Banner / Card -->
      <div *ngIf="election.statut === 'VOTE_OUVERT' && !eligibilityInfo.isEligible"
           class="glass-card rounded-2xl p-5 border border-amber-200 bg-amber-50/80 shadow-sm mb-6 animate-fade-in-up">
        <div class="flex items-start space-x-3.5">
          <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <lucide-icon name="alert-triangle" class="w-5 h-5 text-amber-700"></lucide-icon>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-black text-amber-900 mb-1 leading-snug">Vous n'êtes pas éligible pour voter à cette élection</h3>
            <p class="text-xs text-amber-800 font-medium leading-relaxed mb-3">
              {{ eligibilityInfo.reason }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-bold">
              <div class="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                <span class="block text-[9px] uppercase tracking-wider text-amber-600 mb-0.5 font-black">Profil Requis pour ce Scrutin</span>
                <span class="text-slate-800 font-extrabold">{{ eligibilityInfo.requiredProfile }}</span>
              </div>
              <div class="bg-white/90 p-2.5 rounded-xl border border-amber-200">
                <span class="block text-[9px] uppercase tracking-wider text-amber-600 mb-0.5 font-black">Votre Profil Actuel</span>
                <span class="text-slate-800 font-extrabold">{{ eligibilityInfo.userProfile }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Results Section (WebSocket & Final PV) -->
      <div *ngIf="liveResults || election.statut === 'DEPOUILLEMENT' || election.statut === 'PUBLICATION' || election.statut === 'CLOTURE'"
           class="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">

        <!-- Section header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full bg-[#047857] animate-ping shrink-0" *ngIf="election.statut !== 'CLOTURE'"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" *ngIf="election.statut === 'CLOTURE'"></span>
            <h2 class="text-base font-black text-slate-900 tracking-tight">
              {{ election.statut === 'CLOTURE' ? 'Résultats Officiels & Définitifs' : 'Résultats en Direct' }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <button *ngIf="election.statut === 'CLOTURE' || election.statut === 'PUBLICATION'"
                    (click)="downloadPdfReport()"
                    type="button"
                    class="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-300 transition-colors shadow-sm cursor-pointer">
              <lucide-icon name="file-text" class="w-4 h-4"></lucide-icon>
              <span>Procès-Verbal (PDF)</span>
            </button>
            <span class="text-[10px] font-black text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-widest">
              {{ election.statut === 'CLOTURE' ? 'Officiel' : 'Live (STOMP)' }}
            </span>
          </div>
        </div>

        <!-- Results grid when data is available -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4"
             *ngIf="resultsList.length > 0">
          <div *ngFor="let item of resultsList" class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors group">
            <div class="flex justify-between items-center mb-2">
              <div class="flex flex-col truncate pr-2">
                <span class="font-bold text-slate-900 text-sm group-hover:text-[#047857] transition-colors truncate">{{ item.nomCandidat || item.nomListe }}</span>
              </div>
              <span class="text-[11px] font-black text-[#047857] bg-emerald-100/60 px-2 py-0.5 rounded-md shrink-0">{{ item.percentage }}%</span>
            </div>
            <div class="w-full bg-slate-200 rounded-full h-2 mb-1.5 overflow-hidden">
              <div class="bg-[#047857] h-full rounded-full transition-all duration-700 ease-out" [style.width.%]="item.percentage"></div>
            </div>
            <p class="text-[10px] font-bold text-slate-400 text-right uppercase tracking-wider">{{ item.voteCount }} suffrages</p>
          </div>
        </div>

        <!-- Empty state: centered, medium -->
        <div *ngIf="resultsList.length === 0"
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
        <p class="text-sm font-bold text-slate-700 mb-0.5">
          {{ candidaturesEmptyTitle }}
        </p>
        <p class="text-xs text-slate-400 font-medium max-w-sm">
          {{ candidaturesEmptySubtitle }}
        </p>
      </div>

      <!-- Candidates Grid (Scalable, align-start, non-stretching cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 items-start mb-6" *ngIf="candidatures.length > 0">
        <div *ngFor="let c of displayedCandidatures"
             class="bg-white p-4 rounded-2xl border border-slate-200/90 flex flex-col justify-between relative shadow-sm hover:shadow-md hover:border-emerald-300 transition-all group overflow-hidden">

          <!-- Hover side border indicator -->
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#047857] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="pl-1">

            <!-- ══ 1. HEADER: Avatar + Nom + Badge matricule ══ -->
            <!-- photoUrl = Candidature.photoUrl (photo uploadée lors de la candidature, pas l'affiche) -->
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center shadow-sm">
                <!-- Photo réelle (Candidature.photoUrl) -->
                <img *ngIf="c.photoUrl && !isImageFailed(c.photoUrl)"
                     [src]="c.photoUrl"
                     (error)="onImgError($event, c.photoUrl)"
                     alt="Photo candidat"
                     class="w-full h-full object-cover" />
                <!-- Fallback initiales si pas de photo ou erreur -->
                <div *ngIf="!c.photoUrl || isImageFailed(c.photoUrl)"
                     class="w-full h-full bg-gradient-to-br from-[#1d4ed8] to-[#1e40af] text-white font-black text-sm flex items-center justify-center">
                  {{ getCandidatInitials(c) }}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <!-- Nom affiché une seule fois, jamais répété -->
                <p class="text-sm font-bold text-slate-900 group-hover:text-[#047857] transition-colors leading-tight truncate">
                  {{ getCandidatDisplayName(c) }}
                </p>
                <!-- Matricule: badge séparé, jamais fusionné au nom -->
                <span *ngIf="c.candidatMatricule"
                      class="inline-block mt-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-[#1d4ed8] border border-blue-100 tracking-wider uppercase">
                  {{ c.candidatMatricule }}
                </span>
              </div>
            </div>

            <!-- ══ 2. BOUTONS PROGRAMME / CV — ghost discret, bordure fine ══ -->
            <!-- programmePdf → Candidature.programmePdf (PDF programme de candidature) -->
            <!-- cvUrl        → Candidature.cvUrl        (CV du candidat)               -->
            <div class="grid grid-cols-2 gap-2 mb-3">
              <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank" rel="noopener"
                 class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 bg-transparent text-slate-700 text-[11px] font-semibold hover:border-slate-400 hover:bg-slate-50 transition-colors">
                <lucide-icon name="file-text" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span class="truncate">Programme</span>
              </a>
              <!-- Désactivé si aucun PDF (pas de lien mort) -->
              <span *ngIf="!c.programmePdf"
                    class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-dashed border-slate-200 text-slate-400 text-[11px] font-semibold cursor-default select-none opacity-60">
                <lucide-icon name="file-text" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span class="truncate">Sans prog.</span>
              </span>

              <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank" rel="noopener"
                 class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 bg-transparent text-slate-700 text-[11px] font-semibold hover:border-slate-400 hover:bg-slate-50 transition-colors">
                <lucide-icon name="file-check" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span class="truncate">CV</span>
              </a>
              <!-- Désactivé si aucun CV (pas de lien mort) -->
              <span *ngIf="!c.cvUrl"
                    class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-dashed border-slate-200 text-slate-400 text-[11px] font-semibold cursor-default select-none opacity-60">
                <lucide-icon name="file-check" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span class="truncate">Sans CV</span>
              </span>
            </div>

            <!-- ══ 3. SÉPARATEUR ══ -->
            <div class="border-t border-slate-100 pt-3">

              <!-- ══ 4. BLOC PUBLICATIONS DE CAMPAGNE ══ -->
              <div *ngIf="c.posts && c.posts.length > 0">
                <h4 class="text-[10px] font-black text-[#047857] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                  <lucide-icon name="megaphone" class="w-3.5 h-3.5"></lucide-icon>
                  <span>Publications de Campagne</span>
                </h4>

                <div class="space-y-3">
                  <div *ngFor="let post of c.posts; let last = last"
                       class="space-y-2"
                       [class.border-b]="!last"
                       [class.border-slate-100]="!last"
                       [class.pb-3]="!last">

                    <!-- Titre (CampaignPost.titre) -->
                    <h5 class="text-[14px] font-medium text-slate-900 leading-snug">{{ post.titre }}</h5>

                    <!-- Contenu / message (CampaignPost.contenu) -->
                    <!-- line-clamp-2 par défaut, toggle CLIC uniquement (fonctionne mouse et touch) -->
                    <div *ngIf="post.contenu">
                      <p [class]="isPostExpanded(post.id) ? 'whitespace-pre-line' : 'line-clamp-2 whitespace-pre-line'"
                         class="text-[13px] text-slate-500 leading-relaxed">
                        {{ post.contenu }}
                      </p>
                      <button *ngIf="post.contenu.length > 80"
                              (click)="toggleExpandPost(post.id)"
                              type="button"
                              class="text-[11px] font-bold text-[#047857] mt-0.5 cursor-pointer focus:outline-none">
                        {{ isPostExpanded(post.id) ? 'Voir moins' : 'Voir plus' }}
                      </button>
                    </div>

                    <!-- VIDÉO (CampaignPost.videoEmbedUrl) — pleine largeur, lazy load -->
                    <!-- PAS d'affiche ni d'image à côté — zone média = vidéo seule ou rien -->
                    <!-- Iframe src injecté UNIQUEMENT au clic (activeVideoPostId) — vrai lazy load -->
                    <div *ngIf="post.videoEmbedUrl" class="mt-1.5">
                      <!-- Miniature + bouton play (avant le clic) -->
                      <div *ngIf="activeVideoPostId !== post.id"
                           (click)="playVideo(post.id)"
                           class="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group/vid cursor-pointer">
                        <img [src]="getYoutubeThumbnail(post.videoEmbedUrl) || 'assets/logo_vote_uasz.PNG'"
                             class="w-full h-full object-cover opacity-80 group-hover/vid:opacity-100 transition-opacity duration-300" />
                        <div class="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/vid:bg-black/10 transition-colors">
                          <div class="w-9 h-9 rounded-full bg-[#047857] flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                            <lucide-icon name="play" class="w-4 h-4 fill-white ml-0.5 text-white"></lucide-icon>
                          </div>
                        </div>
                        <span class="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[8px] font-bold flex items-center gap-0.5">
                          <lucide-icon name="video" class="w-2.5 h-2.5 text-emerald-400"></lucide-icon>
                          <span>Profession de foi</span>
                        </span>
                      </div>
                      <!-- Iframe: src injecté ICI SEULEMENT après clic — aucun chargement avant -->
                      <div *ngIf="activeVideoPostId === post.id"
                           class="rounded-xl overflow-hidden aspect-video border border-slate-200 bg-slate-900">
                        <iframe [src]="getSafeVideoUrl(post.videoEmbedUrl)"
                                class="w-full h-full" frameborder="0" allowfullscreen
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                        </iframe>
                      </div>
                    </div>
                    <!-- Si aucune vidéo → rien affiché dans la zone média -->

                  </div><!-- /post loop -->
                </div>
              </div>

              <!-- État vide : pas de publication -->
              <div *ngIf="!c.posts || c.posts.length === 0"
                   class="flex flex-col items-center justify-center py-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center gap-1">
                <lucide-icon name="inbox" class="w-4 h-4 text-slate-400"></lucide-icon>
                <p class="text-[11px] font-bold text-slate-500">Aucune publication pour le moment</p>
              </div>

            </div><!-- /séparateur -->
          </div><!-- /pl-1 -->

          <!-- Bouton voter (VOTE_OUVERT + éligible uniquement) -->
          <div class="mt-4 pt-3 border-t border-slate-100 pl-1" *ngIf="election.statut === 'VOTE_OUVERT' && eligibilityInfo.isEligible">
            <button (click)="openVoteModal(c)"
                    class="uasz-btn-primary w-full py-2 text-xs flex items-center justify-center space-x-1.5 shadow-sm">
              <lucide-icon name="vote" class="w-4 h-4 shrink-0"></lucide-icon>
              <span>Choisir {{ getCandidatDisplayName(c) }}</span>
            </button>
          </div>
        </div>
      </div>


      <!-- 8. Scalability: Load More Candidates Button -->
      <div *ngIf="candidatures.length > displayedCandidatures.length" class="text-center my-6">
        <button (click)="loadMoreCandidates()" type="button"
                class="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#047857] hover:border-emerald-300 font-bold text-xs shadow-sm transition-all inline-flex items-center space-x-2 cursor-pointer">
          <span>Afficher plus de candidats ({{ candidatures.length - displayedCandidatures.length }} restants)</span>
          <lucide-icon name="chevron-down" class="w-4 h-4"></lucide-icon>
        </button>
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
              Vous vous apprêtez à voter pour <b class="text-[#047857]">{{ getCandidatDisplayName(selectedCandidature) }}</b> dans l'élection <b class="text-slate-900">{{ election.titre }}</b>.
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
              Votre bulletin chiffré a été déposé de manière strictement anonyme dans l'urne électronique.
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
  activeVideoPostId: number | null = null;
  failedImages: Set<string> = new Set();
  expandedPostIds: Set<number> = new Set();
  candidatesPage = 1;
  pageSize = 6;

  toggleExpandPost(postId: number): void {
    if (this.expandedPostIds.has(postId)) {
      this.expandedPostIds.delete(postId);
    } else {
      this.expandedPostIds.add(postId);
    }
  }

  isPostExpanded(postId: number): boolean {
    return this.expandedPostIds.has(postId);
  }

  get displayedCandidatures(): Candidature[] {
    return this.candidatures.slice(0, this.candidatesPage * this.pageSize);
  }

  loadMoreCandidates(): void {
    this.candidatesPage++;
  }

  getCandidatDisplayName(c?: Candidature | null): string {
    if (!c) return '';
    if (c.candidatPrenom || c.candidatNom) {
      return `${c.candidatPrenom || ''} ${c.candidatNom || ''}`.trim();
    }
    return c.candidatNomComplet || c.nomListe || 'Candidat';
  }

  getCandidatInitials(c?: Candidature | null): string {
    if (!c) return 'C';
    const prenom = c.candidatPrenom || '';
    const nom = c.candidatNom || '';
    if (prenom || nom) {
      const p = prenom.trim() ? prenom.trim()[0].toUpperCase() : '';
      const n = nom.trim() ? nom.trim()[0].toUpperCase() : '';
      return (p + n) || 'C';
    }
    const full = this.getCandidatDisplayName(c).trim();
    const parts = full.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return full.substring(0, 2).toUpperCase() || 'C';
  }

  getYoutubeThumbnail(url?: string): string | null {
    if (!url) return null;
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || '';
    }
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  }

  playVideo(postId: number): void {
    this.activeVideoPostId = postId;
  }

  onImgError(event: any, url?: string): void {
    if (url) this.failedImages.add(url);
    if (event && event.target) {
      event.target.style.display = 'none';
    }
  }

  isImageFailed(url?: string): boolean {
    if (!url || !url.trim()) return true;
    const lower = url.toLowerCase();
    if (lower.includes('via.placeholder.com') || lower.includes('placeholder')) return true;
    return this.failedImages.has(url);
  }

  get resultsList(): LiveResult[] {
    if (!this.liveResults) return [];
    return this.liveResults.candidateResults || this.liveResults.results || [];
  }

  downloadPdfReport(): void {
    if (this.electionId) {
      this.electionService.downloadPdfReport(this.electionId);
    }
  }

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
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private notificationService = inject(NotificationService);

  get candidaturesEmptyTitle(): string {
    if (!this.election) return 'Aucune candidature publiée';
    return this.election.statut === 'VOTE_OUVERT'
      ? "Le vote n'est pas encore disponible : aucune candidature approuvée"
      : "Aucune candidature publiée";
  }

  get candidaturesEmptySubtitle(): string {
    if (!this.election) return "Aucun candidat n'a encore publié son programme.";
    return this.election.statut === 'VOTE_OUVERT'
      ? "Bien que vous soyez éligible et que le scrutin soit ouvert, aucun candidat n'a encore été validé pour cette élection."
      : "Aucun candidat n'a encore publié son programme.";
  }

  get eligibilityInfo(): { isEligible: boolean; reason: string; requiredProfile: string; userProfile: string } {
    const user = this.authService.currentUser();
    const election = this.election;

    if (!user || !election) {
      return { isEligible: false, reason: 'Utilisateur non identifié.', requiredProfile: 'Non spécifié', userProfile: 'Non connecté' };
    }

    // Required profile text (ex: UFR_SAT · INFORMATIQUE · L3)
    const reqParts: string[] = [];
    if (election.targetUfr) reqParts.push(election.targetUfr);
    if (election.targetFiliere) reqParts.push(election.targetFiliere);
    if (election.targetNiveau) reqParts.push(election.targetNiveau);
    const requiredProfile = reqParts.length > 0 ? reqParts.join(' · ') : "Tous les membres de l'UASZ";

    // User profile text (ex: UFR_SAT · INFORMATIQUE · L2)
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
        return {
          isEligible: false,
          reason: `Ce scrutin est réservé aux membres de l'UFR ${election.targetUfr}.`,
          requiredProfile,
          userProfile
        };
      }
      if (election.targetFiliere && (!user.filiere || election.targetFiliere.trim().toUpperCase() !== user.filiere.trim().toUpperCase())) {
        return {
          isEligible: false,
          reason: `Ce scrutin est réservé aux étudiants de la filière ${election.targetFiliere}.`,
          requiredProfile,
          userProfile
        };
      }
      if (election.targetNiveau && (!user.niveau || election.targetNiveau.trim().toUpperCase() !== user.niveau.trim().toUpperCase())) {
        return {
          isEligible: false,
          reason: `Ce scrutin est réservé aux étudiants de niveau ${election.targetNiveau}.`,
          requiredProfile,
          userProfile
        };
      }
    } else if (election.type === 'DUFR') {
      if (election.targetUfr && (!user.ufr || election.targetUfr.trim().toUpperCase() !== user.ufr.trim().toUpperCase())) {
        return {
          isEligible: false,
          reason: `Ce scrutin est réservé aux membres de l'UFR ${election.targetUfr}.`,
          requiredProfile,
          userProfile
        };
      }
    }

    return { isEligible: true, reason: '', requiredProfile, userProfile };
  }

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
      error: () => this.notificationService.showError("Scrutin introuvable.")
    });

    this.electionService.getCandidatures(this.electionId).subscribe({
      next: (data) => {
        this.candidatures = data;
        // Charger les publications de campagne de l'élection
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
      error: () => this.notificationService.showError("Erreur lors de la récupération des candidatures.")
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
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
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
