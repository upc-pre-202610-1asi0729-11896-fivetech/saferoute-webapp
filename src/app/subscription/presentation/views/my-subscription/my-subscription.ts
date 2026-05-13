import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionStore } from '../../../application/subscription-store';
import { AuthStore } from '../../../../iam/application/auth-store';

interface PlanFeature { label: string; }

@Component({
  selector: 'app-my-subscription',
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-subscription.html',
  styleUrl: './my-subscription.css'
})
export class MySubscription implements OnInit {
  protected store = inject(SubscriptionStore);
  protected auth  = inject(AuthStore);

  ngOnInit(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (orgId) {
      this.store.clear();               // reset stale data before fetching
      this.store.loadSubscription(orgId);
    }
  }

  remainingDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub) return 0;
    return Math.max(0, Math.ceil(
      (new Date(sub.endDate).getTime() - Date.now()) / 86_400_000
    ));
  });

  totalDays = computed(() => {
    const sub = this.store.subscription();
    if (!sub) return 30;
    const start = new Date(sub.startDate).getTime();
    const end   = new Date(sub.endDate).getTime();
    return Math.max(1, Math.ceil((end - start) / 86_400_000));
  });

  progressPct = computed(() =>
    Math.round((this.remainingDays() / this.totalDays()) * 100)
  );

  planLabel = computed(() => {
    const name = this.store.subscription()?.planName ?? '';
    if (name.toLowerCase().includes('basic'))        return 'Plan Básico';
    if (name.toLowerCase().includes('intermediate')) return 'Plan Intermedio';
    if (name.toLowerCase().includes('complete'))     return 'Plan Completo';
    return name || 'Plan Intermedio';
  });

  features = computed<string[]>(() => {
    const sub = this.store.subscription();
    const plan = this.store.plans().find(p => p.id === sub?.planId);
    if (plan?.features?.length) return plan.features;
    // defaults matching the screenshot
    return [
      '6 rutas activas', '6 conductores', 'Registro de alumnos',
      'Marcación de abordaje digital', 'Inicio y cierre de trayecto',
      'Reporte de incidencias', 'Bitácora de viajes',
      'Alertas de proximidad (US19)', 'Cámara en vivo del bus (US21)',
      'Historial de asistencia (US22)'
    ];
  });

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  cancel(): void {
    if (!confirm('¿Cancelar la suscripción activa?')) return;
    this.store.cancelSubscription();
  }
}
