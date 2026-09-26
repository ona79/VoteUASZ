import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { Election, Candidature, CampaignPost } from '../../models/vote.models';

@Component({
  selector: 'app-candidate-dashboard',
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
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-2 leading-tight">Espace Campagne Candidat</h1>
        <p class="text-xs md:text-sm text-emerald-50 max-w-2xl font-medium leading-relaxed">
          Soumettez vos dossiers de candidature pour validation et publiez vos affiches et vidéos professionnelles sur votre espace officiel.
        </p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      
      <!-- MOBILE QUICK TAB SWITCHER -->
      <div class="lg:hidden mb-5 flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button (click)="activeMobileTab = 'cand'"
                [class]="activeMobileTab === 'cand' ? 'bg-[#1d4ed8] text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
                class="flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5">
          <lucide-icon name="file-edit" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
          <span class="truncate">1. Candidature</span>
        </button>

        <button (click)="activeMobileTab = 'post'"
                [class]="activeMobileTab === 'post' ? 'bg-[#047857] text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'"
                class="flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5">
          <lucide-icon name="video" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
          <span class="truncate">2. Publication</span>
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <!-- Card 1: Formulaire Dépôt de Candidature -->
        <div [class.hidden]="activeMobileTab === 'post'" class="lg:block glass-card rounded-2xl p-4 md:p-5 flex flex-col h-full uasz-card-hover group border border-slate-200/80 shadow-sm relative overflow-hidden">
          
          <!-- Hover side border indicator -->
          <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1d4ed8] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-center space-x-2.5 mb-4 pb-2.5 border-b border-slate-100 pl-1.5">
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-[#1d4ed8] flex items-center justify-center shrink-0">
              <lucide-icon name="file-edit" class="w-3.5 h-3.5 text-[#1d4ed8]"></lucide-icon>
            </div>
            <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight">1. Dossier de Candidature</h2>
          </div>

          <form (ngSubmit)="submitCandidature()" class="space-y-3 flex-1 flex flex-col pl-1.5">
            <div>
              <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Scrutin Électoral *</label>
              <select [(ngModel)]="newCand.electionId" name="electionId" required
                      class="uasz-input !py-1.5 !px-2.5 text-xs font-bold">
                <option [ngValue]="null" disabled selected>Sélectionner une élection</option>
                <option *ngFor="let e of openElections" [value]="e.id" [disabled]="hasAppliedToElection(e.id)">
                  {{ e.titre }} ({{ e.type }}) {{ hasAppliedToElection(e.id) ? '— [Déjà postulé]' : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">URL Photo Officielle</label>
              <input type="text" [(ngModel)]="newCand.photoUrl" name="photoUrl" placeholder="https://..."
                     class="uasz-input !py-1.5 !px-2.5 text-xs"/>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">URL Programme PDF</label>
                <input type="text" [(ngModel)]="newCand.programmePdf" name="programmePdf" placeholder="https://..."
                       class="uasz-input !py-1.5 !px-2.5 text-xs"/>
              </div>
              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">URL CV PDF</label>
                <input type="text" [(ngModel)]="newCand.cvUrl" name="cvUrl" placeholder="https://..."
                       class="uasz-input !py-1.5 !px-2.5 text-xs"/>
              </div>
            </div>

            <div class="mt-auto pt-3">
              <button type="submit" [disabled]="candLoading || !newCand.electionId || hasAppliedToElection(newCand.electionId)"
                      class="w-full py-2 rounded-xl bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <span *ngIf="!candLoading">Soumettre ma Candidature</span>
                <lucide-icon *ngIf="candLoading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
              </button>
            </div>
          </form>
        </div>

        <!-- Card 2: Formulaire Publication Campagne -->
        <div [class.hidden]="activeMobileTab === 'cand'"
             class="lg:block glass-card rounded-2xl p-4 md:p-5 flex flex-col h-full uasz-card-hover group border border-slate-200/80 shadow-sm relative overflow-hidden transition-all">
          
          <!-- Hover side border indicator -->
          <div [class]="canPublish(selectedCandidature) ? 'bg-[#047857]' : 'bg-slate-300'" class="absolute left-0 top-0 bottom-0 w-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

          <div class="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100 pl-1.5">
            <div class="flex items-center space-x-2.5">
              <div [class]="canPublish(selectedCandidature) ? 'bg-emerald-50 text-[#047857]' : 'bg-slate-100 text-slate-400'"
                   class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                <lucide-icon [name]="canPublish(selectedCandidature) ? 'video' : 'lock'" class="w-3.5 h-3.5"></lucide-icon>
              </div>
              <h2 class="text-sm md:text-base font-black text-slate-900 tracking-tight">2. Publier un Contenu</h2>
            </div>

            <!-- Status Badges -->
            <span *ngIf="!selectedCandidature" class="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center space-x-1 shrink-0">
              <lucide-icon name="info" class="w-3 h-3 text-slate-500 shrink-0"></lucide-icon>
              <span>Aucun dossier choisi</span>
            </span>

            <span *ngIf="selectedCandidature && selectedCandidature.statut === 'PENDING'" class="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 shrink-0">
              <lucide-icon name="clock" class="w-3 h-3 text-amber-600 shrink-0"></lucide-icon>
              <span>En attente de validation</span>
            </span>

            <span *ngIf="selectedCandidature && selectedCandidature.statut === 'REJECTED'" class="text-[9px] font-black px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 flex items-center space-x-1 shrink-0">
              <lucide-icon name="x-circle" class="w-3 h-3 text-red-600 shrink-0"></lucide-icon>
              <span>Dossier Rejeté</span>
            </span>

            <span *ngIf="selectedCandidature && selectedCandidature.statut === 'APPROVED' && hasAlreadyPublished(selectedCandidature)" class="text-[9px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1 shrink-0">
              <lucide-icon name="check-circle-2" class="w-3 h-3 text-blue-600 shrink-0"></lucide-icon>
              <span>Publication déjà effectuée</span>
            </span>

            <span *ngIf="canPublish(selectedCandidature)" class="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-[#047857] border border-emerald-200/70 flex items-center space-x-1 shrink-0">
              <lucide-icon name="check-circle-2" class="w-3 h-3 text-[#047857] shrink-0"></lucide-icon>
              <span>Prêt à publier</span>
            </span>
          </div>

          <!-- Selection dropdown -->
          <div class="mb-3 pl-1.5">
            <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Sélectionner votre Candidature / Scrutin *</label>
            <select [(ngModel)]="newPost.candidatureId" name="candidatureIdSelect"
                    class="uasz-input !py-1.5 !px-2.5 text-xs font-bold">
              <option [ngValue]="null">-- Choisir dans vos candidatures déposées --</option>
              <option *ngFor="let c of myCandidatures" [value]="c.id">
                Dossier {{ c.id }} — {{ getElectionTitle(c.electionId) }} [{{ c.statut === 'APPROVED' ? (hasAlreadyPublished(c) ? 'Déjà publié' : 'Approuvée') : c.statut === 'PENDING' ? 'En attente' : 'Rejetée' }}]
              </option>
            </select>
          </div>

          <!-- Status Banners -->
          <div *ngIf="!selectedCandidature" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium flex items-start space-x-2 mb-3 ml-1.5">
            <lucide-icon name="info" class="w-4 h-4 text-slate-500 shrink-0 mt-0.5"></lucide-icon>
            <span>Sélectionnez ci-dessus une candidature approuvée pour publier votre contenu de campagne.</span>
          </div>

          <div *ngIf="selectedCandidature && selectedCandidature.statut === 'PENDING'" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-start space-x-2 mb-3 ml-1.5">
            <lucide-icon name="clock" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></lucide-icon>
            <span>Votre dossier est en cours d'examen par la Commission Électorale. La publication sera déverrouillée dès validation de votre dossier.</span>
          </div>

          <div *ngIf="selectedCandidature && selectedCandidature.statut === 'REJECTED'" class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] font-medium flex items-start space-x-2 mb-3 ml-1.5">
            <lucide-icon name="x-circle" class="w-4 h-4 text-red-600 shrink-0 mt-0.5"></lucide-icon>
            <span>Votre candidature a été rejetée. Motif : <b>{{ selectedCandidature.motifRejet || 'Non précisé' }}</b>.</span>
          </div>

          <div *ngIf="selectedCandidature && selectedCandidature.statut === 'APPROVED' && hasAlreadyPublished(selectedCandidature)" class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium flex items-start space-x-2 mb-3 ml-1.5">
            <lucide-icon name="check-circle-2" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5"></lucide-icon>
            <span>Vous avez déjà effectué votre publication officielle de campagne pour ce scrutin. <b>Une seule publication est autorisée par scrutin.</b></span>
          </div>

          <form (ngSubmit)="publishPost()" class="space-y-3 flex-1 flex flex-col pl-1.5" [class.pointer-events-none]="!canPublish(selectedCandidature)">
            <div>
              <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Titre Publication *</label>
              <input type="text" [(ngModel)]="newPost.titre" name="titre" required placeholder="ex: Mon Programme pour l'UFR" [disabled]="!canPublish(selectedCandidature)"
                     class="uasz-input !py-1.5 !px-2.5 text-xs font-bold disabled:bg-slate-100 disabled:text-slate-400"/>
            </div>

            <div>
              <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Contenu / Message *</label>
              <textarea [(ngModel)]="newPost.contenu" name="contenu" rows="2" required placeholder="Présentation de votre projet..." [disabled]="!canPublish(selectedCandidature)"
                        class="uasz-input !py-1.5 !px-2.5 text-xs resize-none disabled:bg-slate-100 disabled:text-slate-400"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">URL Affiche (Image)</label>
                <input type="text" [(ngModel)]="newPost.imageUrl" name="imageUrl" placeholder="https://..." [disabled]="!canPublish(selectedCandidature)"
                       class="uasz-input !py-1.5 !px-2.5 text-xs disabled:bg-slate-100 disabled:text-slate-400"/>
              </div>

              <div>
                <label class="block text-[9px] font-black text-[#047857] uppercase tracking-wider mb-1">URL Vidéo (YouTube)</label>
                <input type="text" [(ngModel)]="newPost.videoEmbedUrl" name="videoEmbedUrl" placeholder="https://youtube.com/..." [disabled]="!canPublish(selectedCandidature)"
                       class="uasz-input !py-1.5 !px-2.5 text-xs bg-emerald-50/40 disabled:bg-slate-100 disabled:text-slate-400"/>
              </div>
            </div>

            <div class="mt-auto pt-3">
              <button type="submit" [disabled]="!canPublish(selectedCandidature) || postLoading"
                      class="uasz-btn-primary w-full py-2 text-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                <span *ngIf="!postLoading">Publier le Contenu</span>
                <lucide-icon *ngIf="postLoading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  `
})
export class CandidateDashboardComponent implements OnInit {
  allElections: Election[] = [];
  openElections: Election[] = [];
  myCandidatures: Candidature[] = [];
  candLoading = false;
  postLoading = false;
  activeMobileTab: 'cand' | 'post' = 'cand';

  newCand: any = {
    electionId: null,
    photoUrl: '',
    programmePdf: '',
    cvUrl: ''
  };

  newPost: any = {
    candidatureId: null,
    titre: '',
    contenu: '',
    imageUrl: '',
    videoEmbedUrl: ''
  };

  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.electionService.getElections().subscribe({
      next: (data: Election[]) => {
        this.allElections = data;
        this.openElections = data.filter(e => e.statut === 'CONFIGURATION' || e.statut === 'CAMPAGNE');
      },
      error: () => this.notificationService.showError("Erreur lors du chargement des scrutins.")
    });

    this.electionService.getMyCandidatures().subscribe({
      next: (cands: Candidature[]) => {
        this.myCandidatures = cands;
        // Auto-select approved candidature without post if available, else first
        if (!this.newPost.candidatureId && cands.length > 0) {
          const readyCand = cands.find(c => c.statut === 'APPROVED' && (!c.posts || c.posts.length === 0));
          this.newPost.candidatureId = readyCand ? readyCand.id : cands[0].id;
        }
      },
      error: () => {}
    });
  }

  get selectedCandidature(): Candidature | undefined {
    return this.myCandidatures.find(c => c.id == this.newPost.candidatureId);
  }

  hasAlreadyPublished(c: Candidature | undefined): boolean {
    return !!(c && c.posts && c.posts.length > 0);
  }

  canPublish(c: Candidature | undefined): boolean {
    return !!(c && c.statut === 'APPROVED' && !this.hasAlreadyPublished(c));
  }

  hasAppliedToElection(electionId?: number): boolean {
    if (!electionId) return false;
    return this.myCandidatures.some(c => c.electionId === electionId);
  }

  getElectionTitle(electionId?: number): string {
    if (!electionId) return '';
    const e = this.allElections.find(x => x.id === electionId) || this.openElections.find(x => x.id === electionId);
    return e ? e.titre : (electionId ? `Scrutin ${electionId}` : '');
  }

  submitCandidature(): void {
    if (!this.newCand.electionId) return;
    this.candLoading = true;

    this.electionService.submitCandidature(
      this.newCand.electionId,
      this.newCand.photoUrl,
      this.newCand.programmePdf,
      this.newCand.cvUrl
    ).subscribe({
      next: (res: Candidature) => {
        this.candLoading = false;
        this.notificationService.showSuccess(`Candidature soumise avec succès ! Numéro de dossier : ${res.id}`);
        this.newCand = { electionId: null, photoUrl: '', programmePdf: '', cvUrl: '' };
        this.loadData();
      },
      error: (err: any) => {
        this.candLoading = false;
        this.notificationService.showError("Erreur de soumission : " + (err.error?.message || err.message));
      }
    });
  }

  publishPost(): void {
    if (!this.newPost.candidatureId || !this.newPost.titre || !this.newPost.contenu) return;
    this.postLoading = true;

    this.electionService.addCampaignPost(
      this.newPost.candidatureId,
      this.newPost.titre,
      this.newPost.contenu,
      this.newPost.imageUrl,
      this.newPost.videoEmbedUrl
    ).subscribe({
      next: () => {
        this.postLoading = false;
        this.notificationService.showSuccess("Publication de campagne ajoutée avec succès !");
        this.newPost = { candidatureId: null, titre: '', contenu: '', imageUrl: '', videoEmbedUrl: '' };
        this.loadData();
      },
      error: (err: any) => {
        this.postLoading = false;
        this.notificationService.showError("Erreur lors de la publication : " + (err.error?.message || err.message));
      }
    });
  }
}
