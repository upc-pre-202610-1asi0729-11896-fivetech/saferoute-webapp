import {BaseAssembler} from '../../shared/infrastructure/base-assembler';
import {Route} from '../domain/model/route-entity';
import {RouteResource, RoutesResponse} from './route-response';

/**
 * Maps route entities to and from API resources.
 */
export class RouteAssembler implements BaseAssembler<Route, RouteResource, RoutesResponse> {
  toEntitiesFromResponse(response: RoutesResponse): Route[] {
    return response.routes.map(resource => this.toEntityFromResource(resource as RouteResource));
  }

  toEntityFromResource(resource: RouteResource): Route {
    return new Route({
      id: resource.id,
      title: resource.title,
      description: resource.description
    });
  }

  toResourceFromEntity(entity: Route): RouteResource {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description
    } as RouteResource;
  }
}
