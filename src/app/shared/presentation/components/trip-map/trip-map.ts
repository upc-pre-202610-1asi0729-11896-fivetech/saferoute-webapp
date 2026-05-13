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
    if (this.map && (changes['waypoints'] || changes['currentStop'])) this.render();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  /** Public: get the map instance for advanced use cases */
  getMap(): L.Map | null { return this.map; }
  /** Public: returns the current bus marker */
  getBusMarker(): L.Marker | null { return this.busMarker; }
  /** Public: move bus to a position */
  moveBus(pos: L.LatLngTuple): void { this.busMarker?.setLatLng(pos); }

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
}
