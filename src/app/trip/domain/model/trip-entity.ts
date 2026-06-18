/**
 * Trip domain entity for the Trip Execution & Monitoring bounded context.
 *
 * <p>Represents a single run of a route by a driver, with its boarding progress and lifecycle
 * status. This is the context's aggregate model; it lives in the domain layer and is mapped to/from
 * the transport resource by the infrastructure assembler.</p>
 */
export interface TripEntity {
  id: number;
  routeId: number;
  routeName?: string;
  driverId: number;
  driverName?: string;
  vehicleId?: number;
  vehiclePlate?: string;
  studentIds?: number[];
  tripType?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  status: string;
  startTime?: string | null;
  endTime?: string | null;
  studentsTotal?: number;
  studentsBoarded?: number;
  currentStop?: string | null;
  currentLocation?: string | null;
  organizationId?: number;
}
