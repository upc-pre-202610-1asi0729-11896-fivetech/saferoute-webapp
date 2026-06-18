/**
 * Wire-format resources for the routes-management context.
 *
 * <p>The route resource is flat and does NOT nest the stops: stops are exchanged separately via the
 * dedicated {@code /routes/{id}/stops} endpoints, represented by {@link StopResource}.</p>
 */
export interface RouteResource {
  id: number;
  name: string;
  type: string;
  status: string;
  driverId: number | null;
  driverName: string;
  vehicleId: number | null;
  vehiclePlate: string;
  studentIds: number[];
  scheduledStartTime: string;
  organizationId: number;
}

export interface RoutesResponse {
  routes: RouteResource[];
}

/** Stop resource exchanged with the /routes/{id}/stops endpoints. */
export interface StopResource {
  id: number;
  routeId: number;
  name: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}
