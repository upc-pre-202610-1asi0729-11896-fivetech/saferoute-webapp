import { RouteWaypoint } from '../domain/model/route-entity';

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
  waypoints: RouteWaypoint[];
}

export interface RoutesResponse {
  routes: RouteResource[];
}
