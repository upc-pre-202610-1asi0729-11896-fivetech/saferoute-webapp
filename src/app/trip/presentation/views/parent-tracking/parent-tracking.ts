import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as QRCode from 'qrcode';
import { TripStore, TripEntity, RouteEntity } from '../../../application/trip-store';
import { AuthStore } from '../../../../iam/application/auth-store';
import { StakeholderStore } from '../../../../stakeholder/application/stakeholder-store';
import { ChildEntity } from '../../../../stakeholder/domain/model/student-entity';
import { TripMap } from '../../../../shared/presentation/components/trip-map/trip-map';

interface TimelineItem { time: string; event: string; done: boolean; icon: string }
interface ChildQrCard { childId: number; childName: string; grade: string; qrUrl: string }

@Component({
  selector: 'app-parent-tracking',
  imports: [MatIconModule, MatProgressSpinnerModule, TripMap],
  templateUrl: './parent-tracking.html',
  styleUrl: './parent-tracking.css'
})
export class ParentTracking {
  @ViewChild(TripMap) private tripMap?: TripMap;

  protected store = inject(TripStore);
  protected auth = inject(AuthStore);
  private stakeholderStore = inject(StakeholderStore);

  parents = computed(() => this.stakeholderStore.parents());
  children = computed(() => this.stakeholderStore.children());
  simulatingTrip = signal(false);
  demoRunning = signal(false);
  demoPaused = signal(false);
  childQrCards = signal<ChildQrCard[]>([]);
  private qrChildrenKey = '';

  myParent = computed(() => {
    const email = this.auth.currentUser()?.email?.toLowerCase();
    return this.parents().find(p => p.email?.toLowerCase() === email) ?? null;
  });

  myChildren = computed(() => {
    const me = this.myParent();
    return me ? this.children().filter(c => c.parentId === me.id) : [];
  });

  myChildIds = computed(() => this.myChildren().map(c => Number(c.id)).filter(id => Number.isFinite(id)));

  trackedTrip = computed<TripEntity | null>(() => {
    const ids = this.myChildIds();
    if (!ids.length) return null;
    const trips = this.store.trips();
    const hasOneOfMyChildren = (trip: TripEntity) =>
      (trip.studentIds || []).some(id => ids.includes(Number(id)));
    return trips.find(t => t.status === 'EN_ROUTE' && hasOneOfMyChildren(t))
        ?? trips.find(t => t.status === 'SCHEDULED' && hasOneOfMyChildren(t))
        ?? trips.find(t => hasOneOfMyChildren(t))
        ?? null;
  });

  trackedRoute = computed(() => {
    const t = this.trackedTrip();
    return t ? this.store.getRouteById(t.routeId) : undefined;
  });

  simulationRoute = computed<RouteEntity | undefined>(() => {
    const currentRoute = this.trackedRoute();
    if (currentRoute) return currentRoute;
    const ids = this.myChildIds();
    if (!ids.length) return undefined;
    return this.store.routes().find(route =>
      (route.studentIds ?? []).some(id => ids.includes(Number(id)))
    );
  });

  canSimulateTrip = computed(() => {
    const route = this.simulationRoute();
    return !!route?.id && !!route.driverId && !this.simulatingTrip() && !this.demoRunning();
  });

  canPauseDemo = computed(() => this.demoRunning() && !this.demoPaused());
  canResumeDemo = computed(() => this.demoRunning() && this.demoPaused());
  canRestartDemo = computed(() => !!this.simulationRoute()?.driverId && !!this.trackedTrip() && !this.simulatingTrip());

  simulationLabel = computed(() => this.trackedTrip() ? 'Iniciar demo' : 'Simular viaje');

  waypoints = computed(() => this.trackedRoute()?.waypoints ?? []);

  timeline = computed<TimelineItem[]>(() => {
    const t = this.trackedTrip();
    const wps = this.waypoints();
    if (!t || !wps.length) return [];
    const currentIdx = wps.findIndex(w => w.name === t.currentStop);
    const completed = t.status === 'COMPLETED';
    const items: TimelineItem[] = [];
    if (t.scheduledStartTime) {
      items.push({ time: t.scheduledStartTime, event: 'Bus salió del punto inicial', done: !!t.startTime, icon: 'flag' });
    }
    wps.forEach((wp, i) => {
      items.push({
        time: '',
        event: `Parada ${i + 1} — ${wp.name}`,
        done: completed || (currentIdx >= 0 && i <= currentIdx),
        icon: 'location_on'
      });
    });
    return items;
  });

  eta = computed(() => {
    const t = this.trackedTrip();
    if (!t) return '—';
    if (t.endTime) return new Date(t.endTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    if (t.scheduledStartTime) return t.scheduledStartTime;
    return '—';
  });

  constructor() {
    const orgId = this.auth.currentUser()?.organizationId;
    if (orgId) {
      this.stakeholderStore.loadAll(orgId);
      this.store.loadAll(Number(orgId));
    }
    effect(() => {
      void this.buildChildQrCards(this.myChildren());
    });
  }

  simulateTrip(): void {
    const route = this.simulationRoute();
    if (!route?.id || !route.driverId || this.simulatingTrip()) return;
    const currentTrip = this.trackedTrip();
    if (currentTrip?.status === 'EN_ROUTE') {
      this.startMapSimulation();
      return;
    }
    this.simulatingTrip.set(true);
    this.demoRunning.set(false);
    this.demoPaused.set(false);
    this.store.startDemoTripFromRoute(
      route,
      () => this.startMapSimulation(),
      () => this.simulatingTrip.set(false)
    );
  }

  pauseDemo(): void {
    if (this.tripMap?.pauseRouteSimulation()) {
      this.demoPaused.set(true);
    }
  }

  resumeDemo(): void {
    if (this.tripMap?.resumeRouteSimulation()) {
      this.demoPaused.set(false);
    }
  }

  restartDemo(): void {
    const route = this.simulationRoute();
    if (!route?.id || !route.driverId || this.simulatingTrip()) return;
    this.tripMap?.stopRouteSimulation();
    this.demoRunning.set(false);
    this.demoPaused.set(false);
    this.simulatingTrip.set(true);
    this.store.startDemoTripFromRoute(
      route,
      () => this.startMapSimulation(),
      () => this.simulatingTrip.set(false)
    );
  }

  private startMapSimulation(attempt = 0): void {
    const started = this.tripMap?.startRouteSimulation(
      () => {
        this.finishTripAtDestination();
        this.demoRunning.set(false);
        this.demoPaused.set(false);
      },
      index => this.markStopReached(index)
    );
    if (started) {
      this.demoRunning.set(true);
      this.demoPaused.set(false);
      return;
    }
    if (attempt >= 6) return;
    setTimeout(() => this.startMapSimulation(attempt + 1), 250);
  }

  private markStopReached(index: number): void {
    const trip = this.trackedTrip();
    const wp = this.waypoints()[index];
    if (!trip || !wp) return;
    this.store.patchTrip(trip.id, {
      currentStop: wp.name,
      currentLocation: wp.name,
      startTime: trip.startTime ?? new Date().toISOString()
    });
  }

  private finishTripAtDestination(): void {
    const trip = this.trackedTrip();
    const destination = this.waypoints().at(-1);
    if (!trip) return;
    if (destination) {
      this.store.patchTrip(trip.id, {
        currentStop: destination.name,
        currentLocation: destination.name
      });
    }
    this.store.patchTrip(trip.id, { status: 'COMPLETED', endTime: new Date().toISOString() });
  }

  private async buildChildQrCards(children: ChildEntity[]): Promise<void> {
    const key = children.map(child => `${child.id}:${child.name}:${child.grade}`).join('|');
    if (key === this.qrChildrenKey) return;
    this.qrChildrenKey = key;

    const cards = await Promise.all(children.map(async child => {
      const childId = Number(child.id);
      const payload = JSON.stringify({
        type: 'SAFE_ROUTE_CHILD_BOARDING',
        childId,
        childName: child.name,
        parentId: child.parentId,
        organizationId: child.organizationId
      });
      return {
        childId,
        childName: child.name,
        grade: child.grade,
        qrUrl: await QRCode.toDataURL(payload, { margin: 1, width: 132 })
      };
    }));

    this.childQrCards.set(cards);
  }
}
