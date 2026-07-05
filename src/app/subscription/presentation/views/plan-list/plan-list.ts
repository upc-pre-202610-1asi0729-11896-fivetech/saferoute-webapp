import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionStore } from '../../../application/subscription-store';
import { AuthStore } from '../../../../iam/application/auth-store';

interface PlanFeatureRow {
  label: string;
  included: boolean;
}

interface PlanConfig {
  key: string;                   // BASIC | INTERMEDIATE | COMPLETE
  icon: string;
  iconColor: string;
  name: string;
  subtitle: string;
  price: number;
  popular?: boolean;
  badge?: string;
  features: PlanFeatureRow[];
}

const PLANS: PlanConfig[] = [
  {
    key: 'BASIC', icon: 'shield', iconColor: '#94a3b8',
    name: 'Básico',
    subtitle: 'Ideal para grupos pequeños de padres organizados',
    price: 9.99,
    features: [
      { label: 'Hasta 2 rutas activas',            included: true  },
      { label: 'Hasta 2 conductores',              included: true  },
      { label: 'Registro de alumnos',              included: true  },
      { label: 'Marcación de abordaje digital',    included: true  },
      { label: 'Inicio y cierre de trayecto',      included: true  },
      { label: 'Reporte de incidencias',           included: true  },
      { label: 'Bitácora de viajes',               included: true  },
      { label: 'Notificaciones de abordaje',       included: true  },
      { label: 'Alertas de proximidad',            included: false },
      { label: 'Cámara en vivo del bus',           included: false },
      { label: 'Historial de asistencia mensual',  included: false },
      { label: 'GPS en tiempo real',               included: false },
    ]
  },
  {
    key: 'INTERMEDIATE', icon: 'star', iconColor: '#F59E0B',
    name: 'Intermedio',
    subtitle: 'Para flotas medianas que buscan mayor visibilidad',
    price: 24.99,
    popular: true,
    features: [
      { label: 'Hasta 6 rutas activas',            included: true  },
      { label: 'Hasta 6 conductores',              included: true  },
      { label: 'Registro de alumnos',              included: true  },
      { label: 'Marcación de abordaje digital',    included: true  },
      { label: 'Inicio y cierre de trayecto',      included: true  },
      { label: 'Reporte de incidencias',           included: true  },
      { label: 'Bitácora de viajes',               included: true  },
      { label: 'Notificaciones de abordaje',       included: true  },
      { label: 'Alertas de proximidad',      included: true  },
      { label: 'Cámara en vivo del bus',     included: true  },
      { label: 'Historial de asistencia',    included: true  },
      { label: 'GPS en tiempo real',               included: false },
    ]
  },
  {
    key: 'COMPLETE', icon: 'verified', iconColor: '#64748b',
    name: 'Completo',
    subtitle: 'Solución total para empresas de transporte escolar',
    price: 49.99,
    badge: 'Todo incluido',
    features: [
      { label: 'Hasta 20 rutas activas',           included: true  },
      { label: 'Hasta 20 conductores',             included: true  },
      { label: 'Registro de alumnos',              included: true  },
      { label: 'Marcación de abordaje digital',    included: true  },
      { label: 'Inicio y cierre de trayecto',      included: true  },
      { label: 'Reporte de incidencias',           included: true  },
      { label: 'Bitácora de viajes',               included: true  },
      { label: 'Notificaciones de abordaje',       included: true  },
      { label: 'Alertas de proximidad',      included: true  },
      { label: 'Cámara en vivo del bus',     included: true  },
      { label: 'Historial de asistencia',    included: true  },
      { label: 'GPS en tiempo real',    included: true  },
    ]
  }
];

const PLAN_ORDER: Record<string, number> = { BASIC: 1, INTERMEDIATE: 2, STANDARD: 2, COMPLETE: 3, PREMIUM: 3 };

@Component({
  selector: 'app-plan-list',
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.css'
})
export class PlanList implements OnInit {
  protected store = inject(SubscriptionStore);
  protected auth  = inject(AuthStore);
  private router = inject(Router);

  billing = signal<'monthly' | 'annual'>('monthly');
  plans   = PLANS;

  ngOnInit(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (orgId) this.store.loadSubscription(orgId);
  }

  currentPlanKey = computed(() => {
    const sub = this.store.subscription();
    const plan = this.store.plans().find(p => p.id.toString() === sub?.planId?.toString());
    if (!plan) return null;
    return (plan.tier ?? plan.name).toUpperCase();
  });

  remainingDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub?.endDate) return 0;
    return Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000));
  });

  totalDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub?.startDate || !sub?.endDate) return 30;
    return Math.max(1, Math.ceil((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / 86_400_000));
  });

  proratedCredit = computed(() => {
    const sub = this.store.subscription();
    const currentPlan = this.store.plans().find(p => p.id.toString() === sub?.planId?.toString());
    if (!currentPlan || !this.remainingDays()) return 0;
    return Number(((this.remainingDays() / this.totalDays()) * currentPlan.price).toFixed(2));
  });

  annualPrice(monthly: number): string {
    return (monthly * 12 * 0.8).toFixed(2);
  }

  displayPrice(monthly: number): string {
    const p = this.billing() === 'annual' ? monthly * 0.8 : monthly;
    return p.toFixed(2);
  }

  annualSaving(monthly: number): string {
    return (monthly * 12 - monthly * 12 * 0.8).toFixed(2);
  }

  isCurrentPlan(key: string): boolean {
    return this.currentPlanKey() === key;
  }

  canChoosePlan(key: string): boolean {
    const current = this.currentPlanKey();
    if (!current) return true;
    return (PLAN_ORDER[key] ?? 0) > (PLAN_ORDER[current] ?? 0);
  }

  planActionLabel(plan: PlanConfig): string {
    if (this.isCurrentPlan(plan.key)) return 'Plan Actual';
    if (!this.canChoosePlan(plan.key)) return 'No disponible para upgrade';
    return this.store.subscription() ? 'Upgradear ahora' : 'Contratar ahora';
  }

  priceAfterCredit(plan: PlanConfig): string | null {
    const current = this.currentPlanKey();
    const credit = this.proratedCredit();
    if (!current || !credit || !this.canChoosePlan(plan.key)) return null;
    return Math.max(0, Number(this.displayPrice(plan.price)) - credit).toFixed(2);
  }

  subscribe(plan: PlanConfig): void {
    if (!this.canChoosePlan(plan.key)) return;
    const storeplan = this.store.plans().find(p => (p.tier ?? p.name).toUpperCase() === plan.key);
    if (!storeplan) return;
    const orgId = this.auth.currentUser()?.organizationId;
    if (!orgId) return;
    const finalPrice = this.priceAfterCredit(plan) ?? this.displayPrice(plan.price);
    this.router.navigate(['/checkout'], {
      queryParams: {
        mode: this.store.subscription() ? 'upgrade' : 'new',
        plan: storeplan.name,
        price: `$${finalPrice}`,
        tier: plan.key,
        orgId,
        credit: this.priceAfterCredit(plan) ? this.proratedCredit() : undefined,
      },
    });
  }
}
