import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy,
  SimpleChanges, ViewChild, inject
} from '@angular/core';
import * as L from 'leaflet';
import { OrsService, Waypoint } from '../../../infrastructure/ors-service';

(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl:       'assets/leaflet/marker-icon.png',
  shadowUrl:     'assets/leaflet/marker-shadow.png'
});

const LIMA: L.LatLngTuple = [-12.046374, -77.042793];

const CAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#1a1a2e">
  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
</svg>`;

@Component({
  selector: 'app-trip-map',
  template: `<div #mapEl class="trip-map-container"></div>`,
  styles: [`
    :host { display: block; height: 100%; width: 100%; }
    .trip-map-container { height: 100%; width: 100%; min-height: 320px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  `]
})
export class TripMap implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  @Input() waypoints: Waypoint[] = [];
  @Input() currentStop: string | null = null;
  @Input() driverName: string | null = null;
  @Input() lineColor = '#ffb74d';

  private ors = inject(OrsService);
  private map: L.Map | null = null;
  private layers: L.Layer[] = [];
  private busMarker: L.Marker | null = null;
  private placeholderLine: L.Polyline | null = null;
  private roadLine: L.Polyline | null = null;
  private renderToken = 0;
  private simulationTimer: ReturnType<typeof setInterval> | null = null;
  private simulationPath: L.LatLngTuple[] = [];
  private simulationWaypointIndices: number[] = [];
  private simulationProgress = 0;
  private simulationStride = 0;
  private simulationNextWaypoint = 0;
  private simulationDone?: () => void;
  private simulationWaypointReached?: (index: number) => void;

  private readonly busIcon = L.divIcon({
    html: `
      <div class="sr-bus-wrap" style="position:relative;width:36px;height:36px;">
        <div class="sr-bus-pulse" style="position:absolute;top:0;left:0;width:36px;height:36px;border-radius:50%;background:#ffb74d;opacity:0;pointer-events:none"></div>
        <div class="sr-bus-body" style="position:absolute;top:0;left:0;width:36px;height:36px;background:#ffb74d;border:3px solid #fff;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;box-sizing:border-box">${CAR_SVG}</div>
      </div>`,
    className: 'sr-bus-marker', iconSize: [36, 36], iconAnchor: [18, 18]
  });

  ngAfterViewInit(): void {
    this.injectStyles();
    this.map = L.map(this.mapEl.nativeElement).setView(LIMA, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 50);
    if (this.waypoints?.length) this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;
    if (changes['waypoints']) {
      this.render();
      return;
    }
    if (changes['currentStop'] && !this.hasSimulationState()) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.stopRouteSimulation();
    this.map?.remove();
    this.map = null;
  }

  /** Public: get the map instance for advanced use cases */
  getMap(): L.Map | null { return this.map; }
  /** Public: returns the current bus marker */
  getBusMarker(): L.Marker | null { return this.busMarker; }
  /** Public: move bus to a position */
  moveBus(pos: L.LatLngTuple): void { this.busMarker?.setLatLng(pos); }
  /** Public: visually animates the bus across the rendered route. */
  startRouteSimulation(onDone?: () => void, onWaypointReached?: (index: number) => void): boolean {
    const path = this.getSimulationPath();
    if (!this.busMarker || path.length < 2) return false;

    this.stopRouteSimulation();
    this.clearSimulationState();
    this.simulationPath = path;
    this.simulationWaypointIndices = this.getWaypointPathIndices(path);
    this.simulationProgress = 0;
    this.simulationNextWaypoint = 0;
    this.simulationDone = onDone;
    this.simulationWaypointReached = onWaypointReached;

    const totalSteps = Math.max(path.length * 10, 180);
    this.simulationStride = (path.length - 1) / totalSteps;
    this.busMarker.setLatLng(path[0]);
    this.notifyReachedWaypoints(0);
    this.runSimulationTimer();
    return true;
  }

  pauseRouteSimulation(): boolean {
    if (!this.simulationTimer) return false;
    this.clearSimulationTimer();
    this.setBusMoving(false);
    return true;
  }

  resumeRouteSimulation(): boolean {
    if (!this.busMarker || this.simulationPath.length < 2 || this.simulationTimer) return false;
    this.runSimulationTimer();
    return true;
  }

  stopRouteSimulation(): void {
    this.clearSimulationTimer();
    this.setBusMoving(false);
    this.clearSimulationState();
  }

  private injectStyles(): void {
    if (document.getElementById('sr-bus-styles')) return;
    const s = document.createElement('style');
    s.id = 'sr-bus-styles';
    s.textContent = `
      @keyframes srPulse {
        0%   { transform: scale(1);   opacity: 0.7; }
        100% { transform: scale(2.4); opacity: 0;   }
      }
      .leaflet-marker-icon.sr-bus-marker { background: transparent !important; border: none !important; }
      .sr-bus-wrap { transition: transform 0.2s linear; }
      .sr-bus-pulse.active { animation: srPulse 1.2s ease-out infinite; }
    `;
    document.head.appendChild(s);
  }

  private clear(): void {
    if (!this.map) return;
    this.stopRouteSimulation();
    this.layers.forEach(l => this.map!.removeLayer(l));
    this.layers = [];
    if (this.busMarker)        { this.map.removeLayer(this.busMarker);        this.busMarker = null; }
    if (this.placeholderLine)  { this.map.removeLayer(this.placeholderLine);  this.placeholderLine = null; }
    if (this.roadLine)         { this.map.removeLayer(this.roadLine);         this.roadLine = null; }
  }

  private async render(): Promise<void> {
    if (!this.map) return;
    const token = ++this.renderToken;
    this.clear();

    const wps = this.waypoints;
    if (!wps || !wps.length) { this.map.setView(LIMA, 12); return; }

    // Stop markers
    wps.forEach((wp, i) => {
      const isFirst = i === 0;
      const isLast  = i === wps.length - 1;
      const bg = isFirst ? '#16a34a' : isLast ? '#dc2626' : '#16305a';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${bg};color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #ffb74d;box-shadow:0 2px 6px rgba(0,0,0,.3)">${i + 1}</div>`,
        iconSize: [22, 22], iconAnchor: [11, 11]
      });
      const m = L.marker([wp.lat, wp.lng], { icon }).addTo(this.map!).bindPopup(`<b>${i + 1}. ${wp.name}</b>`);
      this.layers.push(m);
    });

    // Bus marker at current stop (or first waypoint)
    const stopName = this.currentStop;
    const cur = wps.find(w => w.name === stopName) || wps[0];
    this.busMarker = L.marker([cur.lat, cur.lng], { icon: this.busIcon, zIndexOffset: 1000 })
      .addTo(this.map)
      .bindPopup(`<b>🚌 ${this.driverName || 'En ruta'}</b><br>${stopName || cur.name}`)
      .openPopup();

    // Dashed placeholder line
    const coords = wps.map(w => [w.lat, w.lng] as L.LatLngTuple);
    this.placeholderLine = L.polyline(coords, {
      color: this.lineColor, weight: 5, opacity: 0.35, dashArray: '7 6'
    }).addTo(this.map);
    this.map.fitBounds(this.placeholderLine.getBounds(), { padding: [40, 40] });

    // Async ORS road geometry upgrade
    if (wps.length >= 2) {
      try {
        const { path } = await this.ors.fetchRoadRoute(wps);
        if (token !== this.renderToken || !this.map) return;
        if (this.placeholderLine) { this.map.removeLayer(this.placeholderLine); this.placeholderLine = null; }
        this.roadLine = L.polyline(path as L.LatLngTuple[], {
          color: this.lineColor, weight: 5, opacity: 0.85
        }).addTo(this.map);
        this.map.fitBounds(this.roadLine.getBounds(), { padding: [40, 40] });
      } catch (e) {
        console.warn('ORS failed, keeping straight line', e);
      }
    }
  }

  private getSimulationPath(): L.LatLngTuple[] {
    const roadPoints = this.roadLine?.getLatLngs();
    if (roadPoints?.length) {
      return (roadPoints as L.LatLng[]).map(p => [p.lat, p.lng] as L.LatLngTuple);
    }
    return (this.waypoints ?? []).map(wp => [wp.lat, wp.lng] as L.LatLngTuple);
  }

  private getWaypointPathIndices(path: L.LatLngTuple[]): number[] {
    let searchFrom = 0;
    return (this.waypoints ?? []).map(wp => {
      let bestIdx = searchFrom;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let i = searchFrom; i < path.length; i++) {
        const distance = Math.hypot(path[i][0] - wp.lat, path[i][1] - wp.lng);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIdx = i;
        }
      }
      searchFrom = bestIdx;
      return bestIdx;
    });
  }

  private runSimulationTimer(): void {
    const frameMs = 1000 / 30;
    this.setBusMoving(true);
    this.simulationTimer = setInterval(() => {
      const path = this.simulationPath;
      this.simulationProgress += this.simulationStride;
      if (this.simulationProgress >= path.length - 1) {
        this.busMarker?.setLatLng(path[path.length - 1]);
        this.notifyReachedWaypoints(path.length - 1);
        const done = this.simulationDone;
        this.stopRouteSimulation();
        done?.();
        return;
      }

      const idx = Math.floor(this.simulationProgress);
      this.notifyReachedWaypoints(idx);
      const t = this.simulationProgress - idx;
      const a = path[idx];
      const b = path[Math.min(idx + 1, path.length - 1)];
      this.busMarker?.setLatLng([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t
      ]);
      this.rotateBus(this.getBearing(a, b));
    }, frameMs);
  }

  private notifyReachedWaypoints(pathIndex: number): void {
    while (
      this.simulationNextWaypoint < this.simulationWaypointIndices.length
      && pathIndex >= this.simulationWaypointIndices[this.simulationNextWaypoint]
    ) {
      this.simulationWaypointReached?.(this.simulationNextWaypoint);
      this.simulationNextWaypoint += 1;
    }
  }

  private clearSimulationState(): void {
    this.simulationPath = [];
    this.simulationWaypointIndices = [];
    this.simulationProgress = 0;
    this.simulationStride = 0;
    this.simulationNextWaypoint = 0;
    this.simulationDone = undefined;
    this.simulationWaypointReached = undefined;
  }

  private clearSimulationTimer(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  private hasSimulationState(): boolean {
    return !!this.simulationTimer || this.simulationPath.length > 0;
  }

  private setBusMoving(moving: boolean): void {
    const el = this.busMarker?.getElement();
    if (!el) return;
    el.querySelector('.sr-bus-pulse')?.classList.toggle('active', moving);
  }

  private rotateBus(deg: number): void {
    const wrap = this.busMarker?.getElement()?.querySelector('.sr-bus-wrap') as HTMLElement | null;
    if (wrap) wrap.style.transform = `rotate(${deg}deg)`;
  }

  private getBearing(a: L.LatLngTuple, b: L.LatLngTuple): number {
    const toRad = (d: number) => d * Math.PI / 180;
    const toDeg = (r: number) => r * 180 / Math.PI;
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const dLng = toRad(b[1] - a[1]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
      - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
}
