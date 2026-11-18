import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule
  ],
  styles: [`
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px #f3f4f6 inset !important;
      -webkit-text-fill-color: #0f172a !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    @keyframes formFadeIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .form-fade {
      animation: formFadeIn 0.22s ease-out both;
    }

    .pill-field {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 18px;
      padding-right: 18px;
    }

    .pill-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      pointer-events: none;
    }

    .pill-icon svg {
      width: 18px;
      height: 18px;
    }

    .pill-input {
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .form-fade {
        animation: none;
      }
    }
  `],
  template: `
    <div class="min-h-[calc(100dvh-70px)] md:min-h-[calc(100dvh-49px)] bg-white flex flex-col md:flex-row relative overflow-x-hidden">

      <!-- ================================================================ -->
      <!-- PANNEAU VERT : Mobile en haut (courbe bas) | Desktop 45% gauche  -->
      <!-- ================================================================ -->
      <aside class="relative w-full md:w-[45%] bg-gradient-to-br from-[#064e3b] to-[#065f46] text-white shrink-0 flex flex-col justify-center
                    min-h-[205px] md:min-h-[calc(100dvh-49px)] px-5 pt-11 pb-6 md:py-6 md:pl-12 md:pr-20
                    rounded-b-[32px] md:rounded-none">

        <!-- Bouton Retour (Mobile : en haut à droite sur le vert) -->
        <a *ngIf="authMode === 'login'; else mobileBackToLogin"
           routerLink="/elections"
           class="md:hidden absolute top-3.5 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  bg-white/15 border border-white/25 text-white hover:bg-white/25 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
          <lucide-icon name="arrow-left" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
          <span>Retour à l'accueil</span>
        </a>
        <ng-template #mobileBackToLogin>
          <button type="button" (click)="switchMode('login')"
                  class="md:hidden absolute top-3.5 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                         bg-white/15 border border-white/25 text-white hover:bg-white/25 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80">
            <lucide-icon name="arrow-left" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span>Retour à la connexion</span>
          </button>
        </ng-template>

        <!-- Contenu Mobile (< 768px), centré -->
        <div class="md:hidden flex flex-col items-center text-center">
          <div class="w-12 h-12 rounded-full bg-white p-1.5 flex items-center justify-center shadow-sm mb-2 overflow-hidden">
            <img src="assets/logo_vote_uasz.webp" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
          </div>
          <h2 class="text-[26px] font-black tracking-tight leading-tight">
            Accès à Vote<span class="text-emerald-300">UASZ</span>
          </h2>
          <p class="text-[12px] text-emerald-100/90 leading-snug mt-1 max-w-[290px] line-clamp-2">
            {{ authMode === 'login'
              ? "Le portail de vote électronique sécurisé de l'Université Assane Seck de Ziguinchor."
              : (authMode === 'forgot'
                ? "Récupérez l'accès à votre compte en recevant un code de vérification par e-mail."
                : "Définissez un nouveau mot de passe sécurisé pour retrouver l'accès au portail VoteUASZ.") }}
          </p>
          <div class="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-50 bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
            <lucide-icon name="lock" class="w-3 h-3 shrink-0"></lucide-icon>
            <span>Système crypté de bout en bout</span>
          </div>
        </div>

        <!-- Contenu Desktop (>= 768px), aligné à gauche -->
        <div class="hidden md:flex flex-col items-start text-left relative z-10">
          <span class="text-[16px] font-medium text-emerald-200 tracking-wide mb-1">Accès à</span>
          <h2 class="text-[44px] lg:text-[52px] font-black tracking-tight leading-none">
            Vote<span class="text-emerald-300">UASZ</span>
          </h2>
          <p class="text-[14px] text-emerald-100/90 leading-relaxed mt-3 max-w-[320px]">
            {{ authMode === 'login'
              ? "Le portail de vote électronique sécurisé de l'Université Assane Seck de Ziguinchor."
              : (authMode === 'forgot'
                ? "Récupérez l'accès à votre compte en recevant un code de vérification par e-mail."
                : "Définissez un nouveau mot de passe sécurisé pour retrouver l'accès au portail VoteUASZ.") }}
          </p>
          <div class="mt-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-50 bg-white/15 px-3.5 py-1.5 rounded-full border border-white/20">
            <lucide-icon name="lock" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span>Système crypté de bout en bout</span>
          </div>
        </div>

        <!-- Bord droit courbe organique (Desktop uniquement) -->
        <svg class="hidden md:block absolute top-0 right-[-1px] h-full w-16 lg:w-24 text-white pointer-events-none"
             viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true">
          <path fill="currentColor"
                d="M 62 0 C 98 200, 12 420, 56 620 C 92 785, 22 910, 68 1000 L 100 1000 L 100 0 Z" />
        </svg>

        <!-- Illustration SVG originale à cheval sur la courbe (Desktop uniquement) -->
        <div class="hidden md:block absolute top-1/2 -translate-y-1/2 right-[-76px] lg:right-[-92px] z-20 pointer-events-none select-none"
             aria-hidden="true">
          <svg class="w-[168px] h-[168px] lg:w-[204px] lg:h-[204px] drop-shadow-md" viewBox="0 0 200 200" fill="none">
            <!-- Halo plat vert/blanc -->
            <circle cx="100" cy="100" r="88" fill="#ECFDF5" stroke="#A7F3D0" stroke-width="3" />
            <circle cx="100" cy="100" r="72" fill="#D1FAE5" opacity="0.55" />

            <!-- Corps de l'urne -->
            <rect x="46" y="92" width="108" height="68" rx="12" fill="#065F46" />
            <rect x="52" y="98" width="96" height="56" rx="8" fill="#047857" />

            <!-- Couvercle et fente de l'urne -->
            <rect x="40" y="82" width="120" height="16" rx="8" fill="#064E3B" />
            <rect x="66" y="87" width="68" height="5" rx="2.5" fill="#A7F3D0" />

            <!-- Bulletin entrant avec coche -->
            <g transform="rotate(-5 100 62)">
              <rect x="68" y="34" width="64" height="54" rx="8" fill="#FFFFFF" stroke="#065F46" stroke-width="3.5" />
              <!-- Coche verte -->
              <path d="M84 61 L95 72 L117 49" stroke="#047857" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
            </g>

            <!-- Détail géométrique façade urne -->
            <circle cx="100" cy="126" r="14" fill="#ECFDF5" opacity="0.22" />
            <path d="M93 126 L98 131 L108 120" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </aside>

      <!-- ================================================================ -->
      <!-- PARTIE DROITE : Formulaire centré sur fond blanc                 -->
      <!-- ================================================================ -->
      <main class="relative flex-1 bg-white flex flex-col justify-center items-center px-5 py-5 md:py-6 md:pl-24 lg:pl-28 md:pr-10">

        <!-- Bouton Retour (Desktop : en haut à droite) -->
        <a *ngIf="authMode === 'login'; else desktopBackToLogin"
           routerLink="/elections"
           class="hidden md:inline-flex items-center gap-1.5 absolute top-6 right-8 px-3.5 py-1.5 rounded-full text-xs font-medium
                  bg-emerald-50 border border-emerald-200 text-[#065f46] hover:bg-emerald-100 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2">
          <lucide-icon name="arrow-left" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
          <span>Retour à l'accueil</span>
        </a>
        <ng-template #desktopBackToLogin>
          <button type="button" (click)="switchMode('login')"
                  class="hidden md:inline-flex items-center gap-1.5 absolute top-6 right-8 px-3.5 py-1.5 rounded-full text-xs font-medium
                         bg-emerald-50 border border-emerald-200 text-[#065f46] hover:bg-emerald-100 transition
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2">
            <lucide-icon name="arrow-left" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
            <span>Retour à la connexion</span>
          </button>
        </ng-template>

        <div class="w-full max-w-[380px] form-fade">

          <!-- Logo plateforme (Desktop uniquement, masqué sur mobile car déjà dans le bloc vert) -->
          <div class="hidden md:flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 p-2 flex items-center justify-center shadow-sm overflow-hidden">
              <img src="assets/logo_vote_uasz.webp" alt="Logo Vote UASZ" class="w-full h-full object-contain" />
            </div>
          </div>

          <!-- Titre et sous-titre du mode actif -->
          <div class="text-center md:text-left mb-5">
            <h1 class="text-[26px] font-bold text-slate-900 leading-tight">
              {{ authMode === 'login' ? 'Connexion' : (authMode === 'forgot' ? 'Mot de passe oublié' : 'Réinitialisation') }}
            </h1>
            <p class="text-[13px] text-slate-500 mt-1 leading-snug">
              {{ authMode === 'login'
                ? 'Accès réservé aux électeurs et administrateurs pré-provisionnés'
                : (authMode === 'forgot'
                  ? 'Saisissez votre matricule ou adresse e-mail pour recevoir un code de réinitialisation à 6 chiffres.'
                  : 'Saisissez le code à 6 chiffres reçu par e-mail ainsi que votre nouveau mot de passe (8 caractères minimum).') }}
            </p>
          </div>

          <!-- Mode 1 : Connexion -->
          <form *ngIf="authMode === 'login'" (ngSubmit)="onSubmit()" class="space-y-3">
            <div>
              <label for="login-matricule" class="sr-only">Matricule universitaire</label>
              <div class="pill-field h-[46px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="user" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="login-matricule" type="text" [(ngModel)]="matricule" name="matricule" required placeholder="Matricule universitaire"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <div>
              <label for="login-password" class="sr-only">Mot de passe</label>
              <div class="pill-field h-[46px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="lock" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="login-password" type="password" [(ngModel)]="password" name="password" required placeholder="Mot de passe"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
              <div class="flex justify-end mt-1.5 pr-1">
                <a href="javascript:void(0)" (click)="openForgotPassword()"
                   class="text-xs font-medium text-[#065f46] hover:underline rounded px-1
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <ng-container *ngTemplateOutlet="alertMessages"></ng-container>

            <button type="submit" [disabled]="loading"
                    class="w-full h-[46px] rounded-full bg-[#065f46] hover:bg-[#064e3b] text-white text-sm font-semibold transition
                           flex items-center justify-center disabled:opacity-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2">
              <span *ngIf="!loading">Accéder au portail</span>
              <lucide-icon *ngIf="loading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
            </button>
          </form>

          <!-- Mode 2 : Mot de passe oublié -->
          <form *ngIf="authMode === 'forgot'" (ngSubmit)="sendResetCode()" class="space-y-3">
            <div>
              <label for="forgot-identifier" class="sr-only">Matricule ou e-mail</label>
              <div class="pill-field h-[46px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="user" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="forgot-identifier" type="text" [(ngModel)]="matricule" name="forgotIdentifier" required placeholder="Matricule ou e-mail"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <ng-container *ngTemplateOutlet="alertMessages"></ng-container>

            <button type="submit" [disabled]="loading"
                    class="w-full h-[46px] rounded-full bg-[#065f46] hover:bg-[#064e3b] text-white text-sm font-semibold transition
                           flex items-center justify-center disabled:opacity-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2">
              <span *ngIf="!loading">Envoyer le code par e-mail</span>
              <lucide-icon *ngIf="loading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
            </button>

            <div class="flex justify-center pt-1">
              <a href="javascript:void(0)" (click)="switchMode('login')"
                 class="text-xs font-medium text-[#065f46] hover:underline rounded px-1
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                Retour à la connexion
              </a>
            </div>
          </form>

          <!-- Mode 3 : Réinitialisation du mot de passe -->
          <form *ngIf="authMode === 'reset'" (ngSubmit)="confirmResetPassword()" class="space-y-2.5">
            <div>
              <label for="reset-identifier" class="sr-only">Matricule ou e-mail</label>
              <div class="pill-field h-[44px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="user" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="reset-identifier" type="text" [(ngModel)]="matricule" name="resetIdentifier" required placeholder="Matricule ou e-mail"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <div>
              <label for="reset-code" class="sr-only">Code de réinitialisation</label>
              <div class="pill-field h-[44px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="key" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="reset-code" type="text" [(ngModel)]="resetCode" name="resetCode" required maxlength="6" placeholder="123456"
                       class="pill-input flex-1 min-w-0 h-full pr-[30px] text-[14px] font-mono text-center tracking-[0.35em] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <div>
              <label for="reset-new-password" class="sr-only">Nouveau mot de passe</label>
              <div class="pill-field h-[44px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="lock" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="reset-new-password" type="password" [(ngModel)]="newPassword" name="newPassword" required placeholder="Nouveau mot de passe (min. 8 car.)"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <div>
              <label for="reset-confirm-password" class="sr-only">Confirmer le mot de passe</label>
              <div class="pill-field h-[44px] rounded-full bg-[#f3f4f6] border border-slate-200 focus-within:border-[#047857] focus-within:ring-2 focus-within:ring-[#047857]/25 transition overflow-hidden">
                <lucide-icon name="lock" [size]="18" class="pill-icon text-slate-400"></lucide-icon>
                <input id="reset-confirm-password" type="password" [(ngModel)]="confirmNewPassword" name="confirmNewPassword" required placeholder="Confirmer le mot de passe"
                       class="pill-input flex-1 min-w-0 h-full text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>

            <ng-container *ngTemplateOutlet="alertMessages"></ng-container>

            <button type="submit" [disabled]="loading"
                    class="w-full h-[46px] rounded-full bg-[#065f46] hover:bg-[#064e3b] text-white text-sm font-semibold transition
                           flex items-center justify-center disabled:opacity-50
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857] focus-visible:ring-offset-2">
              <span *ngIf="!loading">Réinitialiser le mot de passe</span>
              <lucide-icon *ngIf="loading" name="loader-2" class="w-4 h-4 animate-spin text-white"></lucide-icon>
            </button>

            <div class="flex justify-between items-center pt-1 text-xs">
              <a href="javascript:void(0)" (click)="sendResetCode()"
                 class="font-medium text-[#065f46] hover:underline rounded px-1
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                Renvoyer un code
              </a>
              <a href="javascript:void(0)" (click)="switchMode('login')"
                 class="font-medium text-[#065f46] hover:underline rounded px-1
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                Retour à la connexion
              </a>
            </div>
          </form>

          <!-- Alertes compactes juste au-dessus du bouton principal -->
          <ng-template #alertMessages>
            <div *ngIf="errorMessage"
                 [class]="isOfflineError ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-red-50 border-red-200 text-[#dc2626]'"
                 class="px-3.5 py-2 rounded-2xl border text-xs font-medium flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <lucide-icon [name]="isOfflineError ? 'info' : 'alert-triangle'" [class]="isOfflineError ? 'text-amber-600' : 'text-[#dc2626]'" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>{{ errorMessage }}</span>
              </div>
              <button (click)="errorMessage = ''" type="button"
                      class="text-slate-400 hover:text-slate-600 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
              </button>
            </div>

            <div *ngIf="successMessage"
                 class="px-3.5 py-2 rounded-2xl border bg-emerald-50 border-emerald-200 text-[#047857] text-xs font-medium flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <lucide-icon name="check-circle-2" class="w-3.5 h-3.5 text-[#047857] shrink-0"></lucide-icon>
                <span>{{ successMessage }}</span>
              </div>
              <button (click)="successMessage = ''" type="button"
                      class="text-emerald-600 hover:text-emerald-800 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#047857]">
                <lucide-icon name="x" class="w-3.5 h-3.5"></lucide-icon>
              </button>
            </div>
          </ng-template>
        </div>
      </main>
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
  successMessage = '';
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

  switchMode(mode: 'login' | 'forgot' | 'reset'): void {
    this.authMode = mode;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    if (!this.matricule || !this.password) {
      this.isOfflineError = false;
      this.successMessage = '';
      this.errorMessage = 'Veuillez saisir votre matricule et mot de passe.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
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
        this.errorMessage = err.error?.message || "Identifiants invalides. Les comptes sont pré-provisionnés par l'administration.";
      }
    });
  }

  openForgotPassword(): void {
    this.errorMessage = '';
    this.successMessage = '';
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
      this.successMessage = '';
      this.errorMessage = 'Veuillez saisir votre matricule ou adresse e-mail.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.forgotPassword(ident).subscribe({
      next: (res) => {
        this.loading = false;
        this.authMode = 'reset';
        this.successMessage = res.message;
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
      this.successMessage = '';
      this.errorMessage = 'Tous les champs sont obligatoires.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.successMessage = '';
      this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.successMessage = '';
      this.errorMessage = 'Les deux mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.resetPassword(ident, code, this.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        this.notificationService.showSuccess(res.message, 'Mot de passe mis à jour');
        this.password = '';
        this.resetCode = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        this.authMode = 'login';
        this.successMessage = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Code de réinitialisation invalide ou expiré.';
      }
    });
  }
}
