import { IncidentEntity } from '../domain/model/incident-entity';
import { IncidentResource } from './incident-response';

export class IncidentAssembler {
  toEntityFromResource(resource: IncidentResource): IncidentEntity {
    return {
      id: resource.id,
      tripId: resource.tripId,
      type: 'OTRO',
      severity: 'LOW',
      message: resource.description,
      description: resource.description,
      date: resource.reportedAt,
      status: 'OPEN',
    };
  }
}
