export interface PlanResource {
  id: string;
  name: string;
  tier: string;
  routeLimit: number;
  driverLimit: number;
  advancedFeaturesEnabled: boolean;
}
