import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { PlanEntity } from '../domain/model/plan-entity';
import { SubscriptionEntity } from '../domain/model/subscription-entity';

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

  private readonly plansUrl = `${environment.platformProviderApiBaseUrl}/plans`;
  private readonly subscriptionsUrl = `${environment.platformProviderApiBaseUrl}/subscriptions`;

  constructor(private http: HttpClient) {
    this.loadPlans();
  }

  loadPlans(): void {
    this._loading.set(true);
    this.http.get<PlanEntity[]>(this.plansUrl)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: data => {
          this._plans.set(Array.isArray(data) ? data : this.defaultPlans());
          this._loading.set(false);
        },
        error: () => {
          this._plans.set(this.defaultPlans());
          this._loading.set(false);
        }
      });
  }

  loadSubscription(organizationId: number): void {
    this._loading.set(true);
    this.http.get<SubscriptionEntity[]>(`${this.subscriptionsUrl}?organizationId=${organizationId}`)
      .subscribe({
        next: data => {
          const active = (Array.isArray(data) ? data : []).find(s => s.status === 'ACTIVE');
          this._subscription.set(active ?? null);
          this._loading.set(false);
        },
        error: () => { this._loading.set(false); }
      });
  }

  selectPlan(plan: PlanEntity): void {
    this._selectedPlan.set(plan);
  }

  subscribe(organizationId: number): void {
    const plan = this._selectedPlan();
    if (!plan) { this._error.set('subscription.errors.no-plan-selected'); return; }
    this._loading.set(true);
    const payload = {
      planId: plan.id,
      organizationId,
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    this.http.post<SubscriptionEntity>(this.subscriptionsUrl, payload).subscribe({
      next: sub => {
        this._subscription.set(sub);
        this._loading.set(false);
      },
      error: err => {
        this._error.set(err.message ?? 'Failed to subscribe');
        this._loading.set(false);
      }
    });
  }

  cancelSubscription(): void {
    const sub = this._subscription();
    if (!sub) return;
    this.http.patch<SubscriptionEntity>(`${this.subscriptionsUrl}/${sub.id}`, { status: 'CANCELLED' }).subscribe({
      next: updated => this._subscription.set(updated),
      error: err => this._error.set(err.message ?? 'Failed to cancel subscription')
    });
  }

  /** Called after a successful PayPal checkout to persist the subscription */
  createFromCheckout(organizationId: number, planName: string, priceStr: string): void {
    const planId = planName.toLowerCase().includes('sico') ? 1
      : planName.toLowerCase().includes('termedio') ? 2 : 3;
    const start = new Date().toISOString().split('T')[0];
    const end   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const payload = {
      organizationId,
      planId,
      planName,
      planPrice: parseFloat(priceStr) || 9.99,
      status: 'ACTIVE',
      startDate: start,
      endDate: end,
    };
    this.http.post<SubscriptionEntity>(this.subscriptionsUrl, payload).subscribe({
      next: sub => this._subscription.set(sub),
      error: () => { /* non-blocking — user can still log in */ }
    });
  }

  clear(): void {
    this._subscription.set(null);
    this._error.set(null);
  }

  clearError(): void { this._error.set(null); }

  private defaultPlans(): PlanEntity[] {
    return [
      { id: 1, name: 'BASIC', price: 99, maxRoutes: 3, maxDrivers: 5, features: ['Up to 3 routes', 'Up to 5 drivers', 'Basic support'] },
      { id: 2, name: 'INTERMEDIATE', price: 199, maxRoutes: 10, maxDrivers: 15, features: ['Up to 10 routes', 'Up to 15 drivers', 'Priority support', 'Real-time tracking'] },
      { id: 3, name: 'COMPLETE', price: 349, maxRoutes: 999, maxDrivers: 999, features: ['Unlimited routes', 'Unlimited drivers', '24/7 support', 'Advanced analytics'] }
    ];
  }
}
