import { Component, computed, inject, signal } from '@angular/core';
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
      { label: 'Alertas de proximidad (US19)',      included: true  },
      { label: 'Cámara en vivo del bus (US21)',     included: true  },
      { label: 'Historial de asistencia (US22)',    included: true  },
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
      { label: 'Alertas de proximidad (US19)',      included: true  },
      { label: 'Cámara en vivo del bus (US21)',     included: true  },
      { label: 'Historial de asistencia (US22)',    included: true  },
      { label: 'GPS en tiempo real (US18/US45)',    included: true  },
    ]
  }
];

@Component({
  selector: 'app-plan-list',
  imports: [MatIconModule, MatProgressSpinnerModule],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.css'
})
export class PlanList {
  protected store = inject(SubscriptionStore);
  protected auth  = inject(AuthStore);

  billing = signal<'monthly' | 'annual'>('monthly');
  plans   = PLANS;

  currentPlanKey = computed(() => {
    const sub = this.store.subscription();
    const plan = this.store.plans().find(p => p.id === sub?.planId);
    if (!plan) return null;
    return plan.name.toUpperCase(); // BASIC | INTERMEDIATE | COMPLETE
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

  subscribe(plan: PlanConfig): void {
    const storeplan = this.store.plans().find(p => p.name.toUpperCase() === plan.key);
    if (!storeplan) return;
    this.store.selectPlan(storeplan);
    const orgId = this.auth.currentUser()?.organizationId;
    if (!orgId) return;
    this.store.subscribe(orgId);
  }
}
