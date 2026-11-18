import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div class="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
        <div class="bg-[#065f46] text-white px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <lucide-icon name="lock" [size]="20" class="text-emerald-200"></lucide-icon>
            <div>
              <h1 class="text-base font-bold leading-tight">Changement de mot de passe obligatoire</h1>
              <p class="text-[11px] text-emerald-100/90">Sécurisez votre compte avant d'accéder à VoteUASZ</p>
            </div>
          </div>
          <button type="button" (click)="logout()"
                  class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition">
            Déconnexion
          </button>
        </div>

        <form (ngSubmit)="onSubmit()" class="p-6 space-y-3.5">
          <div>
            <label for="currentPassword" class="block text-xs font-semibold text-slate-700 mb-1">
              Mot de passe actuel
            </label>
            <input id="currentPassword" type="password" [(ngModel)]="currentPassword" name="currentPassword" required
                   placeholder="Mot de passe initial"
                   class="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20" />
          </div>

          <div>
            <label for="newPassword" class="block text-xs font-semibold text-slate-700 mb-1">
              Nouveau mot de passe (8 caractères minimum)
            </label>
            <input id="newPassword" type="password" [(ngModel)]="newPassword" name="newPassword" required
                   placeholder="Nouveau mot de passe"
                   class="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20" />
          </div>

          <div>
            <label for="confirmPassword" class="block text-xs font-semibold text-slate-700 mb-1">
              Confirmer le nouveau mot de passe
            </label>
            <input id="confirmPassword" type="password" [(ngModel)]="confirmPassword" name="confirmPassword" required
                   placeholder="Confirmation"
                   class="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20" />
          </div>

          <div *ngIf="errorMessage" class="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="loading"
                  class="w-full h-10 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-sm font-semibold transition disabled:opacity-60">
            {{ loading ? 'Enregistrement...' : 'Valider le nouveau mot de passe' }}
          </button>
        </form>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Tous les champs sont obligatoires.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.newPassword === this.currentPassword) {
      this.errorMessage = 'Le nouveau mot de passe doit être différent de l\'ancien.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'La confirmation ne correspond pas au nouveau mot de passe.';
      return;
    }

    this.loading = true;
    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('Votre mot de passe a été mis à jour.');
        const user = this.authService.currentUser();
        if (user?.role === 'SUPER_ADMIN') this.router.navigate(['/admin']);
        else if (user?.role === 'COMMISSION_ELECTORALE') this.router.navigate(['/commission']);
        else if (user?.role === 'CANDIDAT') this.router.navigate(['/candidat']);
        else this.router.navigate(['/elections']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Impossible de modifier le mot de passe.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
