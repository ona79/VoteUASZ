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
              <img src="assets/logo_vote_uasz.PNG" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
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

          <!-- Alert Error (Rouge UASZ) -->
          <div *ngIf="errorMessage" class="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#dc2626] text-xs font-semibold flex items-center space-x-2.5 shadow-sm animate-fade-in-up">
            <lucide-icon name="alert-triangle" class="w-4 h-4 text-[#dc2626] shrink-0"></lucide-icon>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Login Form -->
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="mb-4">
              <label class="block text-xs font-bold text-slate-700 mb-1.5 ml-0.5">Matricule Universitaire</label>
              <input type="text" [(ngModel)]="matricule" name="matricule" required placeholder="ex: 20230001"
                     class="uasz-input"/>
            </div>

            <div class="mb-4">
              <div class="flex justify-between items-center mb-1.5 ml-0.5 mr-0.5">
                <label class="block text-xs font-bold text-slate-700">Mot de Passe</label>
                <a href="javascript:void(0)" (click)="forgotPasswordAlert()" class="uasz-link-text">Mot de passe oublié ?</a>
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

          <!-- Dynamic Quick Selector for Testing -->
          <div class="mt-8 pt-5 border-t border-slate-100">
            <p class="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider text-center mb-3">Comptes de Démo (Dev)</p>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-[10px]">
              <button (click)="fillDemo('ADMIN001', 'AdminSecure2026!')" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:shadow-md transition-all text-center group">
                <lucide-icon name="shield" class="w-4 h-4 mb-1 mx-auto text-[#1d4ed8] group-hover:scale-110 transition-transform"></lucide-icon>
                <b class="block text-[10px]">Super-Admin</b>
              </button>
              <button (click)="fillDemo('COMM001', 'CommSecure2026!')" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white hover:border-[#047857] hover:text-[#047857] hover:shadow-md transition-all text-center group">
                <lucide-icon name="landmark" class="w-4 h-4 mb-1 mx-auto text-emerald-600 group-hover:scale-110 transition-transform"></lucide-icon>
                <b class="block text-[10px]">Commission</b>
              </button>
              <button (click)="fillDemo('CAND202301', 'CandSecure2026!')" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white hover:border-slate-800 hover:text-slate-900 hover:shadow-md transition-all text-center group">
                <lucide-icon name="megaphone" class="w-4 h-4 mb-1 mx-auto text-slate-700 group-hover:scale-110 transition-transform"></lucide-icon>
                <b class="block text-[10px]">Candidat</b>
              </button>
              <button (click)="fillDemo('20230001', 'ElecteurSecure2026!')" class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-white hover:border-[#047857] hover:text-[#047857] hover:shadow-md transition-all text-center group">
                <lucide-icon name="vote" class="w-4 h-4 mb-1 mx-auto text-emerald-600 group-hover:scale-110 transition-transform"></lucide-icon>
                <b class="block text-[10px]">Électeur L3</b>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  matricule = '';
  password = '';
  loading = false;
  errorMessage = '';

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
      this.errorMessage = 'Veuillez saisir votre matricule et mot de passe.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

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
        this.errorMessage = err.error?.message || 'Identifiants invalides. Les comptes sont pré-provisionnés par l\'administration.';
      }
    });
  }

  fillDemo(mat: string, pass: string): void {
    this.matricule = mat;
    this.password = pass;
    this.onSubmit();
  }

  forgotPasswordAlert(): void {
    this.notificationService.showInfo("Pour réinitialiser votre mot de passe, contactez l'administration de votre UFR avec votre carte d'étudiant ou pièce d'identité.", "Réinitialisation de mot de passe");
  }
}
