export interface RouteWaypoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentId?: number | null;
}

export class Route {
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

  constructor(props: Partial<Route> & { id: number; name: string }) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type ?? 'OUTBOUND';
    this.status = props.status ?? 'ACTIVE';
    this.driverId = props.driverId ?? null;
    this.driverName = props.driverName ?? '';
    this.vehicleId = props.vehicleId ?? null;
    this.vehiclePlate = props.vehiclePlate ?? '';
    this.studentIds = props.studentIds ?? [];
    this.scheduledStartTime = props.scheduledStartTime ?? '';
    this.organizationId = props.organizationId ?? 1;
    this.waypoints = props.waypoints ?? [];
  }
}
