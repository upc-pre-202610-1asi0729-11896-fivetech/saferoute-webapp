import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripStore, TripEntity, RouteEntity } from '../../../application/trip-store';
import { TripMap } from '../../../../shared/presentation/components/trip-map/trip-map';

interface StatusMeta { bg: string; text: string; label: string; icon: string }

const STATUS: Record<string, StatusMeta> = {
  EN_ROUTE:  { bg: '#dcfce7', text: '#15803d', label: 'En Ruta',    icon: 'directions_bus' },
  SCHEDULED: { bg: '#fef9c3', text: '#854d0e', label: 'Programado', icon: 'schedule' },
  COMPLETED: { bg: '#e0f2fe', text: '#0369a1', label: 'Completado', icon: 'check_circle' },
  CANCELLED: { bg: '#fee2e2', text: '#dc2626', label: 'Cancelado',  icon: 'cancel' }
};

@Component({
  selector: 'app-live-monitor',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TripMap],
  templateUrl: './live-monitor.html',
  styleUrl: './live-monitor.css'
})
export class LiveMonitor {
  protected store = inject(TripStore);

  selectedId = signal<number | null>(null);

  selected = computed<TripEntity | null>(() => {
    const id = this.selectedId();
    if (id === null) return null;
    return this.store.trips().find(t => t.id === id) ?? null;
  });

  selectedRoute = computed<RouteEntity | undefined>(() => {
    const t = this.selected();
    return t ? this.store.getRouteById(t.routeId) : undefined;
  });

  waypoints = computed(() => this.selectedRoute()?.waypoints ?? []);

  constructor() {
    // Auto-select first EN_ROUTE trip when data loads
    effect(() => {
      const trips = this.store.trips();
      if (this.selectedId() === null && trips.length > 0) {
        const enRoute = trips.find(t => t.status === 'EN_ROUTE');
        this.selectedId.set((enRoute ?? trips[0]).id);
      }
    });
  }

  status(s: string): StatusMeta {
    return STATUS[s] ?? { bg: '#f3f4f6', text: '#374151', label: s, icon: 'circle' };
  }

  selectTrip(t: TripEntity): void { this.selectedId.set(t.id); }

  refresh(): void { this.store.reload(); }

  fmtTime(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  progressPct(t: TripEntity): number {
    if (!t.studentsTotal) return 0;
    return Math.round((t.studentsBoarded ?? 0) / t.studentsTotal * 100);
  }
}
