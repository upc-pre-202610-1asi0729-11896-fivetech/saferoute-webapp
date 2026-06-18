/**
 * Trip context's read-model of a route and its waypoints.
 *
 * <p>The Trip context needs route data to schedule and monitor trips (e.g. to draw the map and
 * build a trip from a route). It keeps its own lightweight model rather than depending on the
 * Fleet/Routes context, preserving bounded-context independence.</p>
 */
export interface RouteWaypoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentId?: number | null;
}

export interface RouteEntity {
  id: number;
  name: string;
  type?: string;
  driverId: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  studentIds?: number[];
  scheduledStartTime?: string;
  status?: string;
  organizationId?: number;
  waypoints?: RouteWaypoint[];
}
