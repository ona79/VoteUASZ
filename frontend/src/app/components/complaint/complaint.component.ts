import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ComplaintService } from '../../services/complaint.service';
import { ElectionService } from '../../services/election.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Election } from '../../models/vote.models';
import { ComplaintResponse } from '../../services/complaint.service';

@Component({
  selector: 'app-complaint',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <!-- Hero Header (mobile banner / desktop rounded card) -->
    <div class="uasz-header-mobile md:mx-auto md:max-w-4xl md:mt-6 relative overflow-hidden mb-6">
      <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 md:p-8">
        <div class="flex items-start gap-4 w-full">

          <!-- Bouton Retour (mobile uniquement) -->
          <button (click)="goBack()"
                  class="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all shrink-0 mt-0.5"
                  aria-label="Retour">
            <lucide-icon name="arrow-left" class="w-4 h-4 text-white"></lucide-icon>
          </button>

          <div>
            <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-100 text-[11px] font-bold mb-3 border border-white/20">
              <lucide-icon name="alert-triangle" class="w-3.5 h-3.5 text-emerald-100 shrink-0"></lucide-icon>
              <span>Procédure de contestation</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-white">Soumettre une Réclamation</h1>
            <p class="text-xs md:text-sm text-emerald-100 max-w-xl font-medium leading-relaxed">
              Si vous constatez une irrégularité électorale, décrivez-la ici. Votre dossier sera traité par la Commission Électorale dans les délais légaux.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

        <!-- Formulaire (colonne principale) -->
        <div class="md:col-span-2">
          <div class="glass-panel rounded-2xl p-6">
            <h2 class="text-base font-black text-slate-900 flex items-center space-x-2 mb-6 tracking-tight">
              <lucide-icon name="file-text" class="w-5 h-5 text-[#047857] shrink-0"></lucide-icon>
              <span>Formulaire de Réclamation</span>
            </h2>

            <form (ngSubmit)="submitComplaint()" #complaintForm="ngForm" class="space-y-5">

              <!-- Élection concernée -->
              <div>
                <label for="electionId" class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Élection concernée <span class="text-red-500">*</span>
                </label>
                <select id="electionId"
                        name="electionId"
                        [(ngModel)]="form.electionId"
                        required
                        class="uasz-input"
                        [disabled]="loadingElections">
                  <option [ngValue]="0" disabled>
                    {{ loadingElections ? 'Chargement...' : '-- Sélectionnez une élection --' }}
                  </option>
                  <option *ngFor="let e of elections" [ngValue]="e.id">{{ e.titre }}</option>
                </select>
              </div>

              <!-- Sujet -->
              <div>
                <label for="sujet" class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Sujet de la réclamation <span class="text-red-500">*</span>
                </label>
                <input id="sujet"
                       type="text"
                       name="sujet"
                       [(ngModel)]="form.sujet"
                       required
                       minlength="5"
                       maxlength="120"
                       placeholder="Ex : Anomalie lors du dépouillement"
                       class="uasz-input" />
                <p class="text-[10px] text-slate-400 mt-1 text-right">{{ form.sujet.length }}/120</p>
              </div>

              <!-- Description -->
              <div>
                <label for="description" class="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Description détaillée <span class="text-red-500">*</span>
                </label>
                <textarea id="description"
                          name="description"
                          [(ngModel)]="form.description"
                          required
                          minlength="20"
                          maxlength="2000"
                          rows="6"
                          placeholder="Décrivez précisément la situation constatée : date, heure, personnes impliquées, preuves disponibles..."
                          class="uasz-input resize-none leading-relaxed"></textarea>
                <p class="text-[10px] text-slate-400 mt-1 text-right">{{ form.description.length }}/2000</p>
              </div>

              <!-- Submit -->
              <button type="submit"
                      [disabled]="submitting || !complaintForm.valid || form.electionId === 0"
                      class="uasz-btn-primary w-full">
                <lucide-icon *ngIf="submitting" name="loader-2" class="w-4 h-4 animate-spin shrink-0"></lucide-icon>
                <lucide-icon *ngIf="!submitting" name="send" class="w-4 h-4 shrink-0"></lucide-icon>
                <span>{{ submitting ? 'Envoi en cours...' : 'Soumettre la réclamation' }}</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Sidebar info + Mes réclamations -->
        <div class="space-y-5">

          <!-- Infos procédure -->
          <div class="glass-card rounded-2xl p-5">
            <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <lucide-icon name="info" class="w-4 h-4 text-[#047857] shrink-0"></lucide-icon>
              <span>À savoir</span>
            </h3>
            <ul class="space-y-3 text-[11px] text-slate-600 font-medium leading-relaxed">
              <li class="flex items-start space-x-2">
                <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#047857] mt-0.5 shrink-0"></lucide-icon>
                <span>Votre réclamation est transmise à la Commission Électorale.</span>
              </li>
              <li class="flex items-start space-x-2">
                <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#047857] mt-0.5 shrink-0"></lucide-icon>
                <span>Délai légal de traitement : <strong>48h ouvrées</strong> après réception.</span>
              </li>
              <li class="flex items-start space-x-2">
                <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#047857] mt-0.5 shrink-0"></lucide-icon>
                <span>Soyez précis et factuel — joignez toute preuve disponible dans la description.</span>
              </li>
              <li class="flex items-start space-x-2">
                <lucide-icon name="alert-triangle" class="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0"></lucide-icon>
                <span>Une réclamation abusive ou de mauvaise foi peut entraîner des sanctions.</span>
              </li>
            </ul>
          </div>

          <!-- Mes réclamations précédentes -->
          <div class="glass-card rounded-2xl p-5">
            <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <lucide-icon name="inbox" class="w-4 h-4 text-[#047857] shrink-0"></lucide-icon>
              <span>Mes réclamations</span>
            </h3>

            <div *ngIf="loadingHistory" class="py-4 text-center">
              <lucide-icon name="loader-2" class="w-5 h-5 animate-spin text-[#047857] mx-auto"></lucide-icon>
            </div>

            <div *ngIf="!loadingHistory && myComplaints.length === 0" class="text-[11px] text-slate-400 text-center py-4 font-medium">
              Aucune réclamation soumise.
            </div>

            <div *ngIf="!loadingHistory && myComplaints.length > 0" class="space-y-3">
              <div *ngFor="let c of myComplaints"
                   class="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <p class="text-[11px] font-bold text-slate-800 line-clamp-1">{{ c.sujet }}</p>
                  <span [class]="getStatusClass(c.statut)"
                        class="text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider shrink-0">
                    {{ getStatusLabel(c.statut) }}
                  </span>
                </div>
                <p class="text-[10px] text-slate-400 font-medium">{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class ComplaintComponent implements OnInit {
  form = { electionId: 0, sujet: '', description: '' };
  elections: Election[] = [];
  myComplaints: ComplaintResponse[] = [];
  submitting = false;
  loadingElections = true;
  loadingHistory = true;

  private complaintService = inject(ComplaintService);
  private electionService = inject(ElectionService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  authService = inject(AuthService);

  ngOnInit(): void {
    this.loadElections();
    this.loadMyComplaints();
  }

  loadElections(): void {
    this.loadingElections = true;
    this.electionService.getElections().subscribe({
      next: (data) => {
        this.elections = data;
        this.loadingElections = false;
      },
      error: () => {
        this.loadingElections = false;
        this.notificationService.showError('Impossible de charger la liste des élections.');
      }
    });
  }

  loadMyComplaints(): void {
    this.loadingHistory = true;
    this.complaintService.getMyComplaints().subscribe({
      next: (data) => {
        this.myComplaints = data;
        this.loadingHistory = false;
      },
      error: () => {
        this.loadingHistory = false;
      }
    });
  }

  submitComplaint(): void {
    if (this.form.electionId === 0 || !this.form.sujet.trim() || !this.form.description.trim()) {
      this.notificationService.showWarning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.submitting = true;
    this.complaintService.submitComplaint({
      electionId: this.form.electionId,
      sujet: this.form.sujet.trim(),
      description: this.form.description.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.notificationService.showSuccess(
          'Votre réclamation a été transmise à la Commission Électorale.',
          'Réclamation enregistrée'
        );
        this.form = { electionId: 0, sujet: '', description: '' };
        this.loadMyComplaints();
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message || 'Une erreur est survenue lors de la soumission.';
        this.notificationService.showError(msg, 'Échec de l\'envoi');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/elections']);
  }

  getStatusLabel(statut: string): string {
    switch (statut) {
      case 'PENDING': return 'En attente';
      case 'UNDER_REVIEW': return 'En cours';
      case 'RESOLVED': return 'Résolue';
      case 'REJECTED': return 'Rejetée';
      default: return statut;
    }
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'UNDER_REVIEW': return 'bg-blue-50 text-[#1d4ed8] border-blue-200';
      case 'RESOLVED': return 'bg-emerald-50 text-[#047857] border-emerald-200';
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }
}
