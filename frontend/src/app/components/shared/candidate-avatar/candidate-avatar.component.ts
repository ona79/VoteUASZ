import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-candidate-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="sizeClass"
         class="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-emerald-50 text-[#047857] border border-emerald-200 font-bold uppercase select-none">
      <img *ngIf="photoUrl && !imageError"
           [src]="photoUrl"
           [alt]="name"
           loading="lazy"
           (error)="onImageError()"
           class="w-full h-full object-cover"/>
      <span *ngIf="!photoUrl || imageError">{{ initials }}</span>
    </div>
  `
})
export class CandidateAvatarComponent implements OnChanges {
  @Input() photoUrl?: string | null;
  @Input() name = '';
  @Input() sizeClass = 'w-7 h-7 text-[10px]';

  imageError = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['photoUrl']) {
      this.imageError = false;
    }
  }

  onImageError(): void {
    this.imageError = true;
  }

  get initials(): string {
    const parts = (this.name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return 'C';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
