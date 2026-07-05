import {
  AfterViewInit, Component, computed, effect, ElementRef,
  inject, OnDestroy, signal, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import * as L from 'leaflet';
import { TripStore, TripEntity, RouteEntity, RouteWaypoint } from '../../../application/trip-store';
import { AuthStore } from '../../../../iam/application/auth-store';
import { NotificationStore } from '../../../../notifications/application/notification-store';
import { OrsService } from '../../../../shared/infrastructure/ors-service';
import { environment } from '../../../../../environments/environment';
import { Html5Qrcode } from 'html5-qrcode';

const EMERGENCY_PHONE = '+51900000000';

(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png'
});

const LIMA: L.LatLngTuple = [-12.046374, -77.042793];
const STEP_MS = environment.simulationStepMs;

const CAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1a1a2e">
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>`;

interface BoardingQrPayload {
  type: 'SAFEROUTE_BOARDING';
  tripId: number;
  childId: number;
  boardingState: 'BOARDED';
}

@Component({
  selector: 'app-active-trip',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  templateUrl: './active-trip.html',
  styleUrl: './active-trip.css'
})
export class ActiveTrip implements AfterViewInit, OnDestroy {
  protected store         = inject(TripStore);
  protected auth          = inject(AuthStore);
  private notifications   = inject(NotificationStore);
  private ors             = inject(OrsService);
  private snack           = inject(MatSnackBar);
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  // ── State ──
  selectedTripId = signal<number | null>(null);
  simRunning     = signal(false);
  orsLoading     = signal(false);
  currentWpIdx   = signal<number>(-1);
  boardingDialog = signal(false);
  boardingChildId = signal<number | null>(null);
  boardingPayload = signal('');
  scannerStatus = signal<'idle' | 'starting' | 'ready' | 'error'>('idle');
  scannerError = signal('');
  scannerMessage = signal('');

  // ── Emergency dialog ──
  emergencyDialog = signal(false);
  emergencyMode   = signal<null | 'urgent' | 'mild'>(null);
  emergencyType   = 'OTRO';
  emergencyDesc   = '';
  readonly emergencyPhone = EMERGENCY_PHONE;

  // ── Data ──
  myTrips = computed<TripEntity[]>(() => {
    const uid = this.auth.currentUser()?.id;
    if (!uid) return [];
    return this.store.trips().filter(t => Number(t.driverId) === Number(uid))
      .sort((a, b) => {
        const order = (s: string) => s === 'EN_ROUTE' ? 0 : s === 'SCHEDULED' ? 1 : 2;
        return order(a.status) - order(b.status);
      });
  });

  selectedTrip = computed<TripEntity | null>(() => {
    const id = this.selectedTripId();
    const trips = this.myTrips();
    if (id !== null) return trips.find(t => t.id === id) ?? null;
    return trips.find(t => t.status === 'EN_ROUTE')
        ?? trips.find(t => t.status === 'SCHEDULED')
        ?? trips[0] ?? null;
  });

  selectedRoute = computed<RouteEntity | undefined>(() => {
    const t = this.selectedTrip();
    return t ? this.store.getRouteById(t.routeId) : undefined;
  });

  waypoints = computed<RouteWaypoint[]>(() => this.selectedRoute()?.waypoints ?? []);

  isScheduled = computed(() => this.selectedTrip()?.status === 'SCHEDULED');
  isEnRoute   = computed(() => this.selectedTrip()?.status === 'EN_ROUTE');
  isCompleted = computed(() => this.selectedTrip()?.status === 'COMPLETED');

  progress = computed(() => {
    const n = this.waypoints().length;
    if (!n) return 0;
    return Math.round(Math.max(0, this.currentWpIdx()) / n * 100);
  });

  stops = computed(() => this.waypoints().map((wp, i) => ({
    ...wp,
    done:    i < this.currentWpIdx(),
    current: i === this.currentWpIdx()
  })));

  statusLabel = computed(() => {
    const s = this.selectedTrip()?.status;
    if (s === 'EN_ROUTE')   return 'En Ruta';
    if (s === 'SCHEDULED')  return 'Programado';
    if (s === 'COMPLETED')  return 'Completado';
    return s ?? '—';
  });

  currentStopName = computed(() => {
    const idx = this.currentWpIdx();
    return idx >= 0 ? (this.waypoints()[idx]?.name ?? '—') : (this.selectedTrip()?.currentStop ?? '—');
  });

  currentBoardingLabel = computed(() => {
    const id = this.boardingChildId();
    return id ? `Alumno #${id}` : 'Alumno';
  });

  tripTypeLabel(type?: string): string {
    return type === 'RETURN' ? 'Retorno' : 'Recojo';
  }

  statusClass(status: string): string {
    if (status === 'EN_ROUTE')  return 'status-en-route';
    if (status === 'COMPLETED') return 'status-completed';
    return 'status-scheduled';
  }

  // ── Map internals ──
  private map: L.Map | null = null;
  private busMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private stopCircles: L.CircleMarker[] = [];
  private animTimer: any = null;
  private subStepTimer: any = null;
  private roadPath: L.LatLngTuple[] = [];
  private wpIndices: number[] = [];
  private lastLoadedTripId: number | null = null;
  private html5QrCode: Html5Qrcode | null = null;
  private qrHandlingSuccess = false;
  private qrErrorCooldown = false;
  private boardingAutoContinueTimer: ReturnType<typeof setTimeout> | null = null;
  private resumingAfterBoarding = false;

  private readonly busIcon = L.divIcon({
    html: `<div class="at-bus-wrap" style="position:relative;width:44px;height:44px">
      <div class="at-bus-pulse" style="position:absolute;top:4px;left:4px;width:36px;height:36px;border-radius:50%;background:#ffb74d;opacity:0;pointer-events:none;z-index:1"></div>
      <div class="at-bus-body" style="position:absolute;top:4px;left:4px;width:36px;height:36px;background:#ffb74d;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;box-sizing:border-box;z-index:2">${CAR_SVG}</div>
    </div>`,
    className: 'at-bus-marker', iconSize: [44, 44], iconAnchor: [22, 22]
  });

  constructor() {
    effect(() => {
      const trip = this.selectedTrip();
      const id   = trip?.id ?? null;
      if (id !== this.lastLoadedTripId && this.map) {
        this.lastLoadedTripId = id;
        this.pauseSim();
        this.currentWpIdx.set(-1);
        this.loadRoadAndBuild();
      }
    });
  }

  ngAfterViewInit(): void {
    this.injectStyles();
    this.map = L.map(this.mapEl.nativeElement).setView(LIMA, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(this.map);
    setTimeout(() => {
      this.map?.invalidateSize();
      this.lastLoadedTripId = null;
      this.loadRoadAndBuild();
    }, 100);
  }

  ngOnDestroy(): void {
    this.pauseSim();
    this.stopBoardingCamera();
    this.map?.remove();
    this.map = null;
  }

  selectTrip(trip: TripEntity): void {
    if (this.selectedTripId() === trip.id) return;
    this.selectedTripId.set(trip.id);
  }

  // ── Map building ──
  private injectStyles(): void {
    if (document.getElementById('at-bus-styles')) return;
    const s = document.createElement('style');
    s.id = 'at-bus-styles';
    s.textContent = `
      @keyframes atPulse  { 0%{transform:scale(1);opacity:.7} 100%{transform:scale(2.4);opacity:0} }
      @keyframes atBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
      .leaflet-marker-icon.at-bus-marker{background:transparent!important;border:none!important}
      .at-bus-wrap{transition:transform .15s linear}
      .at-bus-pulse.active{animation:atPulse 1.2s ease-out infinite}
      .at-bus-body.moving{animation:atBounce .32s ease-in-out infinite}
    `;
    document.head.appendChild(s);
  }

  private async loadRoadAndBuild(): Promise<void> {
    const wps = this.waypoints();
    if (!this.map) return;
    if (!wps.length) { this.clearMapLayers(); this.map.setView(LIMA, 12); return; }

    this.orsLoading.set(true);
    try {
      const result = await this.ors.fetchRoadRoute(wps);
      this.roadPath  = result.path as L.LatLngTuple[];
      this.wpIndices = result.wayPointIndices;
    } catch {
      this.roadPath  = wps.map(w => [w.lat, w.lng] as L.LatLngTuple);
      this.wpIndices = wps.map((_, i) => i);
    } finally {
      this.orsLoading.set(false);
    }
    this.buildMapLayer();

    const trip = this.selectedTrip();
    if (trip?.status === 'EN_ROUTE') {
      const idx = wps.findIndex(w => w.name === trip.currentStop);
      this.currentWpIdx.set(idx >= 0 ? idx : 0);
    } else if (trip?.status === 'COMPLETED') {
      this.currentWpIdx.set(wps.length - 1);
    } else {
      this.currentWpIdx.set(-1);
    }
    this.refreshStopColors();
    if (this.currentWpIdx() >= 0 && wps[this.currentWpIdx()]) {
      this.placeBusAt(wps[this.currentWpIdx()]);
    }
  }

  private clearMapLayers(): void {
    if (this.routeLine) { this.map?.removeLayer(this.routeLine); this.routeLine = null; }
    this.stopCircles.forEach(c => this.map?.removeLayer(c));
    this.stopCircles = [];
    if (this.busMarker) { this.map?.removeLayer(this.busMarker); this.busMarker = null; }
  }

  private buildMapLayer(): void {
    if (!this.map) return;
    this.clearMapLayers();

    const wps    = this.waypoints();
    if (!wps.length) return;
    const coords = this.roadPath.length > 1 ? this.roadPath : wps.map(w => [w.lat, w.lng] as L.LatLngTuple);

    this.routeLine = L.polyline(coords, { color: '#16305a', weight: 5, opacity: 0.9 }).addTo(this.map);
    this.map.fitBounds(this.routeLine.getBounds(), { padding: [48, 48] });

    wps.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === wps.length - 1;
      const fill = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#94a3b8';
      const circle = L.circleMarker([wp.lat, wp.lng], {
        radius: 9, fillColor: fill, color: '#fff', weight: 2.5, fillOpacity: 1
      }).addTo(this.map!).bindTooltip(`${i + 1}. ${wp.name}`, { direction: 'top' });
      this.stopCircles.push(circle);
    });
  }

  private refreshStopColors(): void {
    this.stopCircles.forEach((c, i) => {
      const n = this.waypoints().length;
      const isFirst = i === 0, isLast = i === n - 1;
      const color = i < this.currentWpIdx()    ? '#22c55e'
                  : i === this.currentWpIdx()  ? '#ffb74d'
                  : isFirst                    ? '#16a34a'
                  : isLast                     ? '#dc2626'
                  :                              '#94a3b8';
      c.setStyle({ fillColor: color });
    });
  }

  private placeBusAt(wp: RouteWaypoint): void {
    if (!this.map) return;
    const ll: L.LatLngTuple = [wp.lat, wp.lng];
    if (!this.busMarker) {
      this.busMarker = L.marker(ll, { icon: this.busIcon, zIndexOffset: 1000 })
        .addTo(this.map)
        .bindPopup(`🚌 ${this.selectedTrip()?.driverName ?? 'Conductor'}`);
    } else {
      this.busMarker.setLatLng(ll);
    }
  }

  private getBearing(a: L.LatLngTuple, b: L.LatLngTuple): number {
    const r = (d: number) => d * Math.PI / 180;
    const dL = r(b[1] - a[1]), phi1 = r(a[0]), phi2 = r(b[0]);
    const y = Math.sin(dL) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dL);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  private rotateBus(bearing: number): void {
    const wrap = this.busMarker?.getElement()?.querySelector('.at-bus-wrap') as HTMLElement;
    if (wrap) wrap.style.transform = `rotate(${bearing - 90}deg)`;
  }

  private setBusMoving(moving: boolean): void {
    const el = this.busMarker?.getElement();
    if (!el) return;
    el.querySelector('.at-bus-pulse')?.classList.toggle('active', moving);
    el.querySelector('.at-bus-body')?.classList.toggle('moving', moving);
  }

  private animateSegment(seg: L.LatLngTuple[], onDone: () => void): void {
    if (!seg.length) { onDone(); return; }
    const FPS = 30, frameMs = 1000 / FPS;
    const totalSteps = Math.ceil(STEP_MS / frameMs);
    const stride = (seg.length - 1) / totalSteps;
    let prog = 0;
    this.setBusMoving(true);
    clearInterval(this.subStepTimer);
    this.subStepTimer = setInterval(() => {
      prog += stride;
      if (prog >= seg.length - 1) {
        clearInterval(this.subStepTimer);
        this.subStepTimer = null;
        this.busMarker?.setLatLng(seg[seg.length - 1]);
        this.setBusMoving(false);
        onDone();
        return;
      }
      const idx = Math.floor(prog), t = prog - idx;
      const a = seg[idx], b = seg[Math.min(idx + 1, seg.length - 1)];
      this.busMarker?.setLatLng([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      this.rotateBus(this.getBearing(a, b));
    }, frameMs);
  }

  private getSegment(from: number, to: number): L.LatLngTuple[] {
    const a = this.wpIndices[from] ?? 0;
    const b = this.wpIndices[to]   ?? this.roadPath.length - 1;
    return this.roadPath.length > 1 ? this.roadPath.slice(a, b + 1) : [];
  }

  private onArrive(idx: number): void {
    this.currentWpIdx.set(idx);
    this.refreshStopColors();
    const wp = this.waypoints()[idx];
    const trip = this.selectedTrip();
    if (wp && trip) {
      this.store.patchTrip(trip.id, { currentStop: wp.name });
      this.map?.panTo([wp.lat, wp.lng], { animate: true, duration: 0.3 });
    }
    const n = this.waypoints().length;
    if (n > 0 && idx === n - 2) {
      this.snack.open(`¡Próxima parada final: ${this.waypoints()[n - 1]?.name}!`, 'OK', { duration: 4000 });
    }
    if (n > 0 && idx === n - 1) {
      this.finishTrip(true);
      return;
    }
    this.prepareBoardingAtStop(idx);
  }

  private scheduleNext(): void {
    clearTimeout(this.animTimer);
    this.animTimer = setTimeout(() => {
      if (!this.simRunning()) return;
      const next = this.currentWpIdx() + 1;
      if (next >= this.waypoints().length) { this.simRunning.set(false); return; }
      const seg = this.getSegment(this.currentWpIdx(), next);
      this.animateSegment(seg, () => {
        this.onArrive(next);
        if (this.simRunning()) this.scheduleNext();
      });
    }, 400);
  }

  // ── Public actions ──
  startSim(): void {
    if (!this.isEnRoute() || !this.waypoints().length) return;
    if (this.orsLoading()) { this.snack.open('Calculando ruta…', 'OK', { duration: 1500 }); return; }
    if (this.currentWpIdx() < 0) this.currentWpIdx.set(0);
    this.simRunning.set(true);
    this.scheduleNext();
  }

  pauseSim(): void {
    this.simRunning.set(false);
    clearTimeout(this.animTimer);
    clearInterval(this.subStepTimer);
    this.subStepTimer = null;
    this.setBusMoving(false);
  }
  resetSim(): void {
    this.pauseSim();
    const trip = this.selectedTrip();
    if (trip?.status === 'COMPLETED') {
      const route = this.selectedRoute();
      if (!route) return;
      this.store.startDemoTripFromRoute(route, created => {
        this.selectedTripId.set(created.id);
        this.currentWpIdx.set(0);
        setTimeout(() => this.loadRoadAndBuild(), 0);
        this.snack.open('Demo reiniciado con un nuevo viaje activo', 'OK', { duration: 3000 });
      });
      return;
    }
    this.currentWpIdx.set(0);
    const wps = this.waypoints();
    if (!wps.length) return;
    this.refreshStopColors();
    const pos = this.roadPath.length > 1 ? this.roadPath[this.wpIndices[0] ?? 0] : null;
    if (pos) this.busMarker?.setLatLng(pos);
    else this.placeBusAt(wps[0]);
    const wrap = this.busMarker?.getElement()?.querySelector('.at-bus-wrap') as HTMLElement;
    if (wrap) wrap.style.transform = 'rotate(0deg)';
  }

  startTrip(): void {
    const trip = this.selectedTrip();
    if (!trip) return;
    const updated: TripEntity = {
      ...trip, status: 'EN_ROUTE',
      startTime: new Date().toISOString(),
      currentStop: this.waypoints()[0]?.name ?? null
    };
    this.store.updateTrip(updated);
    this.currentWpIdx.set(0);
    if (this.waypoints()[0]) this.placeBusAt(this.waypoints()[0]);
    this.refreshStopColors();
    this.snack.open(`Viaje iniciado — ${updated.routeName}`, 'OK', { duration: 3000 });
  }

  prepareBoardingAtStop(stopIndex: number): void {
    const trip = this.selectedTrip();
    if (!trip || stopIndex <= 0) return;
    if (stopIndex >= this.waypoints().length - 1) return;
    const childId = this.childIdForStop(stopIndex);
    if (!childId) return;
    this.pauseSim();
    const payload = JSON.stringify({
      type: 'SAFEROUTE_BOARDING',
      tripId: trip.id,
      childId,
      boardingState: 'BOARDED',
    });
    this.boardingChildId.set(childId);
    this.boardingPayload.set(payload);
    this.boardingDialog.set(true);
    this.scannerStatus.set('starting');
    this.boardingAutoContinueTimer = setTimeout(() => this.resumeAfterBoardingPause(childId), 3000);
    setTimeout(() => this.startBoardingCamera(), 0);
  }

  markBoarding(state: 'BOARDED' | 'ABSENT'): void {
    const trip = this.selectedTrip();
    const childId = this.boardingChildId();
    if (!trip || !childId) return;
    this.store.updateBoarding(trip.id, childId, state);
    this.notifyBoarding(state, childId);
    this.snack.open(state === 'BOARDED' ? 'Asistencia marcada por QR' : 'Alumno marcado ausente', 'OK', { duration: 3000 });
    setTimeout(() => this.resumeAfterBoardingPause(childId), 450);
  }

  continueAfterBoarding(): void {
    this.resumeAfterBoardingPause();
  }

  fallbackBoarding(): void {
    this.markBoarding('BOARDED');
  }

  private async startBoardingCamera(): Promise<void> {
    this.stopBoardingCamera();
    try {
      this.qrHandlingSuccess = false;
      this.qrErrorCooldown = false;
      this.html5QrCode = new Html5Qrcode('boarding-qr-reader');
      this.scannerStatus.set('ready');
      this.scannerError.set('');
      this.scannerMessage.set('Apunta la camara al QR del alumno.');
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 30, qrbox: { width: 220, height: 220 } },
        decodedText => this.handleQrValue(decodedText),
        () => undefined,
      );
    } catch (error) {
      this.scannerStatus.set('error');
      this.scannerError.set('No se pudo activar la camara. Permite el acceso o usa el boton de respaldo.');
      console.warn('Camera access failed', error);
    }
  }

  private handleQrValue(rawValue: string): void {
    if (this.qrHandlingSuccess) return;
    const payload = this.parseBoardingQr(rawValue);
    if (!payload) {
      this.showQrError('QR no reconocido para SafeRoute.');
      return;
    }

    const trip = this.selectedTrip();
    const expectedChildId = this.boardingChildId();
    if (!trip || payload.tripId !== trip.id || payload.childId !== expectedChildId) {
      this.showQrError('El QR pertenece a otro viaje o alumno.');
      return;
    }

    this.scannerMessage.set('QR valido. Marcando abordaje...');
    this.qrHandlingSuccess = true;
    this.markBoarding('BOARDED');
  }

  private parseBoardingQr(rawValue: string): BoardingQrPayload | null {
    const expectedChildId = this.boardingChildId();
    const trip = this.selectedTrip();
    if (/^\d+$/.test(rawValue.trim()) && expectedChildId && trip) {
      return {
        type: 'SAFEROUTE_BOARDING',
        tripId: trip.id,
        childId: Number(rawValue.trim()),
        boardingState: 'BOARDED',
      };
    }
    try {
      const parsed = JSON.parse(rawValue) as Partial<BoardingQrPayload>;
      if (
        parsed.type === 'SAFEROUTE_BOARDING' &&
        Number.isFinite(Number(parsed.tripId)) &&
        Number.isFinite(Number(parsed.childId)) &&
        parsed.boardingState === 'BOARDED'
      ) {
        return {
          type: 'SAFEROUTE_BOARDING',
          tripId: Number(parsed.tripId),
          childId: Number(parsed.childId),
          boardingState: 'BOARDED',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private showQrError(message: string): void {
    this.scannerMessage.set(message);
    if (this.qrErrorCooldown) return;
    this.qrErrorCooldown = true;
    this.snack.open(message, 'OK', { duration: 3000 });
    setTimeout(() => { this.qrErrorCooldown = false; }, 3000);
  }

  private stopBoardingCamera(): void {
    if (this.html5QrCode) {
      this.html5QrCode.stop()
        .then(() => this.html5QrCode?.clear())
        .catch(() => undefined)
        .finally(() => { this.html5QrCode = null; });
    }
    this.qrHandlingSuccess = false;
    this.qrErrorCooldown = false;
  }

  private closeBoardingScanner(): void {
    if (this.boardingAutoContinueTimer) {
      clearTimeout(this.boardingAutoContinueTimer);
      this.boardingAutoContinueTimer = null;
    }
    this.stopBoardingCamera();
    this.boardingDialog.set(false);
    this.scannerStatus.set('idle');
  }

  private resumeAfterBoardingPause(expectedChildId?: number): void {
    if (this.resumingAfterBoarding) return;
    if (expectedChildId && this.boardingChildId() !== expectedChildId) return;
    this.resumingAfterBoarding = true;
    this.closeBoardingScanner();
    if (this.isEnRoute()) {
      this.simRunning.set(true);
      this.scheduleNext();
    }
    setTimeout(() => { this.resumingAfterBoarding = false; }, 0);
  }

  private async notifyBoarding(state: 'BOARDED' | 'ABSENT', childId: number): Promise<void> {
    const title = state === 'BOARDED' ? 'Abordaje confirmado' : 'Alumno ausente';
    const body = state === 'BOARDED'
      ? `Alumno #${childId} abordo el bus. Se notificara al correo del apoderado.`
      : `Alumno #${childId} fue marcado como ausente.`;
    if (!('Notification' in window)) return;
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
    if (permission === 'granted') new Notification(title, { body });
  }

  private childIdForStop(stopIndex: number): number | null {
    const trip = this.selectedTrip();
    const waypointChild = this.waypoints()[stopIndex]?.studentId;
    if (waypointChild) return waypointChild;
    const ids = trip?.studentIds ?? [];
    return ids[stopIndex - 1] ?? null;
  }

  finishTrip(auto = false): void {
    const trip = this.selectedTrip();
    if (!trip || (!auto && !confirm('¿Confirmas la finalización del viaje?'))) return;
    this.pauseSim();
    this.store.completeTripAtDestination({
      ...trip,
      status: 'COMPLETED',
      endTime: new Date().toISOString(),
      studentsBoarded: trip.studentsTotal ?? trip.studentsBoarded
    });
    this.snack.open(auto ? 'Llegada a destino: viaje finalizado automaticamente' : 'Viaje finalizado', 'OK', { duration: 3000 });
  }

  // ── Emergency ──
  openEmergency(): void {
    this.emergencyMode.set(null);
    this.emergencyType = 'OTRO';
    this.emergencyDesc = '';
    this.emergencyDialog.set(true);
  }

  closeEmergency(): void {
    this.emergencyDialog.set(false);
  }

  callEmergency(): void {
    window.location.href = `tel:${EMERGENCY_PHONE}`;
    this.emergencyDialog.set(false);
  }

  submitEmergencyReport(): void {
    if (!this.emergencyDesc.trim()) {
      this.snack.open('Describe el incidente', 'OK', { duration: 2500 });
      return;
    }
    const trip = this.selectedTrip();
    this.notifications.reportIncident({
      type:     this.emergencyType,
      severity: 'HIGH',
      message:  this.emergencyDesc.trim(),
      date:     new Date().toISOString(),
      tripId:   trip?.id,
    });
    this.snack.open('Reporte enviado', 'OK', { duration: 3000 });
    this.emergencyDialog.set(false);
  }
}

