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
        const pending = (data ?? []).find(s => s.state === 'PENDING');
        const current = active ?? pending;
        this._subscription.set(current ? this.subscriptionAssembler.toEntityFromResource(current, this._plans()) : null);
        if (!active && pending) {
          this.activateSubscription(pending.id);
          return;
        }
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

  subscribe(organizationId: number | string, onSuccess?: () => void, onError?: () => void): void {
    const plan = this._selectedPlan();
    if (!plan) {
      this._error.set('subscription.errors.no-plan-selected');
      onError?.();
      return;
    }
    this._loading.set(true);
    this.api.createSubscription(organizationId, plan.id).subscribe({
      next: sub => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(sub, this._plans()));
        this.activateSubscription(sub.id, onSuccess, onError);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
        onError?.();
      },
    });
  }

  upgradeSubscription(plan: PlanEntity, onSuccess?: () => void, onError?: () => void): void {
    const sub = this._subscription();
    if (!sub) {
      this.selectPlan(plan);
      onError?.();
      return;
    }
    this._loading.set(true);
    this._error.set(null);
    this.api.changePlan(sub.id, plan.id).subscribe({
      next: updated => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(updated, this._plans()));
        this._selectedPlan.set(plan);
        this._loading.set(false);
        onSuccess?.();
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
        onError?.();
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

  createFromCheckout(
    organizationId: number | string,
    planName: string,
    _priceStr: string,
    planTier?: string,
    onSuccess?: () => void,
    onError?: () => void
  ): void {
    if (!this._plans().length) {
      this._loading.set(true);
      this.api.getPlans().subscribe({
        next: data => {
          this._plans.set(this.planAssembler.toEntitiesFromResponse(data));
          this.createFromCheckout(organizationId, planName, _priceStr, planTier, onSuccess, onError);
        },
        error: err => {
          this._error.set(this.errorMessage(err));
          this._loading.set(false);
          onError?.();
        },
      });
      return;
    }
    const plan = this.findPlanForCheckout(planName, planTier) ?? this._plans()[0];
    if (!plan) {
      this._error.set('No hay planes cargados desde el backend real.');
      onError?.();
      return;
    }
    this.selectPlan(plan);
    this.subscribe(organizationId, onSuccess, onError);
  }

  upgradeFromCheckout(
    organizationId: number | string,
    planName: string,
    planTier?: string,
    onSuccess?: () => void,
    onError?: () => void
  ): void {
    if (!this._plans().length) {
      this._loading.set(true);
      this.api.getPlans().subscribe({
        next: data => {
          this._plans.set(this.planAssembler.toEntitiesFromResponse(data));
          this.upgradeFromCheckout(organizationId, planName, planTier, onSuccess, onError);
        },
        error: err => {
          this._error.set(this.errorMessage(err));
          this._loading.set(false);
          onError?.();
        },
      });
      return;
    }
    const plan = this.findPlanForCheckout(planName, planTier);
    if (!plan) {
      this._error.set('No se encontro el plan seleccionado en el backend real.');
      onError?.();
      return;
    }
    const current = this._subscription();
    if (current) {
      this.upgradeSubscription(plan, onSuccess, onError);
      return;
    }
    this._loading.set(true);
    this.api.getSubscriptionsByOrganization(organizationId).subscribe({
      next: data => {
        const active = (data ?? []).find(s => s.state === 'ACTIVE');
        if (!active) {
          this._selectedPlan.set(plan);
          this.subscribe(organizationId, onSuccess, onError);
          return;
        }
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(active, this._plans()));
        this.upgradeSubscription(plan, onSuccess, onError);
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
        onError?.();
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

  private activateSubscription(subscriptionId: string, onSuccess?: () => void, onError?: () => void): void {
    this.api.activateSubscription(subscriptionId).subscribe({
      next: activated => {
        this._subscription.set(this.subscriptionAssembler.toEntityFromResource(activated, this._plans()));
        this._loading.set(false);
        onSuccess?.();
      },
      error: err => {
        this._error.set(this.errorMessage(err));
        this._loading.set(false);
        onError?.();
      },
    });
  }

  private findPlanForCheckout(planName: string, planTier?: string): PlanEntity | undefined {
    const normalizedTier = this.normalizePlanKey(planTier ?? '');
    const normalizedName = planName.toLowerCase();
    const normalizedNameTier = this.normalizePlanKey(planName);
    return this._plans().find(p =>
      (normalizedTier && this.normalizePlanKey(p.tier ?? p.name) === normalizedTier) ||
      (normalizedNameTier && this.normalizePlanKey(p.tier ?? p.name) === normalizedNameTier) ||
      p.name.toLowerCase() === normalizedName ||
      p.tier?.toLowerCase() === normalizedName,
    );
  }

  private normalizePlanKey(value: string): string {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (normalized.includes('BASIC') || normalized.includes('BASICO')) return 'BASIC';
    if (normalized.includes('INTERMEDIATE') || normalized.includes('INTERMEDIO') || normalized.includes('STANDARD')) return 'INTERMEDIATE';
    if (normalized.includes('COMPLETE') || normalized.includes('COMPLETO') || normalized.includes('PREMIUM')) return 'COMPLETE';
    return normalized;
  }

  private errorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'No se pudo conectar con el backend de SafeRoute.';
    if (error.status === 401) return 'Sesion expirada o token invalido.';
    if (error.status === 403) return 'No tienes permisos para suscripciones.';
    return error.message || 'Error al consumir Subscription del backend.';
  }
}
