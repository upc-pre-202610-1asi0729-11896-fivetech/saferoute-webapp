import {BaseResource, BaseResponse} from './base-response';
import {BaseEntity} from './base-entity';

/**
 * Defines conversions between domain entities and API representations.
 *
 * @typeParam TEntity - Domain entity type.
 * @typeParam TResource - Resource type exchanged with endpoint operations.
 * @typeParam TResponse - Response envelope type returned by collection queries.
 */
export interface BaseAssembler<TEntity extends BaseEntity, TResource extends BaseResource, TResponse extends BaseResponse> {
  /**
   * Converts a resource to an entity.
   * @param resource - The resource to convert.
   * @returns The converted entity.
   */
  toEntityFromResource(resource: TResource): TEntity;

  /**
   * Converts an entity to a resource.
   * @param entity - The entity to convert.
   * @returns The converted resource.
   */
  toResourceFromEntity(entity: TEntity): TResource;

  /**
   * Converts a response envelope into a collection of domain entities.
   * @param response - Response payload returned by the API.
   * @returns Array of mapped domain entities.
   */
  toEntitiesFromResponse(response: TResponse): TEntity[];
}
