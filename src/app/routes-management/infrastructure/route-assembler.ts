import { Route } from '../domain/model/route-entity';
import { RouteResource } from './route-response';

export class RouteAssembler {
  toEntityFromResource(r: RouteResource): Route {
    return new Route({
      id: r.id,
      name: r.name,
      type: r.type ?? 'OUTBOUND',
      status: r.status ?? 'ACTIVE',
      driverId: r.driverId ?? null,
      driverName: r.driverName ?? '',
      vehicleId: r.vehicleId ?? null,
      vehiclePlate: r.vehiclePlate ?? '',
      studentIds: r.studentIds ?? [],
      scheduledStartTime: r.scheduledStartTime ?? '',
      organizationId: r.organizationId ?? 1,
      waypoints: r.waypoints ?? []
    });
  }

  toEntitiesFromResponse(arr: RouteResource[]): Route[] {
    return arr.map(r => this.toEntityFromResource(r));
  }

  toResourceFromEntity(e: Route): RouteResource {
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
      driverId: e.driverId,
      driverName: e.driverName,
      vehicleId: e.vehicleId,
      vehiclePlate: e.vehiclePlate,
      studentIds: e.studentIds,
      scheduledStartTime: e.scheduledStartTime,
      organizationId: e.organizationId,
      waypoints: e.waypoints
    };
  }
}
