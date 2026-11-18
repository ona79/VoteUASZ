import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  template: `
    <div class="min-h-[85vh] md:min-h-screen flex items-center justify-center bg-slate-50 relative p-4 md:p-6 lg:p-8">
      <div class="w-full max-w-4xl bg-white rounded-3xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row glass-card border-0">
        
        <!-- Brand Panel (Top Banner on Mobile, Left Side on Desktop) -->
        <div class="w-full md:w-5/12 bg-gradient-to-br from-[#047857] to-[#065f46] p-6 md:p-8 flex flex-col justify-between relative overflow-hidden text-white shrink-0 rounded-b-[28px] md:rounded-b-none md:rounded-l-[2rem]">
          <div class="absolute -top-32 -left-32 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-32 -right-32 w-64 h-64 bg-[#1d4ed8]/20 rounded-full blur-3xl"></div>
          
          <div class="relative z-10 text-center md:text-left flex flex-col items-center md:items-start mb-4 md:mb-0">
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-xl mb-4 md:mb-6 border border-white/20 overflow-hidden">
              <img src="assets/logo_vote_uasz.webp" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
            </div>
            <h2 class="text-2xl md:text-3xl font-black tracking-tight mb-1.5 md:mb-2">VoteUASZ</h2>
            <p class="text-emerald-100/90 text-xs font-medium leading-relaxed max-w-xs">Le portail de vote électronique sécurisé de l'Université Assane Seck de Ziguinchor.</p>
          </div>
          
          <div class="relative z-10 flex justify-center md:justify-start">
            <div class="inline-flex items-center space-x-2 text-[10px] font-bold text-emerald-100 bg-black/10 px-3 py-1.5 md:py-2 rounded-xl border border-white/10 backdrop-blur-sm shadow-inner">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              <span>Système crypté de bout en bout</span>
            </div>
          </div>
        </div>

        <!-- Right Side: Form -->
        <div class="w-full md:w-7/12 p-6 md:p-10 lg:p-12 relative flex flex-col justify-center bg-white">

          <div class="mb-6 text-center md:text-left">
            <h3 class="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-1.5">Connexion</h3>
            <p class="text-xs text-slate-500 font-medium">Accès réservé aux électeurs et administrateurs pré-provisionnés</p>
          </div>

          <!-- Alert Error (Format doux et fermable) -->
          <div *ngIf="errorMessage"
               [class]="isOfflineError ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-[#dc2626]'"
               class="mb-5 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in-up">
            <div class="flex items-center space-x-2.5">
              <lucide-icon [name]="isOfflineError ? 'info' : 'alert-triangle'" [class]="isOfflineError ? 'text-amber-600' : 'text-[#dc2626]'" class="w-4 h-4 shrink-0"></lucide-icon>
              <span>{{ errorMessage }}</span>
            </div>
            <button (click)="errorMessage = ''" type="button" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition ml-2 shrink-0">
              <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
            </button>
          </div>

          <!-- Login Form -->
          <form *ngIf="authMode === 'login'" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Matricule Universitaire</label>
              <input type="text" [(ngModel)]="matricule" name="matricule" required placeholder="ex: 20230001"
                     class="uasz-input"/>
            </div>

            <div class="mb-4">
              <div class="flex justify-between items-center mb-1.5 ml-0.5 mr-0.5">
                <label class="block text-xs font-bold text-slate-700">Mot de Passe</label>
                <a href="javascript:void(0)" (click)="openForgotPassword()" class="uasz-link-text">Mot de passe oublié ?</a>
              </div>
              <input type="password" [(ngModel)]="password" name="password" required placeholder="••••••••"
                     class="uasz-input"/>
            </div>

            <div class="pt-2">
              <button type="submit" [disabled]="loading"
                      class="uasz-btn-primary w-full py-2.5">
                <span *ngIf="!loading">Accéder au portail</span>
                <lucide-icon *ngIf="loading" name="loader-2" class="w-4.5 h-4.5 animate-spin mx-auto text-white"></lucide-icon>
              </button>
            </div>
          </form>

          <!-- Forgot Password Form (Step 1: Request code) -->
          <form *ngIf="authMode === 'forgot'" (ngSubmit)="sendResetCode()" class="space-y-4">
            <div class="mb-2">
              <p class="text-xs text-slate-600 mb-3">
                Saisissez votre matricule ou adresse e-mail pour recevoir un code de réinitialisation à 6 chiffres.
              </p>
              <label class="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Matricule ou E-mail</label>
              <input type="text" [(ngModel)]="matricule" name="forgotIdentifier" required placeholder="ex: 20230001 ou nom@uasz.sn"
                     class="uasz-input"/>
            </div>

            <div class="pt-2 space-y-2">
              <button type="submit" [disabled]="loading" class="uasz-btn-primary w-full py-2.5">
                <span *ngIf="!loading">Envoyer le code par e-mail</span>
                <lucide-icon *ngIf="loading" name="loader-2" class="w-4.5 h-4.5 animate-spin mx-auto text-white"></lucide-icon>
              </button>
              <div class="flex justify-between items-center pt-1 text-xs">
                <a href="javascript:void(0)" (click)="authMode = 'reset'; errorMessage = ''" class="uasz-link-text">J'ai déjà un code</a>
                <a href="javascript:void(0)" (click)="authMode = 'login'; errorMessage = ''" class="text-slate-500 hover:text-slate-800 font-semibold">Retour à la connexion</a>
              </div>
            </div>
          </form>

          <!-- Reset Password Form (Step 2: Enter code & new password) -->
          <form *ngIf="authMode === 'reset'" (ngSubmit)="confirmResetPassword()" class="space-y-3.5">
            <p class="text-xs text-slate-600">
              Saisissez le code à 6 chiffres reçu par e-mail ainsi que votre nouveau mot de passe (8 caractères minimum).
            </p>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 ml-0.5">Matricule ou E-mail</label>
              <input type="text" [(ngModel)]="matricule" name="resetIdentifier" required placeholder="ex: 20230001"
                     class="uasz-input"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 ml-0.5">Code de réinitialisation (6 chiffres)</label>
              <input type="text" [(ngModel)]="resetCode" name="resetCode" required maxlength="6" placeholder="123456"
                     class="uasz-input font-mono tracking-widest text-center"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 ml-0.5">Nouveau mot de passe</label>
              <input type="password" [(ngModel)]="newPassword" name="newPassword" required placeholder="Minimum 8 caractères"
                     class="uasz-input"/>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1 ml-0.5">Confirmer le mot de passe</label>
              <input type="password" [(ngModel)]="confirmNewPassword" name="confirmNewPassword" required placeholder="••••••••"
                     class="uasz-input"/>
            </div>

            <div class="pt-2 space-y-2">
              <button type="submit" [disabled]="loading" class="uasz-btn-primary w-full py-2.5">
                <span *ngIf="!loading">Réinitialiser le mot de passe</span>
                <lucide-icon *ngIf="loading" name="loader-2" class="w-4.5 h-4.5 animate-spin mx-auto text-white"></lucide-icon>
              </button>
              <div class="flex justify-between items-center pt-1 text-xs">
                <a href="javascript:void(0)" (click)="sendResetCode()" class="uasz-link-text">Renvoyer un code</a>
                <a href="javascript:void(0)" (click)="authMode = 'login'; errorMessage = ''" class="text-slate-500 hover:text-slate-800 font-semibold">Retour à la connexion</a>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  matricule = '';
  password = '';
  resetCode = '';
  newPassword = '';
  confirmNewPassword = '';
  authMode: 'login' | 'forgot' | 'reset' = 'login';
  loading = false;
  errorMessage = '';
  isOfflineError = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['error'] === 'unauthorized') {
        this.notificationService.showError("Accès non autorisé pour votre rôle. Veuillez vous connecter avec un compte habilité.");
      }
    });
  }

  onSubmit(): void {
    if (!this.matricule || !this.password) {
      this.isOfflineError = false;
      this.errorMessage = 'Veuillez saisir votre matricule et mot de passe.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.isOfflineError = false;

    this.authService.login(this.matricule, this.password).subscribe({
      next: (user) => {
        this.loading = false;
        if (user.role === 'SUPER_ADMIN') this.router.navigate(['/admin']);
        else if (user.role === 'COMMISSION_ELECTORALE') this.router.navigate(['/commission']);
        else if (user.role === 'CANDIDAT') this.router.navigate(['/candidat']);
        else this.router.navigate(['/elections']);
      },
      error: (err) => {
        this.loading = false;
        this.isOfflineError = !!err.isOffline;
        this.errorMessage = err.error?.message || 'Identifiants invalides. Les comptes sont pré-provisionnés par l\'administration.';
      }
    });
  }

  openForgotPassword(): void {
    this.errorMessage = '';
    const ident = this.matricule?.trim();
    if (ident) {
      this.sendResetCode();
    } else {
      this.authMode = 'forgot';
    }
  }

  sendResetCode(): void {
    const ident = this.matricule?.trim();
    if (!ident) {
      this.errorMessage = 'Veuillez saisir votre matricule ou adresse e-mail.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.authService.forgotPassword(ident).subscribe({
      next: (res) => {
        this.loading = false;
        this.authMode = 'reset';
        this.notificationService.showSuccess(res.message, 'Réinitialisation');
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || "Impossible d'envoyer le code de réinitialisation.";
      }
    });
  }

  confirmResetPassword(): void {
    const ident = this.matricule?.trim();
    const code = this.resetCode?.trim();
    if (!ident || !code || !this.newPassword) {
      this.errorMessage = 'Tous les champs sont obligatoires.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMessage = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.authService.resetPassword(ident, code, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.showSuccess(res.message, 'Mot de passe mis à jour');
        this.password = '';
        this.resetCode = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.authMode = 'login';
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Code de réinitialisation invalide ou expiré.';
      }
    });
  }
}
