export interface IncidentEntity {
  id: number | string;
  type: string;
  severity: string;
  message: string;
  description?: string;
  date: string;
  tripId?: number | string;
  status?: 'OPEN' | 'RESOLVED';
}
