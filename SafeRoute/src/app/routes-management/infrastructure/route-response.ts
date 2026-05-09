import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a route.
 */
export interface RouteResource extends BaseResource {
  id: number;
  title: string;
  description: string;
}

/**
 * Response envelope for route collection queries.
 */
export interface RoutesResponse extends BaseResponse {
  routes: RouteResource[];
}
