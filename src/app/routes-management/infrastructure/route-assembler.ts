import { Route } from '../domain/model/route-entity';
import { RouteResource } from './route-response';

/**
 * Route type vocabulary differs between the UI and the backend:
 * the UI uses OUTBOUND/RETURN (recojo/retorno) while the backend RouteType is OUTBOUND/INBOUND.
 */
function toUiType(t?: string): string { return t === 'INBOUND' ? 'RETURN' : 'OUTBOUND'; }
function toBackendType(t?: string): string { return (t === 'RETURN' || t === 'INBOUND') ? 'INBOUND' : 'OUTBOUND'; }

/**
 * Maps route resources (flat wire format) to/from the Route domain entity.
 *
 * <p>Stops are not part of the route resource; they are loaded/saved separately via the stop
 * endpoints. {@code toEntityFromResource} therefore leaves {@code waypoints} empty — the API
 * endpoint populates them from {@code /routes/{id}/stops}.</p>
 */
export class RouteAssembler {
  toEntityFromResource(r: RouteResource): Route {
    return new Route({
      id: r.id,
      name: r.name,
      type: toUiType(r.type),
      status: r.status ?? 'ACTIVE',
      driverId: r.driverId ?? null,
      driverName: r.driverName ?? '',
      vehicleId: r.vehicleId ?? null,
      vehiclePlate: r.vehiclePlate ?? '',
      studentIds: r.studentIds ?? [],
      scheduledStartTime: r.scheduledStartTime ?? '',
      organizationId: r.organizationId ?? 1,
      waypoints: []
    });
  }

  toEntitiesFromResponse(arr: RouteResource[]): Route[] {
    return arr.map(r => this.toEntityFromResource(r));
  }

  toResourceFromEntity(e: Route): RouteResource {
    return {
      id: e.id,
      name: e.name,
      type: toBackendType(e.type),
      status: e.status,
      driverId: e.driverId,
      driverName: e.driverName,
      vehicleId: e.vehicleId,
      vehiclePlate: e.vehiclePlate,
      studentIds: e.studentIds,
      scheduledStartTime: e.scheduledStartTime,
      organizationId: e.organizationId
    };
  }
}
