import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {Stop} from '../domain/model/stop-entity';
import {StopResource, StopsResponse} from './stop-response';

/**
 * Maps stop entities to and from API resources.
 */
export class StopAssembler implements BaseAssembler<Stop, StopResource, StopsResponse> {
  toEntitiesFromResponse(response: StopsResponse): Stop[] {
    return response.stops.map(resource => this.toEntityFromResource(resource as StopResource));
  }

  toEntityFromResource(resource: StopResource): Stop {
    return new Stop({
      id: resource.id,
      location: resource.location,
      time: resource.time,
      routeId: resource.routeId
    });
  }

  toResourceFromEntity(entity: Stop): StopResource {
    return {
      id: entity.id,
      location: entity.location,
      time: entity.time,
      routeId: entity.routeId
    } as StopResource;
  }
}
