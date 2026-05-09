import {BaseEntity} from '../../../shared/domain/model/base-entity';

/**
 * Represents a route in the routing management domain model.
 */
export class Route implements BaseEntity {
  /**
   * The unique identifier for the route.
   */
  private _id: number;

  /**
   * The title of the route.
   */
  private _title: string;

  /**
   * The description of the route.
   */
  private _description: string;

  /**
   * Creates a new route entity.
   * @param props - Initialization values.
   */
  constructor(props: { id: number; title: string; description: string }) {
    this._id = props.id;
    this._title = props.title;
    this._description = props.description;
  }

  get id(): number {
    return this._id;
  }

  set id(value: number) {
    this._id = value;
  }

  get title(): string {
    return this._title;
  }

  set title(value: string) {
    this._title = value;
  }

  get description(): string {
    return this._description;
  }

  set description(value: string) {
    this._description = value;
  }
}
