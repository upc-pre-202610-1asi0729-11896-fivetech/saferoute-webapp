import { PlanEntity } from '../domain/model/plan-entity';
import { PlanResource } from './plan-response';

export class PlanAssembler {
  toEntityFromResource(resource: PlanResource): PlanEntity {
    const tier = this.toUiTier(resource.tier || resource.name.toUpperCase());
    return {
      id: resource.id as unknown as number,
      name: resource.name,
      tier,
      price: this.priceForTier(tier),
      maxRoutes: resource.routeLimit,
      maxDrivers: resource.driverLimit,
      advancedFeaturesEnabled: resource.advancedFeaturesEnabled,
      features: [
        `Hasta ${resource.routeLimit} rutas`,
        `Hasta ${resource.driverLimit} conductores`,
        resource.advancedFeaturesEnabled ? 'Funciones avanzadas' : 'Funciones basicas',
      ],
    };
  }

  toEntitiesFromResponse(resources: PlanResource[] | null | undefined): PlanEntity[] {
    return (resources ?? []).map(resource => this.toEntityFromResource(resource));
  }

  private priceForTier(tier: string): number {
    const normalized = tier.toUpperCase();
    if (normalized.includes('BASIC')) return 9.99;
    if (normalized.includes('COMPLETE') || normalized.includes('PREMIUM')) return 49.99;
    return 24.99;
  }

  private toUiTier(tier: string): string {
    const normalized = tier.toUpperCase();
    if (normalized === 'STANDARD') return 'INTERMEDIATE';
    if (normalized === 'PREMIUM') return 'COMPLETE';
    return normalized;
  }
}
