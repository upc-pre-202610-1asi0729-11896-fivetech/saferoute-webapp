import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionStore } from '../../../application/subscription-store';
import { AuthStore } from '../../../../iam/application/auth-store';

@Component({
  selector: 'app-my-subscription',
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-subscription.html',
  styleUrl: './my-subscription.css'
})
export class MySubscription implements OnInit {
  protected store = inject(SubscriptionStore);
  protected auth = inject(AuthStore);
  private router = inject(Router);

  ngOnInit(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (orgId) {
      this.store.clear();
      this.store.loadSubscription(orgId);
    }
  }

  currentPlan = computed(() => {
    const sub = this.store.subscription();
    return this.store.plans().find(plan => plan.id.toString() === sub?.planId?.toString()) ?? null;
  });

  upgradePlans = computed(() => {
    const current = this.currentPlan();
    return this.store.plans().filter(plan => !current || this.tierRank(plan.tier ?? plan.name) > this.tierRank(current.tier ?? current.name));
  });

  remainingDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub?.endDate) return 0;
    return Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000));
  });

  totalDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub?.startDate || !sub?.endDate) return 30;
    const start = new Date(sub.startDate).getTime();
    const end = new Date(sub.endDate).getTime();
    return Math.max(1, Math.ceil((end - start) / 86_400_000));
  });

  progressPct = computed(() => Math.max(0, Math.min(100, Math.round((this.remainingDays() / this.totalDays()) * 100))));

  planLabel = computed(() => this.currentPlan()?.name || this.store.subscription()?.planName || 'Plan activo');

  proratedCredit = computed(() => {
    const plan = this.currentPlan();
    if (!plan || !this.remainingDays()) return 0;
    return Number(((this.remainingDays() / this.totalDays()) * plan.price).toFixed(2));
  });

  features = computed<string[]>(() => {
    const plan = this.currentPlan();
    if (plan?.features?.length) return plan.features;
    return [
      'Rutas activas segun limite del plan',
      'Conductores segun limite del plan',
      'Registro de alumnos',
      'Marcacion de abordaje digital',
      'Inicio y cierre de trayecto',
      'Reporte de incidencias',
      'Notificaciones de abordaje',
    ];
  });

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  choosePlan(planId: number | string): void {
    const plan = this.store.plans().find(item => item.id.toString() === planId.toString());
    const orgId = this.auth.currentUser()?.organizationId;
    if (!plan || !orgId) return;
    const finalPrice = this.priceAfterCredit(plan) ?? plan.price.toFixed(2);
    this.router.navigate(['/checkout'], {
      queryParams: {
        mode: this.store.subscription() ? 'upgrade' : 'new',
        plan: plan.name,
        price: `$${finalPrice}`,
        tier: plan.tier ?? plan.name,
        orgId,
        credit: this.priceAfterCredit(plan) ? this.proratedCredit() : undefined,
      },
    });
  }

  priceAfterCredit(plan: { tier?: string; name: string; price: number }): string | null {
    const current = this.currentPlan();
    const currentTier = (current?.tier ?? current?.name ?? '').toUpperCase();
    const nextTier = (plan.tier ?? plan.name).toUpperCase();
    const credit = this.proratedCredit();
    if (!credit || this.tierRank(nextTier) <= this.tierRank(currentTier)) return null;
    return Math.max(0, plan.price - credit).toFixed(2);
  }

  private tierRank(tier: string): number {
    const normalized = tier.toUpperCase();
    if (normalized.includes('BASIC') || normalized.includes('BASICO')) return 1;
    if (normalized.includes('INTERMEDIATE') || normalized.includes('INTERMEDIO') || normalized.includes('STANDARD')) return 2;
    if (normalized.includes('COMPLETE') || normalized.includes('COMPLETO') || normalized.includes('PREMIUM')) return 3;
    return 0;
  }

  cancel(): void {
    if (!confirm('Cancelar la suscripcion activa?')) return;
    this.store.cancelSubscription();
  }
}
