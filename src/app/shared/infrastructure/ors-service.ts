import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
  order?: number;
}

export interface RoadRoute {
  path: [number, number][];
  wayPointIndices: number[];
}

@Injectable({ providedIn: 'root' })
export class OrsService {
  private readonly base = environment.orsBaseUrl;
  private readonly key  = environment.orsApiKey;
  private readonly cache = new Map<string, RoadRoute>();

  async fetchRoadRoute(waypoints: Waypoint[]): Promise<RoadRoute> {
    if (!waypoints || waypoints.length < 2) {
      return {
        path: waypoints.map(w => [w.lat, w.lng]),
        wayPointIndices: waypoints.map((_, i) => i)
      };
    }

    const cacheKey = waypoints
      .map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`)
      .join('|');
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // ORS uses [lng, lat] order in the request
    const coordinates = waypoints.map(w => [w.lng, w.lat]);

    const res = await fetch(
      `${this.base}/v2/directions/driving-car/geojson`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json',
        },
        body: JSON.stringify({ coordinates }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[ORS] ${res.status} ${res.statusText}`, text);
      throw new Error(`ORS ${res.status}`);
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) throw new Error('ORS: no features in response');

    // ORS returns [lng, lat]; Leaflet needs [lat, lng]
    const path: [number, number][] = feature.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    const wayPointIndices: number[] =
      feature.properties?.way_points ?? waypoints.map((_, i) => i);

    const result: RoadRoute = { path, wayPointIndices };
    this.cache.set(cacheKey, result);
    return result;
  }
}
