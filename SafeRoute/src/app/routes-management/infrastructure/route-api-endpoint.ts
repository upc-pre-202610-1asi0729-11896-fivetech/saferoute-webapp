import {BaseApiEndpoint} from '../../shared/infrastructure/base-api-endpoint';
import {Route} from '../domain/model/route-entity';
import {RouteResource, RoutesResponse} from './route-response';
import {RouteAssembler} from './route-assembler';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

/**
 * Endpoint client for route CRUD operations.
 */
export class RouteApiEndpoint extends BaseApiEndpoint<Route, RouteResource, RoutesResponse, RouteAssembler> {
  constructor(http: HttpClient) {
    super(http, `${environment.platformProviderApiBaseUrl}${environment.platformProviderRoutesEndpointPath}`, new RouteAssembler());
  }
}
