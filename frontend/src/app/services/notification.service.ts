import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  defaultValue?: string;
}

export interface PromptState extends PromptOptions {
  value: string;
  resolve: (value: string | null) => void;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  private promptSubject = new BehaviorSubject<PromptState | null>(null);
  public promptState$: Observable<PromptState | null> = this.promptSubject.asObservable();

  showSuccess(message: string, title: string = 'Succès'): void {
    this.addToast('success', message, title, 4000);
  }

  showInfo(message: string, title: string = 'Information'): void {
    this.addToast('info', message, title, 4000);
  }

  showWarning(message: string, title: string = 'Attention'): void {
    this.addToast('warning', message, title, 7000);
  }

  showError(message: string, title: string = 'Erreur'): void {
    this.addToast('error', message, title, 7000);
  }

  dismissToast(id: string): void {
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }

  prompt(
    title: string,
    message: string,
    placeholder: string = '',
    confirmText: string = 'Valider',
    defaultValue: string = ''
  ): Promise<string | null> {
    return new Promise((resolve) => {
      this.promptSubject.next({
        title,
        message,
        placeholder,
        confirmText,
        defaultValue,
        value: defaultValue,
        resolve: (val: string | null) => {
          this.promptSubject.next(null);
          resolve(val);
        }
      });
    });
  }

  closePrompt(val: string | null = null): void {
    const state = this.promptSubject.getValue();
    if (state) {
      state.resolve(val);
    }
  }

  private addToast(type: ToastType, message: string, title?: string, duration: number = 5000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, message, title, duration };
    const current = this.toastsSubject.getValue();
    this.toastsSubject.next([...current, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(id);
      }, duration);
    }
  }
}
