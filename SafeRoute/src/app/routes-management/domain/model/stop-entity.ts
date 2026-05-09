import {BaseEntity} from '../../../shared/domain/model/base-entity';
import {Route} from './route-entity';

/**
 * Represents a stop in the routing management domain model.
 */
export class Stop implements BaseEntity {
  private _id: number;
  private _location: string;
  private _time: string;
  private _routeId: number;
  private _route: Route | null;

  /**
   * Creates a new stop entity.
   * @param props - Initialization values.
   */
  constructor(props: { id: number; location: string; time: string; routeId: number; route?: Route | null }) {
    this._id = props.id;
    this._location = props.location;
    this._time = props.time;
    this._routeId = props.routeId;
    this._route = props.route ?? null;
  }

  get id(): number {
    return this._id;
  }

  set id(value: number) {
    this._id = value;
  }

  get location(): string {
    return this._location;
  }

  set location(value: string) {
    this._location = value;
  }

  get time(): string {
    return this._time;
  }

  set time(value: string) {
    this._time = value;
  }

  get routeId(): number {
    return this._routeId;
  }

  set routeId(value: number) {
    this._routeId = value;
  }

  get route(): Route | null {
    return this._route;
  }

  set route(value: Route | null) {
    this._route = value;
  }
}
