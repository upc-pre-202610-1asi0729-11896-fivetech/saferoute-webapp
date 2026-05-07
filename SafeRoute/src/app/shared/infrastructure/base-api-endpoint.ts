import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {BaseEntity} from '../domain/model/base-entity';
import {BaseResource, BaseResponse} from './base-response';
import {BaseAssembler} from './base-assembler';

/**
 * Provides generic CRUD operations for a single REST endpoint.
 * @typeParam TEntity Domain entity handled by the endpoint.
 * @typeParam TResource Resource representation exchanged with the API.
 * @typeParam TResponse Response envelope returned for collection queries.
 * @typeParam TAssembler Mapper that translates between entities and resources.
 */
export abstract class BaseApiEndpoint<
  TEntity extends BaseEntity,
  TResource extends BaseResource,
  TResponse extends BaseResponse,
  TAssembler extends BaseAssembler<TEntity, TResource, TResponse>
> {
  protected constructor(
    protected http: HttpClient,
    protected endpointUrl: string,
    protected assembler: TAssembler
  ) {}

  /**
   * Handles HTTP operations that failed.
   * @param operation Name of the operation that failed.
   * @returns An Observable that throws the error.
   */
  protected handleError(operation: string) {
    return (error: HttpErrorResponse): Observable<never> => {
      console.error(`\${operation} failed:`, error.message);
      return throwError(() => new Error(`API Error during \${operation}: \${error.message}`));
    };
  }

  /**
   * Retrieves all entities from the API endpoint.
   * @returns An observable containing an array of domain entities.
   */
  public getAll(): Observable<TEntity[]> {
    return this.http.get<TResponse>(this.endpointUrl).pipe(
      map(response => this.assembler.toEntitiesFromResponse(response)),
      catchError(this.handleError('getAll'))
    );
  }

  /**
   * Retrieves a single entity by its identifier.
   * @param id The unique identifier of the entity.
   * @returns An observable containing the requested domain entity.
   */
  public getById(id: number): Observable<TEntity> {
    return this.http.get<TResource>(`\${this.endpointUrl}/\${id}`).pipe(
      map(resource => this.assembler.toEntityFromResource(resource)),
      catchError(this.handleError(`getById id=\${id}`))
    );
  }

  /**
   * Creates a new entity on the API.
   * @param entity The domain entity to create.
   * @returns An observable containing the created domain entity.
   */
  public create(entity: TEntity): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.post<TResource>(this.endpointUrl, resource).pipe(
      map(createdResource => this.assembler.toEntityFromResource(createdResource)),
      catchError(this.handleError('create'))
    );
  }

  /**
   * Updates an existing entity on the API.
   * @param entity The domain entity with updated data.
   * @param id The unique identifier of the entity to update.
   * @returns An observable containing the updated domain entity.
   */
  public update(entity: TEntity, id: number): Observable<TEntity> {
    const resource = this.assembler.toResourceFromEntity(entity);
    return this.http.put<TResource>(`\${this.endpointUrl}/\${id}`, resource).pipe(
      map(updatedResource => this.assembler.toEntityFromResource(updatedResource)),
      catchError(this.handleError(`update id=\${id}`))
    );
  }

  /**
   * Deletes an entity from the API.
   * @param id The unique identifier of the entity to delete.
   * @returns An observable of void indicating successful deletion.
   */
  public delete(id: number): Observable<void> {
    return this.http.delete<void>(`\${this.endpointUrl}/\${id}`).pipe(
      catchError(this.handleError(`delete id=\${id}`))
    );
  }
}
