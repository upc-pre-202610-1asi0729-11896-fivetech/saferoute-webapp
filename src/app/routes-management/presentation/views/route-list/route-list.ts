import {
  AfterViewInit, Component, ElementRef, inject,
  OnDestroy, signal, computed, ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as L from 'leaflet';
import { RoutesManagementStore } from '../../../application/routes-management.store';
import { Route } from '../../../domain/model/route-entity';
import { OrsService, Waypoint } from '../../../../shared/infrastructure/ors-service';
import { TripStore } from '../../../../trip/application/trip-store';

(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png'
});

@Component({
  selector: 'app-route-list',
  imports: [MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule],
  templateUrl: './route-list.html',
  styleUrl: './route-list.css'
})
export class RouteList implements AfterViewInit, OnDestroy {
  readonly store    = inject(RoutesManagementStore);
  private trips     = inject(TripStore);
  private router    = inject(Router);
  private ors       = inject(OrsService);
  private snack     = inject(MatSnackBar);
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  selectedId   = signal<number | null>(null);
  mapLoading   = signal(false);

  selectedRoute = computed<Route | undefined>(() => {
    const id = this.selectedId();
    return id !== null ? this.store.routes().find(r => r.id === id) : this.store.routes()[0];
  });

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private polyline: L.Polyline | null = null;

  ngAfterViewInit(): void {
    this.map = L.map(this.mapEl.nativeElement).setView([-12.046374, -77.042793], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(this.map);
    setTimeout(() => {
      this.map?.invalidateSize();
      const first = this.store.routes()[0];
      if (first) this.selectRoute(first);
    }, 150);
  }

  ngOnDestroy(): void { this.map?.remove(); this.map = null; }

  selectRoute(r: Route): void {
    this.selectedId.set(r.id);
    this.drawRoute(r);
  }

  private async drawRoute(r: Route): Promise<void> {
    if (!this.map || !r.waypoints?.length) { this.clearMap(); return; }
    this.mapLoading.set(true);
    this.clearMap();

    const wps: Waypoint[] = r.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, order: w.order }));

    let path: [number, number][] = wps.map(w => [w.lat, w.lng]);
    try {
      const result = await this.ors.fetchRoadRoute(wps);
      path = result.path;
    } catch { /* fall back to straight lines */ }

    this.polyline = L.polyline(path as L.LatLngExpression[], {
      color: '#16305a', weight: 4, opacity: 0.9
    }).addTo(this.map);
    this.map.fitBounds(this.polyline.getBounds(), { padding: [40, 40] });

    r.waypoints.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === r.waypoints.length - 1;
      const bg = isFirst ? '#16305a' : isLast ? '#dc2626' : '#ffb74d';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:12px;
          border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);">${i + 1}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const m = L.marker([wp.lat, wp.lng], { icon })
        .addTo(this.map!)
        .bindTooltip(`${i + 1}. ${wp.name}`, { direction: 'top' });
      this.markers.push(m);
    });

    this.mapLoading.set(false);
  }

  private clearMap(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];
    this.polyline?.remove();
    this.polyline = null;
  }

  typeLabel(type: string): string { return type === 'RETURN' ? 'Retorno' : 'Recojo'; }
  typeIcon(type: string):  string { return type === 'RETURN' ? '←' : '→'; }
  originName(r: Route):    string { return r.waypoints?.[0]?.name ?? '—'; }
  destName(r: Route):      string { return r.waypoints?.[r.waypoints.length - 1]?.name ?? '—'; }
  studentCount(r: Route):  number { return r.studentIds?.length ?? 0; }

  goNew():         void { this.router.navigate(['/routes-management/routes/new']); }
  goEdit(r: Route, e: Event): void { e.stopPropagation(); this.router.navigate(['/routes-management/routes', r.id, 'edit']); }
  delete(r: Route, e: Event): void {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${r.name}"?`)) return;
    this.store.deleteRoute(r.id);
    if (this.selectedId() === r.id) this.selectedId.set(null);
  }

  scheduleTrip(r: Route, e: Event): void {
    e.stopPropagation();
    if (!r.driverId) {
      this.snack.open('Asigna un conductor a la ruta antes de crear un viaje', 'OK', { duration: 3500 });
      return;
    }
    // Keep TripStore route cache in sync so the driver view gets waypoints immediately
    this.trips.syncRoute({
      id: r.id, name: r.name, type: r.type, driverId: Number(r.driverId),
      driverName: r.driverName, vehicleId: r.vehicleId ?? undefined,
      vehiclePlate: r.vehiclePlate, studentIds: r.studentIds,
      scheduledStartTime: r.scheduledStartTime, status: r.status,
      organizationId: r.organizationId, waypoints: r.waypoints
    });
    const today = new Date().toISOString().slice(0, 10);
    this.trips.createTrip({
      routeId:            r.id,
      routeName:          r.name,
      driverId:           Number(r.driverId),
      driverName:         r.driverName ?? '',
      vehicleId:          r.vehicleId ?? undefined,
      vehiclePlate:       r.vehiclePlate ?? '',
      studentIds:         r.studentIds ?? [],
      tripType:           r.type ?? 'OUTBOUND',
      scheduledDate:      today,
      scheduledStartTime: r.scheduledStartTime ?? '',
      status:             'SCHEDULED',
      startTime:          null,
      endTime:            null,
      studentsTotal:      r.studentIds?.length ?? 0,
      studentsBoarded:    0,
      currentStop:        null,
      currentLocation:    null,
      organizationId:     r.organizationId ?? 1,
    });
    this.snack.open(`Viaje programado para ${r.name} — ${today}`, 'OK', { duration: 3500 });
  }
}
