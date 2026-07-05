import { computed, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PlanEntity } from '../domain/model/plan-entity';
import { SubscriptionEntity } from '../domain/model/subscription-entity';
import { SubscriptionManagementApi } from '../infrastructure/subscription-management-api';
import { PlanAssembler } from '../infrastructure/plan-assembler';
import { SubscriptionAssembler } from '../infrastructure/subscription-assembler';

@Injectable({ providedIn: 'root' })
export class SubscriptionStore {
  private readonly _plans = signal<PlanEntity[]>([]);
  private readonly _subscription = signal<SubscriptionEntity | null>(null);
  private readonly _selectedPlan = signal<PlanEntity | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly plans = this._plans.asReadonly();
  readonly subscription = this._subscription.asReadonly();
  readonly selectedPlan = this._selectedPlan.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly hasActiveSubscription = computed(() => this._subscription()?.status === 'ACTIVE');
  private readonly planAssembler = new PlanAssembler();
  private readonly subscriptionAssembler = new SubscriptionAssembler();

  constructor(private readonly api: SubscriptionManagementApi) {
    this.loadPlans();
  }

  loadPlans(): void {
    this._loading.set(true);
    this.api.getPlans().subscribe({
      next: data => {
        this._plans.set(this.planAssembler.toEntitiesFromResponse(data));
        const sub = this._subscription();
        if (sub) this._subscription.set(this.subscriptionAssembler.withPlanDetails(sub, this._plans()));
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  loadSubscription(organizationId: number | string): void {
    this._loading.set(true);
    this.api.getSubscriptionsByOrganization(organizationId).subscribe({
      next: data => {
        const active = (data ?? []).find(s => s.state === 'ACTIVE');
        this._subscription.set(active ? this.subscriptionAssembler.toEntityFromResource(active, this._plans()) : null);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  selectPlan(plan: PlanEntity): void {
    this._selectedPlan.set(plan);
  }

  subscribe(organizationId: number | string): void {
    const plan = this._selectedPlan();
    if (!plan) {
      this._error.set('subscription.errors.no-plan-selected');
      return;
    }
    this._loading.set(true);
    this.api.createSubscription(organizationId, plan.id).subscribe({
      next: sub => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(sub, this._plans()));
        this.activateSubscription(sub.id);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  upgradeSubscription(plan: PlanEntity): void {
    const sub = this._subscription();
    if (!sub) {
      this.selectPlan(plan);
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    this.api.changePlan(sub.id, plan.id).subscribe({
      next: updated => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(updated, this._plans()));
        this._selectedPlan.set(plan);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  cancelSubscription(): void {
    const sub = this._subscription();
    if (!sub) return;
    this.api.cancelSubscription(sub.id).subscribe({
      next: updated => this._subscription.set(this.subscriptionAssembler.toEntityFromResource(updated, this._plans())),
      error: err => this._error.set(this.errorMessage(err)),
    });
  }

  createFromCheckout(organizationId: number | string, planName: string, _priceStr: string, planTier?: string): void {
    const plan = this.findPlanForCheckout(planName, planTier) ?? this._plans()[0];
    if (!plan) {
      this._error.set('No hay planes cargados desde el backend real.');
      return;
    }
    this.selectPlan(plan);
    this.subscribe(organizationId);
  }

  upgradeFromCheckout(organizationId: number | string, planName: string, planTier?: string): void {
    const plan = this.findPlanForCheckout(planName, planTier);
    if (!plan) {
      this._error.set('No se encontro el plan seleccionado en el backend real.');
      return;
    }
    const current = this._subscription();
    if (current) {
      this.upgradeSubscription(plan);
      return;
    }
    this._loading.set(true);
    this.api.getSubscriptionsByOrganization(organizationId).subscribe({
      next: data => {
        const active = (data ?? []).find(s => s.state === 'ACTIVE');
        if (!active) {
          this._selectedPlan.set(plan);
          this.subscribe(organizationId);
          return;
        }
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(active, this._plans()));
        this.upgradeSubscription(plan);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  clear(): void {
    this._subscription.set(null);
    this._error.set(null);
  }

  clearError(): void {
    this._error.set(null);
  }

  private activateSubscription(subscriptionId: string): void {
    this.api.activateSubscription(subscriptionId).subscribe({
      next: activated => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(activated, this._plans()));
        this._loading.set(false);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
      },
    });
  }

  private findPlanForCheckout(planName: string, planTier?: string): PlanEntity | undefined {
    const normalizedTier = (planTier ?? '').toUpperCase();
    const normalizedName = planName.toLowerCase();
    return this._plans().find(p =>
      (normalizedTier && (p.tier ?? p.name).toUpperCase() === normalizedTier) ||
      p.name.toLowerCase() === normalizedName ||
      p.tier?.toLowerCase() === normalizedName,
    );
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el backend de SafeRoute.';
    if (error.status === 401) return 'Sesion expirada o token invalido.';
    if (error.status === 403) return 'No tienes permisos para suscripciones.';
    return error.message || 'Error al consumir Subscription del backend.';
  }
}
