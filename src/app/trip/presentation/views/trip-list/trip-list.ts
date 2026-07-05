import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { TripStore } from '../../../application/trip-store';

@Component({
  selector: 'app-trip-list',
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatTableModule,
    MatChipsModule, MatProgressSpinnerModule, TranslatePipe
  ],
  templateUrl: './trip-list.html',
  styleUrl: './trip-list.css'
})
export class TripList {
  protected store = inject(TripStore);
  private router = inject(Router);

  displayedColumns = ['id', 'routeId', 'driverId', 'status', 'date', 'actions'];

  getStatusColor(status: string): string {
    if (status === 'EN_ROUTE') return 'accent';
    if (status === 'COMPLETED') return 'primary';
    if (status === 'CANCELLED') return 'warn';
    return '';
  }

  goNew(): void { this.router.navigate(['/trip/new']); }

  canCancel(status: string): boolean {
    return status === 'EN_ROUTE' || status === 'IN_PROGRESS' || status === 'SCHEDULED';
  }

  canActivate(status: string): boolean { return status === 'CANCELLED'; }

  cancelTrip(id: number): void { this.store.cancelTrip(id); }

  activateTrip(id: number): void { this.store.activateTrip(id); }

  deleteTrip(id: number): void { this.store.deleteTrip(id); }
}
