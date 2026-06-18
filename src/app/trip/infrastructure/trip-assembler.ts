import { TripEntity } from '../domain/model/trip-entity';
import { RouteEntity, RouteWaypoint } from '../domain/model/route-entity';
import { TripResource, RouteResource, StopResource } from './trip-response';

/**
 * Maps the Java backend's lean Trip/Route resources to the front-end domain entities.
 *
 * <p>The backend uses {@code tripState} (IN_PROGRESS/COMPLETED/CANCELLED); the UI uses
 * {@code status} (EN_ROUTE/...). This assembler translates that and leaves the rich display fields
 * (routeName, studentsBoarded, etc.) to be enriched by the store from the loaded routes.</p>
 */
export class TripAssembler {
  /** Backend tripState -> UI status. */
  static toUiStatus(tripState: string): string {
    return tripState === 'IN_PROGRESS' ? 'EN_ROUTE' : tripState;
  }

  static toTripEntity(r: TripResource): TripEntity {
    return {
      id: r.id,
      routeId: r.routeId,
      driverId: r.driverId,
      organizationId: r.organizationId,
      status: TripAssembler.toUiStatus(r.tripState),
      startTime: r.startTime ?? null,
      endTime: r.endTime ?? null
    };
  }

  static toTripEntities(resources: TripResource[] | null | undefined): TripEntity[] {
    return (resources ?? []).map(r => TripAssembler.toTripEntity(r));
  }

  static toWaypoints(stops: StopResource[] | null | undefined): RouteWaypoint[] {
    return (stops ?? []).map(s => ({
      order: s.stopOrder, name: s.name, lat: s.latitude, lng: s.longitude, studentId: null
    }));
  }

  static toRouteEntity(r: RouteResource, waypoints: RouteWaypoint[] = []): RouteEntity {
    return {
      id: r.id,
      name: r.name,
      // Backend RouteType is OUTBOUND/INBOUND; the UI uses OUTBOUND/RETURN.
      type: r.type === 'INBOUND' ? 'RETURN' : 'OUTBOUND',
      driverId: r.driverId ?? 0,
      driverName: r.driverName ?? '',
      vehicleId: r.vehicleId ?? undefined,
      vehiclePlate: r.vehiclePlate ?? '',
      studentIds: r.studentIds ?? [],
      scheduledStartTime: r.scheduledStartTime ?? '',
      status: r.status ?? 'ACTIVE',
      organizationId: r.organizationId,
      waypoints
    };
  }
}
