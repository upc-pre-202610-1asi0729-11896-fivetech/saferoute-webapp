import {BaseResource, BaseResponse} from '../../shared/infrastructure/base-response';

/**
 * Resource representation of a stop.
 */
export interface StopResource extends BaseResource {
  id: number;
  location: string;
  time: string;
  routeId: number;
}

/**
 * Response envelope for stop collection queries.
 */
export interface StopsResponse extends BaseResponse {
  stops: StopResource[];
}
