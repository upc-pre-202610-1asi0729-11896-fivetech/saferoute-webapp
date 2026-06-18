/**
 * Transport-layer resources (wire format) for the Trip context — the SHAPES THE JAVA BACKEND uses.
 *
 * <p>The backend Trip is a clean DDD aggregate, so its resources are lean. The front-end's richer
 * display model (routeName, studentsBoarded, etc.) is derived in the store by joining with routes.</p>
 */

/** Trip resource returned by the backend (lean DDD shape). */
export interface TripResource {
  id: number;
  organizationId: number;
  routeId: number;
  driverId: number;
  tripState: string;            // IN_PROGRESS | COMPLETED | CANCELLED
  startTime: string | null;
  endTime: string | null;
}

/** Attendance (per-child boarding) resource. */
export interface AttendanceResource {
  id: number;
  tripId: number;
  childId: number;
  boardingState: string;        // PENDING | BOARDED | ABSENT | DROPPED_OFF
  boardedAt: string | null;
}

/** Incident resource. */
export interface IncidentResource {
  id: number;
  tripId: number;
  description: string;
  reportedAt: string | null;
}

/** Route resource as served by the Java backend (flat, no nested waypoints). */
export interface RouteResource {
  id: number;
  name: string;
  type?: string;
  status?: string;
  driverId: number | null;
  driverName?: string;
  vehicleId?: number | null;
  vehiclePlate?: string;
  studentIds?: number[];
  scheduledStartTime?: string;
  organizationId?: number;
}

/** Stop resource served by /routes/{id}/stops. */
export interface StopResource {
  id: number;
  routeId: number;
  name: string;
  latitude: number;
  longitude: number;
  stopOrder: number;
}

/** Request bodies (backend use-case contracts). */
export interface StartTripRequest { organizationId: number; routeId: number; driverId: number; }
export interface UpdateBoardingRequest { childId: number; boardingState: string; }
export interface ReportIncidentRequest { description: string; }
