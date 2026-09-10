import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { NotificationService, Toast, PromptState } from '../../services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  template: `
    <!-- Toasts Container (Responsive: Top on Mobile, Bottom-Right on Desktop) -->
    <div class="fixed top-4 left-4 right-4 z-50 flex flex-col space-y-2.5 pointer-events-none md:top-auto md:bottom-6 md:left-auto md:right-6 md:w-96"
         aria-live="polite" aria-atomic="true">

      <div *ngFor="let toast of toasts"
           [class]="getToastClasses(toast.type)"
           class="pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start space-x-3 transition-all duration-300 animate-fade-in-up">

        <!-- Icon -->
        <div class="shrink-0 mt-0.5">
          <lucide-icon *ngIf="toast.type === 'success'" name="check-circle-2" class="w-5 h-5 text-[#047857]"></lucide-icon>
          <lucide-icon *ngIf="toast.type === 'error'" name="alert-triangle" class="w-5 h-5 text-[#dc2626]"></lucide-icon>
          <lucide-icon *ngIf="toast.type === 'warning'" name="alert-triangle" class="w-5 h-5 text-amber-600"></lucide-icon>
          <lucide-icon *ngIf="toast.type === 'info'" name="info" class="w-5 h-5 text-[#1d4ed8]"></lucide-icon>
        </div>

        <!-- Message Body -->
        <div class="flex-1 min-w-0">
          <h4 *ngIf="toast.title" class="text-xs font-black tracking-tight mb-0.5">{{ toast.title }}</h4>
          <p class="text-xs font-semibold leading-relaxed break-words">{{ toast.message }}</p>
        </div>

        <!-- Dismiss Button -->
        <button (click)="dismissToast(toast.id)"
                aria-label="Fermer la notification"
                class="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 transition-all">
          <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
        </button>

      </div>
    </div>

    <!-- Accessible Prompt Modal Dialog -->
    <div *ngIf="promptState"
         class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in-up"
         (click)="onBackdropClick($event)"
         role="dialog"
         aria-modal="true"
         aria-labelledby="prompt-modal-title">

      <div class="bg-white w-full max-w-lg p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-2xl relative"
           (click)="$event.stopPropagation()">

        <!-- Close Button (Resolves with null) -->
        <button (click)="cancelPrompt()"
                aria-label="Fermer la boîte de dialogue"
                class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold transition-colors">
          <lucide-icon name="x" class="w-4 h-4 text-slate-500"></lucide-icon>
        </button>

        <div class="flex items-center space-x-3 mb-4">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <lucide-icon name="message-square" class="w-5 h-5 text-amber-600"></lucide-icon>
          </div>
          <div>
            <h3 id="prompt-modal-title" class="text-lg md:text-xl font-black text-slate-900 tracking-tight">{{ promptState.title }}</h3>
            <p class="text-xs text-slate-500 font-medium">{{ promptState.message }}</p>
          </div>
        </div>

        <!-- Input Textarea -->
        <div class="mb-6">
          <textarea #promptInput
                    [(ngModel)]="promptInputText"
                    [placeholder]="promptState.placeholder"
                    rows="3"
                    class="uasz-input resize-none text-xs font-medium"></textarea>
        </div>

        <!-- Modal Actions -->
        <div class="flex justify-end space-x-3 pt-2 border-t border-slate-100">
          <button (click)="cancelPrompt()"
                  class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button (click)="confirmPrompt()"
                  class="uasz-btn-primary px-5 py-2.5">
            <span>{{ promptState.confirmText || 'Confirmer' }}</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class NotificationContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  promptState: PromptState | null = null;
  promptInputText = '';

  @ViewChild('promptInput') promptInputRef?: ElementRef<HTMLTextAreaElement>;

  private previousActiveElement: HTMLElement | null = null;
  private subs = new Subscription();
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.subs.add(
      this.notificationService.toasts$.subscribe(list => this.toasts = list)
    );

    this.subs.add(
      this.notificationService.promptState$.subscribe(state => {
        if (state && !this.promptState) {
          // Opening prompt modal: save active element
          this.previousActiveElement = document.activeElement as HTMLElement;
          this.promptInputText = state.defaultValue || '';
          this.promptState = state;
          setTimeout(() => {
            if (this.promptInputRef) {
              this.promptInputRef.nativeElement.focus();
            }
          }, 100);
        } else if (!state && this.promptState) {
          // Closing prompt modal: restore focus
          this.promptState = null;
          if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            this.previousActiveElement.focus();
          }
        } else {
          this.promptState = state;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.promptState) {
      event.preventDefault();
      this.cancelPrompt();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.promptState) {
      this.cancelPrompt();
    }
  }

  dismissToast(id: string): void {
    this.notificationService.dismissToast(id);
  }

  confirmPrompt(): void {
    if (this.promptState) {
      this.promptState.resolve(this.promptInputText);
    }
  }

  cancelPrompt(): void {
    if (this.promptState) {
      this.promptState.resolve(null);
    }
  }

  getToastClasses(type: string): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-50/95 border-emerald-200 text-[#047857] backdrop-blur-md';
      case 'error':
        return 'bg-red-50/95 border-red-200 text-[#dc2626] backdrop-blur-md';
      case 'warning':
        return 'bg-amber-50/95 border-amber-200 text-amber-800 backdrop-blur-md';
      default:
        return 'bg-blue-50/95 border-blue-200 text-[#1d4ed8] backdrop-blur-md';
    }
  }
}
