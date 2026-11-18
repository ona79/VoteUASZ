import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { Election, Candidature } from '../../models/vote.models';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

interface InlineFeedback {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-candidate-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent
  ],
  template: `
    <!-- Barre du haut fine (~48px) -->
    <app-page-header title="Espace candidat"></app-page-header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        <!-- Carte 1 : Dossier de candidature -->
        <section class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div class="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
            <lucide-icon name="file-edit" class="w-4 h-4 text-[#047857] shrink-0"></lucide-icon>
            <h2 class="text-sm font-black text-slate-900">1. Dossier de candidature</h2>
          </div>

          <form (ngSubmit)="submitCandidature()" class="space-y-3">
            <div>
              <label for="cand-election" class="block text-[11px] font-semibold text-slate-700 mb-1">
                Scrutin électoral *
              </label>
              <select id="cand-election" [(ngModel)]="newCand.electionId" name="electionId" required
                      class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#047857]">
                <option [ngValue]="null" disabled selected>Sélectionner une élection</option>
                <option *ngFor="let e of openElections" [ngValue]="e.id" [disabled]="hasAppliedToElection(e.id)">
                  {{ e.titre }} ({{ e.type }}) {{ hasAppliedToElection(e.id) ? '— [Déjà postulé]' : '' }}
                </option>
              </select>
            </div>

            <div>
              <label for="cand-photo" class="block text-[11px] font-semibold text-slate-700 mb-1">
                URL photo officielle
              </label>
              <input id="cand-photo" type="text" [(ngModel)]="newCand.photoUrl" name="photoUrl" placeholder="https://..."
                     class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857]"/>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label for="cand-programme" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  URL programme PDF
                </label>
                <input id="cand-programme" type="text" [(ngModel)]="newCand.programmePdf" name="programmePdf" placeholder="https://..."
                       class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857]"/>
              </div>
              <div>
                <label for="cand-cv" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  URL CV PDF
                </label>
                <input id="cand-cv" type="text" [(ngModel)]="newCand.cvUrl" name="cvUrl" placeholder="https://..."
                       class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857]"/>
              </div>
            </div>

            <!-- Alerte compacte au-dessus du bouton -->
            <div *ngIf="candFeedback"
                 [class]="candFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-[#047857]' : 'bg-red-50 border-red-200 text-[#dc2626]'"
                 class="px-3 py-2 rounded-lg border text-xs font-medium flex items-center space-x-2">
              <lucide-icon [name]="candFeedback.type === 'success' ? 'check-circle-2' : 'alert-triangle'" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
              <span>{{ candFeedback.text }}</span>
            </div>

            <button type="submit"
                    [disabled]="candLoading || !newCand.electionId || hasAppliedToElection(newCand.electionId)"
                    class="w-full h-9 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:bg-emerald-100 disabled:text-emerald-700 disabled:cursor-not-allowed">
              <span *ngIf="!candLoading">Soumettre ma candidature</span>
              <lucide-icon *ngIf="candLoading" name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            </button>
          </form>
        </section>

        <!-- Carte 2 : Publier un contenu -->
        <section class="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
            <div class="flex items-center space-x-2">
              <lucide-icon [name]="canPublish(selectedCandidature) ? 'video' : 'lock'"
                           [class]="canPublish(selectedCandidature) ? 'text-[#047857]' : 'text-slate-400'"
                           class="w-4 h-4 shrink-0"></lucide-icon>
              <h2 class="text-sm font-black text-slate-900">2. Publier un contenu</h2>
            </div>

            <!-- Badges compacts -->
            <span *ngIf="!selectedCandidature"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Aucun dossier choisi
            </span>
            <span *ngIf="selectedCandidature && isElectionClosedForCandidature(selectedCandidature)"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-[#dc2626] border border-red-200">
              Scrutin clôturé
            </span>
            <span *ngIf="selectedCandidature && !isElectionClosedForCandidature(selectedCandidature) && selectedCandidature.statut === 'PENDING'"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              En attente
            </span>
            <span *ngIf="selectedCandidature && !isElectionClosedForCandidature(selectedCandidature) && selectedCandidature.statut === 'REJECTED'"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-[#dc2626] border border-red-200">
              Dossier rejeté
            </span>
            <span *ngIf="selectedCandidature && canPublish(selectedCandidature) && hasAlreadyPublished(selectedCandidature)"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
              Prêt pour mise à jour
            </span>
            <span *ngIf="selectedCandidature && canPublish(selectedCandidature) && !hasAlreadyPublished(selectedCandidature)"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#047857] border border-emerald-200">
              Prêt à publier
            </span>
          </div>

          <!-- Sélecteur de scrutin / dossier -->
          <div class="mb-3" *ngIf="myCandidatures.length > 0">
            <label for="post-candidature" class="block text-[11px] font-semibold text-slate-700 mb-1">
              Dossier de candidature
            </label>
            <select id="post-candidature" [(ngModel)]="newPost.candidatureId" (ngModelChange)="onCandidatureIdChange($event)" name="candidatureIdSelect"
                    class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#047857]">
              <option [ngValue]="null">-- Choisir dans vos candidatures --</option>
              <option *ngFor="let c of myCandidatures" [ngValue]="c.id">
                {{ c.id }} — {{ c.electionTitre || getElectionTitle(c.electionId) }} [{{ isElectionClosedForCandidature(c) ? 'Scrutin Clôturé — Verrouillé' : (c.statut === 'APPROVED' ? (hasAlreadyPublished(c) ? 'Validée • Publié (Modifiable)' : 'Validée • Prêt à publier') : c.statut === 'PENDING' ? 'En attente' : 'Rejetée') }}]
              </option>
            </select>
          </div>

          <!-- Lignes d'info fines -->
          <p *ngIf="!selectedCandidature" class="text-[11px] text-slate-500 flex items-center space-x-1.5 mb-3">
            <lucide-icon name="info" class="w-3.5 h-3.5 text-slate-400 shrink-0"></lucide-icon>
            <span>Sélectionnez ci-dessus une candidature approuvée pour publier ou modifier votre contenu de campagne.</span>
          </p>

          <p *ngIf="selectedCandidature && isElectionClosedForCandidature(selectedCandidature)" class="text-[11px] text-[#dc2626] flex items-start space-x-1.5 mb-3">
            <lucide-icon name="lock" class="w-3.5 h-3.5 shrink-0 mt-0.5"></lucide-icon>
            <span>Le vote pour cette élection est terminé : il n'est plus permis de modifier ou de publier du contenu après la fin du scrutin.</span>
          </p>

          <p *ngIf="selectedCandidature && !isElectionClosedForCandidature(selectedCandidature) && selectedCandidature.statut === 'PENDING'" class="text-[11px] text-amber-700 flex items-start space-x-1.5 mb-3">
            <lucide-icon name="info" class="w-3.5 h-3.5 shrink-0 mt-0.5"></lucide-icon>
            <span>Votre dossier est en cours d'examen par la Commission Électorale. La publication sera déverrouillée dès validation.</span>
          </p>

          <p *ngIf="selectedCandidature && !isElectionClosedForCandidature(selectedCandidature) && selectedCandidature.statut === 'REJECTED'" class="text-[11px] text-[#dc2626] flex items-start space-x-1.5 mb-3">
            <lucide-icon name="alert-triangle" class="w-3.5 h-3.5 shrink-0 mt-0.5"></lucide-icon>
            <span>Votre candidature a été rejetée. Motif : <b>{{ selectedCandidature.motifRejet || 'Non précisé' }}</b>.</span>
          </p>

          <p *ngIf="selectedCandidature && !isElectionClosedForCandidature(selectedCandidature) && selectedCandidature.statut === 'APPROVED' && hasAlreadyPublished(selectedCandidature)"
             class="text-[11px] text-[#047857] flex items-start space-x-1.5 mb-3">
            <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 shrink-0 mt-0.5"></lucide-icon>
            <span>Vous avez déjà une publication officielle active. En cours de campagne ou de vote, vous pouvez modifier les informations ci-dessous et cliquer sur <b>Mettre à jour</b>.</span>
          </p>

          <form (ngSubmit)="publishPost()" class="space-y-3">
            <div>
              <label for="post-titre" class="block text-[11px] font-semibold text-slate-700 mb-1">
                Titre publication *
              </label>
              <input id="post-titre" type="text" [(ngModel)]="newPost.titre" name="titre" required placeholder="ex: Mon Programme pour l'UFR" [disabled]="!canPublish(selectedCandidature)"
                     class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"/>
            </div>

            <div>
              <label for="post-contenu" class="block text-[11px] font-semibold text-slate-700 mb-1">
                Contenu / Message *
              </label>
              <textarea id="post-contenu" [(ngModel)]="newPost.contenu" name="contenu" rows="3" required placeholder="Présentation de votre projet..." [disabled]="!canPublish(selectedCandidature)"
                        class="w-full px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 resize-none focus:outline-none focus:border-[#047857] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"></textarea>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label for="post-image" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  URL affiche (image)
                </label>
                <input id="post-image" type="text" [(ngModel)]="newPost.imageUrl" name="imageUrl" placeholder="https://..." [disabled]="!canPublish(selectedCandidature)"
                       class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"/>
              </div>

              <div>
                <label for="post-video" class="block text-[11px] font-semibold text-slate-700 mb-1">
                  URL vidéo YouTube
                </label>
                <input id="post-video" type="text" [(ngModel)]="newPost.videoEmbedUrl" name="videoEmbedUrl" placeholder="https://youtube.com/..." [disabled]="!canPublish(selectedCandidature)"
                       class="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#047857] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"/>
              </div>
            </div>

            <!-- Alerte compacte au-dessus du bouton -->
            <div *ngIf="postFeedback"
                 [class]="postFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-[#047857]' : 'bg-red-50 border-red-200 text-[#dc2626]'"
                 class="px-3 py-2 rounded-lg border text-xs font-medium flex items-center space-x-2">
              <lucide-icon [name]="postFeedback.type === 'success' ? 'check-circle-2' : 'alert-triangle'" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
              <span>{{ postFeedback.text }}</span>
            </div>

            <button type="submit" [disabled]="!canPublish(selectedCandidature) || postLoading"
                    class="w-full h-9 rounded-lg bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 disabled:bg-emerald-100 disabled:text-emerald-700 disabled:cursor-not-allowed">
              <span *ngIf="!postLoading && selectedCandidature && isElectionClosedForCandidature(selectedCandidature)">Vote terminé — Modification impossible</span>
              <span *ngIf="!postLoading && (!selectedCandidature || !isElectionClosedForCandidature(selectedCandidature))">{{ hasAlreadyPublished(selectedCandidature) ? 'Mettre à jour la publication' : 'Publier le contenu' }}</span>
              <lucide-icon *ngIf="postLoading" name="loader-2" class="w-4 h-4 animate-spin"></lucide-icon>
            </button>
          </form>
        </section>

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

  candFeedback: InlineFeedback | null = null;
  postFeedback: InlineFeedback | null = null;

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
      error: () => this.notificationService.showError('Erreur lors du chargement des scrutins.')
    });

    this.electionService.getMyCandidatures().subscribe({
      next: (cands: Candidature[]) => {
        this.myCandidatures = cands;
        if (!this.newPost.candidatureId && cands.length > 0) {
          const readyCand = cands.find(c => c.statut === 'APPROVED' && !this.isElectionClosedForCandidature(c));
          const target = readyCand || cands[0];
          this.selectCandidature(target);
        }
      },
      error: () => {}
    });
  }

  getElection(electionId?: number): Election | undefined {
    if (!electionId) {
      return undefined;
    }
    return this.allElections.find(e => e.id === electionId);
  }

  isElectionClosedForCandidature(c: Candidature | undefined): boolean {
    if (!c) {
      return false;
    }
    const statut = c.electionStatut || this.getElection(c.electionId)?.statut;
    if (statut === 'CLOTURE' || statut === 'DEPOUILLEMENT' || statut === 'PUBLICATION') {
      return true;
    }
    const election = this.getElection(c.electionId);
    if (election && election.dateFin && new Date(election.dateFin).getTime() < Date.now()) {
      return true;
    }
    return false;
  }

  selectCandidature(c: Candidature): void {
    this.newPost.candidatureId = c.id;
    if (c.posts && c.posts.length > 0) {
      const p = c.posts[0];
      this.newPost.titre = p.titre || '';
      this.newPost.contenu = p.contenu || '';
      this.newPost.imageUrl = p.afficheUrl || '';
      this.newPost.videoEmbedUrl = p.videoEmbedUrl || '';
    } else {
      this.newPost.titre = '';
      this.newPost.contenu = '';
      this.newPost.imageUrl = '';
      this.newPost.videoEmbedUrl = '';
    }
  }

  onCandidatureIdChange(id: number | null): void {
    this.postFeedback = null;
    if (!id) {
      this.newPost.titre = '';
      this.newPost.contenu = '';
      this.newPost.imageUrl = '';
      this.newPost.videoEmbedUrl = '';
      return;
    }
    const cand = this.myCandidatures.find(c => c.id === id);
    if (cand) {
      this.selectCandidature(cand);
    }
  }

  get selectedCandidature(): Candidature | undefined {
    return this.myCandidatures.find(c => c.id == this.newPost.candidatureId);
  }

  hasAlreadyPublished(c: Candidature | undefined): boolean {
    return !!(c && c.posts && c.posts.length > 0);
  }

  canPublish(c: Candidature | undefined): boolean {
    return !!(c && c.statut === 'APPROVED' && !this.isElectionClosedForCandidature(c));
  }

  hasAppliedToElection(electionId?: number): boolean {
    if (!electionId) {
      return false;
    }
    return this.myCandidatures.some(c => c.electionId === electionId);
  }

  getElectionTitle(electionId?: number): string {
    if (!electionId) {
      return '';
    }
    const e = this.allElections.find(x => x.id === electionId) || this.openElections.find(x => x.id === electionId);
    return e ? e.titre : (electionId ? `Scrutin ${electionId}` : '');
  }

  submitCandidature(): void {
    if (!this.newCand.electionId) {
      return;
    }
    this.candLoading = true;
    this.candFeedback = null;

    this.electionService.submitCandidature(
      this.newCand.electionId,
      this.newCand.photoUrl,
      this.newCand.programmePdf,
      this.newCand.cvUrl
    ).subscribe({
      next: (res: Candidature) => {
        this.candLoading = false;
        const msg = `Candidature soumise avec succès ! Numéro de dossier : ${res.id}`;
        this.candFeedback = { type: 'success', text: msg };
        this.notificationService.showSuccess(msg);
        this.newCand = { electionId: null, photoUrl: '', programmePdf: '', cvUrl: '' };
        this.loadData();
      },
      error: (err: any) => {
        this.candLoading = false;
        const msg = 'Erreur de soumission : ' + (err.error?.message || err.message);
        this.candFeedback = { type: 'error', text: msg };
        this.notificationService.showError(msg);
      }
    });
  }

  publishPost(): void {
    if (!this.newPost.candidatureId || !this.newPost.titre || !this.newPost.contenu) {
      return;
    }
    this.postLoading = true;
    this.postFeedback = null;

    this.electionService.addCampaignPost(
      this.newPost.candidatureId,
      this.newPost.titre,
      this.newPost.contenu,
      this.newPost.imageUrl,
      this.newPost.videoEmbedUrl
    ).subscribe({
      next: () => {
        this.postLoading = false;
        const msg = 'Publication de campagne enregistrée avec succès !';
        this.postFeedback = { type: 'success', text: msg };
        this.notificationService.showSuccess(msg);
        this.loadData();
      },
      error: (err: any) => {
        this.postLoading = false;
        const msg = 'Erreur lors de la publication : ' + (err.error?.message || err.message);
        this.postFeedback = { type: 'error', text: msg };
        this.notificationService.showError(msg);
      }
    });
  }
}
