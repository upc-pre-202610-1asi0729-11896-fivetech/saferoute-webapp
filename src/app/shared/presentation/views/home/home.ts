import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../../../iam/application/auth-store';
import { Role } from '../../../../iam/domain/model/role-enum';
import { HomeDashboardStore } from '../../../application/home-dashboard-store';

interface DashboardCard {
  label: string;
  desc: string;
  icon: string;
  route: string;
}

interface Metric {
  icon: string;
  value: number;
  label: string;
}

@Component({
  selector: 'app-home',
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  protected auth = inject(AuthStore);
  protected dashboard = inject(HomeDashboardStore);
  private router = inject(Router);

  ngOnInit(): void {
    this.dashboard.load(this.auth.currentUser()?.organizationId);
  }

  roleIcon = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) return 'shield';
    if (role === Role.DRIVER) return 'directions_bus';
    if (role === Role.PARENT) return 'favorite';
    return 'person';
  });

  roleLabel = computed(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) return 'home.role.admin';
    if (role === Role.DRIVER) return 'home.role.driver';
    if (role === Role.PARENT) return 'home.role.parent';
    return 'home.role.guest';
  });

  metrics = computed<Metric[]>(() => {
    const user = this.auth.currentUser();
    const role = user?.role;
    const trips = this.dashboard.trips();
    const routes = this.dashboard.routes();

    if (role === Role.DRIVER) {
      const myRoutes = routes.filter(r => r.driverId === user?.id);
      const myTrips  = trips.filter(t => t.driverId === user?.id);
      return [
        { icon: 'route',           value: myRoutes.length,                                                     label: 'home.metrics.my-routes' },
        { icon: 'directions_bus',  value: myTrips.filter(t => t.status === 'EN_ROUTE').length,               label: 'home.metrics.trips-active' },
        { icon: 'group',           value: myRoutes.reduce((s, r) => s + (r.studentIds?.length || 0), 0),     label: 'home.metrics.students-served' }
      ];
    }

    if (role === Role.PARENT) {
      const me = this.dashboard.parents().find(p => p.email === user?.email || p.email === user?.email);
      const kids = me ? this.dashboard.children().filter(c => c.parentId === me.id) : [];
      const kidIds = kids.map(c => c.id);
      const liveTrips = trips.filter(t => t.status === 'EN_ROUTE' && kidIds.some(id => (t.studentIds || []).includes(id)));
      const assignedRoutes = routes.filter(r => r.studentIds?.some((id: number | string) => kidIds.map(String).includes(String(id))));
      return [
        { icon: 'school',          value: kids.length,           label: 'home.metrics.my-children' },
        { icon: 'directions_bus',  value: liveTrips.length,      label: 'home.metrics.trips-active' },
        { icon: 'route',           value: assignedRoutes.length, label: 'home.metrics.routes-assigned' }
      ];
    }

    // ADMIN (default)
    return [
      { icon: 'route',           value: routes.length,                                          label: 'home.metrics.routes' },
      { icon: 'directions_bus',  value: trips.filter(t => t.status === 'EN_ROUTE').length,    label: 'home.metrics.trips-in-route' },
      { icon: 'group',           value: this.dashboard.users().length,                        label: 'home.metrics.users' }
    ];
  });

  cards = computed<DashboardCard[]>(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) return [
      { label: 'home.admin.register-drivers',  desc: 'home.admin.register-drivers-desc',  icon: 'badge',     route: '/stakeholder/profiles' },
      { label: 'home.admin.register-routes',   desc: 'home.admin.register-routes-desc',   icon: 'route',     route: '/routes-management/routes' },
      { label: 'home.admin.register-students', desc: 'home.admin.register-students-desc', icon: 'school',    route: '/stakeholder/profiles' },
      { label: 'home.admin.register-parent',   desc: 'home.admin.register-parent-desc',            icon: 'group',     route: '/stakeholder/profiles' },
      { label: 'option.subscription',      desc: 'home.admin.subscription-desc',        icon: 'workspace_premium', route: '/subscription/status' }
    ];
    if (role === Role.DRIVER) return [
      { label: 'home.driver.trips',  desc: 'home.driver.trips-desc',  icon: 'directions_bus', route: '/trip/list' },
      { label: 'home.driver.alerts', desc: 'home.driver.alerts-desc', icon: 'notifications',  route: '/notifications/alerts' }
    ];
    if (role === Role.PARENT) return [
      { label: 'home.parent.my-child',         desc: 'home.parent.my-child-desc',         icon: 'favorite',      route: '/trip/tracking' },
      { label: 'home.parent.incident-report',  desc: 'home.parent.incident-report-desc', icon: 'warning',       route: '/notifications/alerts' },
      { label: 'home.parent.check-assistance', desc: 'home.parent.check-assistance-desc',     icon: 'check_circle',  route: '/trip/attendance' }
    ];
    return [];
  });

  navigate(route: string): void {
    this.router.navigate([route]).then();
  }
}
