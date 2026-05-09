import {BaseApiEndpoint} from '../../shared/infrastructure/base-api-endpoint';
import {Stop} from '../domain/model/stop-entity';
import {StopResource, StopsResponse} from './stop-response';
import {StopAssembler} from './stop-assembler';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

/**
 * Endpoint client for stop CRUD operations.
 */
export class StopApiEndpoint extends BaseApiEndpoint<Stop, StopResource, StopsResponse, StopAssembler> {
  constructor(http: HttpClient) {
    super(http, `${environment.platformProviderApiBaseUrl}${environment.platformProviderStopsEndpointPath}`, new StopAssembler());
  }
}
