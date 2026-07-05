import {
  Component, inject, OnInit, OnDestroy, AfterViewInit,
  signal, computed
} from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as L from 'leaflet';
import { RoutesManagementStore } from '../../../application/routes-management.store';
import { Route, RouteWaypoint } from '../../../domain/model/route-entity';
import { OrsService } from '../../../../shared/infrastructure/ors-service';
import { TripStore } from '../../../../trip/application/trip-store';
import { AuthStore } from '../../../../iam/application/auth-store';
import { StakeholderStore } from '../../../../stakeholder/application/stakeholder-store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface UserOption   { id: number; name: string; }
interface ChildOption  { id: number; name: string; grade?: string; }

const START_STOP_NAME = 'Inicio';
const END_STOP_NAME = 'Llegada';

@Component({
  selector: 'app-route-form',
  imports: [ReactiveFormsModule, FormsModule,
    MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './route-form.html',
  styleUrl: './route-form.css'
})
export class RouteForm implements OnInit, AfterViewInit, OnDestroy {
  private fb        = inject(FormBuilder);
  private param     = inject(ActivatedRoute);
  private router    = inject(Router);
  private store     = inject(RoutesManagementStore);
  private tripStore = inject(TripStore);
  private stakeholderStore = inject(StakeholderStore);
  private ors       = inject(OrsService);
  private snack     = inject(MatSnackBar);
  private auth      = inject(AuthStore);
  private translate = inject(TranslateService);

  isEdit   = false;
  routeId: number | null = null;
  saving      = signal(false);
  orsLoading  = signal(false);
  drivers     = computed<UserOption[]>(() =>
    this.stakeholderStore.students().map(driver => ({
      id: Number(driver.id),
      name: `${driver.firstName} ${driver.lastName}`.trim() || driver.email,
    }))
  );
  children    = computed<ChildOption[]>(() =>
    this.stakeholderStore.children().map(child => ({
      id: Number(child.id),
      name: child.name,
      grade: child.grade,
    }))
  );
  waypoints   = signal<RouteWaypoint[]>([]);

  form = this.fb.group({
    name:               new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type:               new FormControl('OUTBOUND', { nonNullable: true }),
    status:             new FormControl('ACTIVE', { nonNullable: true }),
    scheduledStartTime: new FormControl('', { nonNullable: true }),
    driverId:           new FormControl<number | null>(null)
  });

  private map!: L.Map;
  private markers: L.Marker[] = [];
  private roadPolyline: L.Polyline | null = null;
  private previewLine: L.Polyline | null  = null;

  ngOnInit(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (orgId) this.stakeholderStore.loadAll(orgId);

    this.param.params.subscribe(params => {
      this.routeId = params['id'] ? +params['id'] : null;
      this.isEdit  = !!this.routeId;
      if (this.isEdit && this.routeId) {
        const r = this.store.getRouteById(this.routeId);
        if (r) {
          this.form.patchValue({
            name: r.name,
            type: r.type,
            status: r.status,
            scheduledStartTime: r.scheduledStartTime,
            driverId: r.driverId
          });
          this.waypoints.set(this.normalizeWaypointRoles([...r.waypoints]));
          setTimeout(() => this.refreshMarkersAndOrs(), 300);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('route-map', { center: [-12.046374, -77.042793], zoom: 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const current = this.waypoints();
      const isStart = current.length === 0;
      const isEnd = current.length === 1;
      const wp: RouteWaypoint = {
        order: current.length + 1,
        name: isStart ? START_STOP_NAME : isEnd ? END_STOP_NAME : `Parada ${current.length}`,
        lat: +e.latlng.lat.toFixed(6),
        lng: +e.latlng.lng.toFixed(6),
        studentId: null
      };
      this.waypoints.update(ws => this.normalizeWaypointRoles(
        ws.length >= 2
          ? [...ws.slice(0, -1), wp, ws[ws.length - 1]]
          : [...ws, wp]
      ));
      this.refreshMarkersAndOrs();
    });
  }

  // Draw markers immediately, then call ORS for road path
  private refreshMarkersAndOrs(): void {
    if (!this.map) return;
    const wps = this.waypoints();

    // Clear old markers
    this.markers.forEach(m => m.remove());
    this.markers = [];

    // Draw preview (dashed straight) while ORS loads
    this.previewLine?.remove();
    this.previewLine = null;
    const lls: L.LatLngExpression[] = wps.map(w => [w.lat, w.lng]);
    if (lls.length >= 2) {
      this.previewLine = L.polyline(lls, { color: '#94a3b8', weight: 2, dashArray: '5 6', opacity: 0.6 }).addTo(this.map);
    }

    // Place stop markers
    wps.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === wps.length - 1;
      const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#F59E0B';
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:${bg};color:#fff;
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:13px;
          border:3px solid #fff;
          box-shadow:0 3px 8px rgba(0,0,0,.35);">${wp.order}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const m = L.marker([wp.lat, wp.lng], { icon })
        .bindTooltip(wp.name, { permanent: false, direction: 'top' })
        .addTo(this.map);
      this.markers.push(m);
    });

    if (lls.length > 0) {
      this.map.fitBounds(L.latLngBounds(lls as L.LatLng[]), { padding: [36, 36] });
    }

    // Async ORS road-following path
    if (wps.length >= 2) {
      this.fetchOrsPath(wps);
    } else {
      this.roadPolyline?.remove();
      this.roadPolyline = null;
    }
  }

  private async fetchOrsPath(wps: RouteWaypoint[]): Promise<void> {
    this.orsLoading.set(true);
    try {
      const result = await this.ors.fetchRoadRoute(wps);
      // Remove dashed preview, replace with solid road path
      this.previewLine?.remove();
      this.previewLine = null;
      this.roadPolyline?.remove();
      this.roadPolyline = L.polyline(result.path as L.LatLngExpression[], {
        color: '#16305a', weight: 4, opacity: 0.85
      }).addTo(this.map);
    } catch {
      // Keep dashed preview on ORS failure
    } finally {
      this.orsLoading.set(false);
    }
  }

  updateWaypointName(index: number, name: string): void {
    this.waypoints.update(ws => {
      const copy = [...ws];
      copy[index] = { ...copy[index], name };
      return this.normalizeWaypointRoles(copy);
    });
    // Re-update tooltip on markers
    if (this.markers[index]) {
      this.markers[index].bindTooltip(name, { permanent: false, direction: 'top' });
    }
  }

  updateWaypointStudent(index: number, studentId: number | null): void {
    if (this.isFixedEndpoint(index)) return;
    this.waypoints.update(ws => {
      const copy = [...ws];
      copy[index] = { ...copy[index], studentId: studentId ?? null };
      return copy;
    });
  }

  removeWaypoint(index: number): void {
    if (this.isFixedEndpoint(index)) return;
    this.waypoints.update(ws =>
      this.normalizeWaypointRoles(ws.filter((_, i) => i !== index))
    );
    this.refreshMarkersAndOrs();
  }

  clearWaypoints(): void {
    this.waypoints.update(ws => ws.length >= 2 ? this.normalizeWaypointRoles([ws[0], ws[ws.length - 1]]) : []);
    this.refreshMarkersAndOrs();
  }

  submit(): void {
    if (this.form.invalid || this.waypoints().length < 2) {
      this.snack.open(this.translate.instant('route.feedback.define-start-end'), 'OK', { duration: 3000 });
      return;
    }
    const v = this.form.getRawValue();
    const selectedDriver = this.drivers().find(d => d.id === v.driverId);
    const finalWaypoints = this.normalizeWaypointRoles(this.waypoints());

    // Collect studentIds from waypoints (deduplicated)
    const studentIds = [...new Set(
      finalWaypoints.map(w => w.studentId).filter((id): id is number => id != null)
    )];

    const orgId = Number(this.auth.currentUser()?.organizationId ?? 1);
    const route = new Route({
      id: this.routeId ?? 0,
      name: v.name,
      type: v.type,
      status: v.status,
      scheduledStartTime: v.scheduledStartTime,
      driverId: v.driverId !== null ? Number(v.driverId) : null,
      driverName: selectedDriver?.name ?? '',
      vehicleId: null,
      vehiclePlate: '',
      studentIds,
      organizationId: orgId,
      waypoints: finalWaypoints
    });

    // Sync to TripStore so drivers immediately get waypoints when a trip is created
    this.tripStore.syncRoute({
      id: route.id, name: route.name, type: route.type,
      driverId: route.driverId ?? 0, driverName: route.driverName,
      vehicleId: route.vehicleId ?? undefined, vehiclePlate: route.vehiclePlate,
      studentIds: route.studentIds, scheduledStartTime: route.scheduledStartTime,
      status: route.status, organizationId: route.organizationId,
      waypoints: route.waypoints
    });

    this.saving.set(true);
    if (this.isEdit) {
      this.store.updateRoute(route);
      this.snack.open(this.translate.instant('route.feedback.updated'), 'OK', { duration: 3000 });
    } else {
      this.store.addRoute(route);
      // Auto-create a SCHEDULED trip when route has a driver assigned
      if (route.driverId) {
        const today = new Date().toISOString().slice(0, 10);
        this.tripStore.createTrip({
          routeId:            route.id,
          routeName:          route.name,
          driverId:           Number(route.driverId),
          driverName:         route.driverName ?? '',
          vehicleId:          route.vehicleId ?? undefined,
          vehiclePlate:       route.vehiclePlate ?? '',
          studentIds:         route.studentIds ?? [],
          tripType:           route.type ?? 'OUTBOUND',
          scheduledDate:      today,
          scheduledStartTime: route.scheduledStartTime ?? '',
          status:             'SCHEDULED',
          startTime:          null,
          endTime:            null,
          studentsTotal:      route.studentIds?.length ?? 0,
          studentsBoarded:    0,
          currentStop:        null,
          currentLocation:    null,
          organizationId:     route.organizationId ?? 1,
        });
      }
      this.snack.open(this.translate.instant(route.driverId ? 'route.feedback.created-and-trip-scheduled' : 'route.feedback.created'), 'OK', { duration: 3500 });
    }
    this.router.navigate(['/routes-management/routes']);
  }

  cancel(): void {
    this.router.navigate(['/routes-management/routes']);
  }

  childName(id: number | null | undefined): string {
    if (!id) return '';
    return this.children().find(c => c.id === id)?.name ?? '';
  }

  canSaveRoute(): boolean {
    return this.form.valid && this.waypoints().length >= 2 && !this.saving();
  }

  isFixedEndpoint(index: number): boolean {
    const lastIndex = this.waypoints().length - 1;
    return index === 0 || (lastIndex > 0 && index === lastIndex);
  }

  waypointRole(index: number): string {
    const lastIndex = this.waypoints().length - 1;
    if (index === 0) return START_STOP_NAME;
    if (lastIndex > 0 && index === lastIndex) return END_STOP_NAME;
    return this.translate.instant('route.form.intermediate-stop');
  }

  private normalizeWaypointRoles(waypoints: RouteWaypoint[]): RouteWaypoint[] {
    return waypoints.map((wp, index) => {
      const lastIndex = waypoints.length - 1;
      const fixedEndpoint = index === 0 || (lastIndex > 0 && index === lastIndex);
      return {
        ...wp,
        order: index + 1,
        studentId: fixedEndpoint ? null : wp.studentId ?? null
      };
    });
  }
}
