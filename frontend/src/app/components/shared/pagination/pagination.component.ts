import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div *ngIf="totalItems > 0"
         class="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-slate-500">
      <span>
        Affichage {{ startIndex + 1 }}–{{ endIndex }} sur {{ totalItems }} {{ itemLabel }}{{ totalItems > 1 ? 's' : '' }}
      </span>

      <div *ngIf="totalPages > 1" class="inline-flex items-center space-x-1">
        <button type="button" (click)="goToPage(currentPage - 1)" [disabled]="currentPage === 1"
                class="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center">
          <lucide-icon name="chevron-left" class="w-3.5 h-3.5"></lucide-icon>
        </button>

        <button *ngFor="let page of pageNumbers" type="button" (click)="goToPage(page)"
                [class]="page === currentPage ? 'bg-[#047857] text-white border-[#047857]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
                class="h-7 min-w-[28px] px-2 rounded-lg border text-xs font-bold transition">
          {{ page }}
        </button>

        <button type="button" (click)="goToPage(currentPage + 1)" [disabled]="currentPage === totalPages"
                class="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center">
          <lucide-icon name="chevron-right" class="w-3.5 h-3.5"></lucide-icon>
        </button>
      </div>
    </div>
  `
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() pageSize = 8;
  @Input() currentPage = 1;
  @Input() itemLabel = 'élément';

  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.totalItems);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }
}
