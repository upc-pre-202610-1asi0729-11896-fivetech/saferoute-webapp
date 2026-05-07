/**
 * Minimal contract implemented by domain entities across bounded contexts.
 */
export interface BaseEntity {
  /**
   * Unique identifier for the entity.
   */
  id: number;
}
