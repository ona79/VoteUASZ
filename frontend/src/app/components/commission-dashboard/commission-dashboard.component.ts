import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ElectionService } from '../../services/election.service';
import { ComplaintService, ComplaintResponse } from '../../services/complaint.service';
import { NotificationService } from '../../services/notification.service';
import { Candidature, Election, ComplaintStatus } from '../../models/vote.models';
import { ElectionFilterComponent } from '../shared/election-filter/election-filter.component';

@Component({
  selector: 'app-commission-dashboard',
  standalone: true,
  imports: [
    CommonModule,
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
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white mb-2 leading-tight">Commission Électorale</h1>
        <p class="text-xs md:text-sm text-emerald-50 max-w-2xl font-medium leading-relaxed">
          Validation des candidatures, supervision du dépouillement et gestion des réclamations pour garantir la transparence des scrutins.
        </p>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

      <!-- Filtre + Sélecteur horizontal de scrutins -->
      <div class="mb-6">
        <label class="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sélectionner un Scrutin à Superviser</label>

        <!-- Barre de filtres Commission -->
        <app-election-filter
          [elections]="elections"
          [ufrList]="ufrList"
          [showUfrFilter]="true"
          (filtered)="onFiltered($event)"
        ></app-election-filter>

        <div class="overflow-x-auto pb-2 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div class="flex space-x-2 w-max">
            <button *ngFor="let e of filteredElections" 
                    (click)="onElectionSelect(e.id)"
                    [class]="selectedElectionId === e.id ? 'bg-[#047857] text-white border-[#047857] shadow-md scale-100' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 scale-95 opacity-80 hover:opacity-100 hover:scale-100'"
                    class="px-3.5 py-2 rounded-xl border font-bold text-xs transition-all duration-200 flex items-center space-x-2">
              <span>{{ e.titre }}</span>
              <span [class]="selectedElectionId === e.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'" 
                    class="text-[9px] px-2 py-0.5 rounded-md uppercase tracking-widest font-black">
                {{ e.statut }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Candidatures to Validate -->
      <div *ngIf="selectedElectionId" class="glass-card rounded-2xl p-4 md:p-5 animate-fade-in-up border border-slate-200/80 shadow-sm">
        <div class="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-[#047857] flex items-center justify-center shrink-0">
              <lucide-icon name="file-text" class="w-4 h-4 text-[#047857]"></lucide-icon>
            </div>
            <h2 class="text-base md:text-lg font-black text-slate-900 tracking-tight">Dossiers de Candidature</h2>
          </div>
          <span class="text-xs font-black text-[#047857] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">{{ candidatures.length }} Dossier(s)</span>
        </div>

        <div *ngIf="candidatures.length === 0" class="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <lucide-icon name="inbox" class="w-8 h-8 text-slate-400 mx-auto mb-2"></lucide-icon>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Aucune candidature soumise pour ce scrutin.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div *ngFor="let c of candidatures"
               class="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200/90 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group relative overflow-hidden">

            <!-- Hover side indicator -->
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#047857] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

            <div class="mb-3.5 pl-1.5">
              <div class="flex justify-between items-start mb-2.5">
                <div class="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  <img *ngIf="c.photoUrl" [src]="c.photoUrl" class="w-full h-full object-cover"/>
                  <lucide-icon *ngIf="!c.photoUrl" name="user" class="w-4 h-4 text-slate-400"></lucide-icon>
                </div>
                <span [class]="getStatusClass(c.statut)" class="text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border">
                  {{ c.statut }}
                </span>
              </div>
              
              <h3 class="font-black text-slate-900 text-sm md:text-base mb-1 leading-snug group-hover:text-[#047857] transition-colors truncate">
                {{ c.candidatNomComplet || (c.candidatPrenom ? (c.candidatPrenom + ' ' + (c.candidatNom || '')) : (c.nomListe || 'Candidat')) }}
              </h3>
              <p *ngIf="c.candidatMatricule" class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Matricule : <span class="text-[#1d4ed8]">{{ c.candidatMatricule }}</span>
              </p>
            </div>

            <!-- Documents -->
            <div class="flex space-x-2 mb-3.5 pl-1.5">
              <a *ngIf="c.programmePdf" [href]="c.programmePdf" target="_blank"
                 class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition-colors flex items-center space-x-1">
                 <lucide-icon name="file-text" class="w-3 h-3 shrink-0"></lucide-icon>
                 <span>Programme</span>
              </a>
              <a *ngIf="c.cvUrl" [href]="c.cvUrl" target="_blank"
                 class="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#1d4ed8]/10 text-[#1d4ed8] hover:bg-[#1d4ed8]/20 transition-colors flex items-center space-x-1">
                <lucide-icon name="file-check" class="w-3 h-3 shrink-0"></lucide-icon>
                <span>CV</span>
              </a>
            </div>

            <!-- Validation Actions -->
            <div class="flex space-x-2 pt-2.5 border-t border-slate-100 mt-auto pl-1.5">
              <button *ngIf="c.statut === 'PENDING'" (click)="updateStatus(c.id, 'APPROVED')"
                      class="flex-1 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-[10px] font-black shadow-sm transition-colors flex items-center justify-center space-x-1">
                <lucide-icon name="check" class="w-3 h-3 shrink-0"></lucide-icon>
                <span>Valider</span>
              </button>
              <button *ngIf="c.statut === 'PENDING'" (click)="rejectCandidacy(c.id)"
                      class="flex-1 py-1.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-[10px] font-black shadow-sm transition-colors flex items-center justify-center space-x-1">
                <lucide-icon name="x" class="w-3 h-3 shrink-0"></lucide-icon>
                <span>Rejeter</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      <!-- SECTION RÉCLAMATIONS DES ÉLECTEURS & CANDIDATS -->
      <div *ngIf="selectedElectionId" class="glass-card rounded-2xl p-4 md:p-5 mt-6 border border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/20 to-white">
        <div class="flex items-center justify-between mb-5 pb-3 border-b border-amber-100">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
              <lucide-icon name="alert-triangle" class="w-4 h-4"></lucide-icon>
            </div>
            <div>
              <h2 class="text-base md:text-lg font-black text-slate-900 tracking-tight">Réclamations & Contentieux Post-électoraux</h2>
              <p class="text-[11px] text-slate-500 font-medium">Recours déposés par les électeurs et candidats (délai légal 48h)</p>
            </div>
          </div>
          <span class="text-xs font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-xl border border-amber-300/60">{{ complaints.length }} Recours</span>
        </div>

        <div *ngIf="complaints.length === 0" class="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <lucide-icon name="inbox" class="w-8 h-8 text-slate-400 mx-auto mb-2"></lucide-icon>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Aucune réclamation enregistrée pour ce scrutin.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div *ngFor="let item of complaints" class="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-xs font-black text-slate-900 line-clamp-1">{{ item.sujet }}</span>
                <span [class]="getComplaintStatusClass(item.statut)" class="text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border shrink-0">
                  {{ item.statut }}
                </span>
              </div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                Déposé par : <span class="text-slate-800">{{ item.auteurNomComplet || 'Électeur' }}</span> • {{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
              <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed mb-3">
                {{ item.description }}
              </div>
              <div *ngIf="item.reponseCommission" class="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium mb-3">
                <strong class="font-bold text-[#047857] block mb-0.5">Décision de la Commission :</strong>
                {{ item.reponseCommission }}
              </div>
            </div>

            <!-- Actions de Résolution Commission -->
            <div *ngIf="item.statut === 'PENDING' || item.statut === 'UNDER_REVIEW'" class="flex space-x-2 pt-3 border-t border-slate-100">
              <button (click)="resolveComplaintAction(item.id, 'RESOLVED')"
                      class="flex-1 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-[10px] font-black shadow-sm transition flex items-center justify-center space-x-1">
                <lucide-icon name="check" class="w-3 h-3"></lucide-icon>
                <span>Accorder le Recours</span>
              </button>
              <button (click)="resolveComplaintAction(item.id, 'REJECTED')"
                      class="flex-1 py-1.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-[10px] font-black shadow-sm transition flex items-center justify-center space-x-1">
                <lucide-icon name="x" class="w-3 h-3"></lucide-icon>
                <span>Rejeter le Recours</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CommissionDashboardComponent implements OnInit {
  elections: Election[] = [];
  filteredElections: Election[] = [];
  ufrList: string[] = [];
  selectedElectionId: number | null = null;
  candidatures: Candidature[] = [];
  complaints: ComplaintResponse[] = [];

  private electionService = inject(ElectionService);
  private complaintService = inject(ComplaintService);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.filteredElections = data;
        this.ufrList = [...new Set(data.map(e => e.targetUfr).filter((u): u is string => !!u))];
        if (data.length > 0) {
          this.onElectionSelect(data[0].id);
        }
      },
      error: () => this.notificationService.showError('Impossible de charger les scrutins.')
    });
  }

  /** Guard : si l'élection sélectionnée n'est plus visible après filtrage, désélectionner */
  onFiltered(result: Election[]): void {
    this.filteredElections = result;
    if (this.selectedElectionId !== null) {
      const stillVisible = result.some(e => e.id === this.selectedElectionId);
      if (!stillVisible) {
        this.selectedElectionId = null;
        this.candidatures = [];
        this.complaints = [];
      }
    }
  }

  onElectionSelect(id: number): void {
    if (this.selectedElectionId === id) return;
    this.selectedElectionId = id;
    this.electionService.getCandidatures(id).subscribe({
      next: (data) => this.candidatures = data,
      error: () => this.notificationService.showError("Impossible de charger les dossiers de candidature.")
    });
    this.complaintService.getComplaintsByElection(id).subscribe({
      next: (data) => this.complaints = data,
      error: () => this.complaints = []
    });
  }

  updateStatus(candidatureId: number, status: 'APPROVED' | 'REJECTED', motif?: string): void {
    this.electionService.updateCandidacyStatus(candidatureId, status, motif).subscribe({
      next: () => {
        this.notificationService.showSuccess(status === 'APPROVED' ? 'Candidature validée avec succès.' : 'Candidature rejetée.');
        if (this.selectedElectionId) {
          this.electionService.getCandidatures(this.selectedElectionId).subscribe(d => this.candidatures = d);
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
      this.updateStatus(candidatureId, 'REJECTED', motif.trim());
    }
  }

  async resolveComplaintAction(complaintId: number, status: ComplaintStatus): Promise<void> {
    const isGranted = status === 'RESOLVED';
    const title = isGranted ? "Accorder le Recours" : "Rejeter le Recours";
    const label = isGranted ? "Saisissez les motifs et mesures correctives de la Commission :" : "Saisissez le motif de rejet du recours :";

    const reponse = await this.notificationService.prompt(
      title,
      label,
      "ex: Décision officielle de la commission électorale...",
      "Enregistrer la Décision"
    );

    if (reponse && reponse.trim()) {
      this.complaintService.resolveComplaint(complaintId, status, reponse.trim()).subscribe({
        next: () => {
          this.notificationService.showSuccess("Décision sur le recours enregistrée.");
          if (this.selectedElectionId) {
            this.complaintService.getComplaintsByElection(this.selectedElectionId).subscribe(data => this.complaints = data);
          }
        },
        error: (err) => this.notificationService.showError(err.error?.message || "Erreur lors de l'enregistrement de la décision.")
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-[#047857] border-[#047857]/20';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-[#dc2626]/20';
      default: return 'bg-amber-50 text-amber-600 border-amber-200';
    }
  }

  getComplaintStatusClass(status: string): string {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-50 text-[#047857] border-[#047857]/20';
      case 'REJECTED': return 'bg-red-50 text-[#dc2626] border-[#dc2626]/20';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  }
}
