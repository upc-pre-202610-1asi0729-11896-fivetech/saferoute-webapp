export interface RouteWaypoint {
  order: number;
  name: string;
  lat: number;
  lng: number;
  studentId?: number | null;
}

export class Route {
  private readonly _id: number;
  private _name: string;
  private _type: string;
  private _status: string;
  private _driverId: number | null;
  private _driverName: string;
  private _vehicleId: number | null;
  private _vehiclePlate: string;
  private _studentIds: number[];
  private _scheduledStartTime: string;
  private _organizationId: number;
  private _waypoints: RouteWaypoint[];

  constructor(props: Partial<Route> & { id: number; name: string }) {
    this._id = props.id;
    this._name = props.name;
    this._type = props.type ?? 'OUTBOUND';
    this._status = props.status ?? 'ACTIVE';
    this._driverId = props.driverId ?? null;
    this._driverName = props.driverName ?? '';
    this._vehicleId = props.vehicleId ?? null;
    this._vehiclePlate = props.vehiclePlate ?? '';
    this._studentIds = props.studentIds ?? [];
    this._scheduledStartTime = props.scheduledStartTime ?? '';
    this._organizationId = props.organizationId ?? 1;
    this._waypoints = props.waypoints ?? [];
  }

  get id(): number { return this._id; }
  get name(): string { return this._name; }
  set name(value: string) { this._name = value; }
  get type(): string { return this._type; }
  set type(value: string) { this._type = value; }
  get status(): string { return this._status; }
  set status(value: string) { this._status = value; }
  get driverId(): number | null { return this._driverId; }
  set driverId(value: number | null) { this._driverId = value; }
  get driverName(): string { return this._driverName; }
  set driverName(value: string) { this._driverName = value; }
  get vehicleId(): number | null { return this._vehicleId; }
  set vehicleId(value: number | null) { this._vehicleId = value; }
  get vehiclePlate(): string { return this._vehiclePlate; }
  set vehiclePlate(value: string) { this._vehiclePlate = value; }
  get studentIds(): number[] { return this._studentIds; }
  set studentIds(value: number[]) { this._studentIds = value; }
  get scheduledStartTime(): string { return this._scheduledStartTime; }
  set scheduledStartTime(value: string) { this._scheduledStartTime = value; }
  get organizationId(): number { return this._organizationId; }
  set organizationId(value: number) { this._organizationId = value; }
  get waypoints(): RouteWaypoint[] { return this._waypoints; }
  set waypoints(value: RouteWaypoint[]) { this._waypoints = value; }
}
