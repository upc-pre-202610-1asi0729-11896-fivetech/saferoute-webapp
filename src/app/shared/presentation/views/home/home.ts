import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStore } from '../../../../iam/application/auth-store';
import { Role } from '../../../../iam/domain/model/role-enum';
import { environment } from '../../../../../environments/environment';

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
  private router = inject(Router);
  private http = inject(HttpClient);

  private routes = signal<any[]>([]);
  private trips = signal<any[]>([]);
  private users = signal<any[]>([]);
  private parents = signal<any[]>([]);
  private children = signal<any[]>([]);

  ngOnInit(): void {
    const base  = environment.platformProviderApiBaseUrl;
    const orgId = this.auth.currentUser()?.organizationId;
    const q     = orgId ? `?organizationId=${orgId}` : '';
    forkJoin({
      routes:   this.http.get<any[]>(`${base}/routes${q}`).pipe(catchError(() => of([]))),
      trips:    this.http.get<any[]>(`${base}/trips${q}`).pipe(catchError(() => of([]))),
      users:    this.http.get<any[]>(`${base}/users${q}`).pipe(catchError(() => of([]))),
      parents:  this.http.get<any[]>(`${base}/parents${q}`).pipe(catchError(() => of([]))),
      children: this.http.get<any[]>(`${base}/children${q}`).pipe(catchError(() => of([])))
    }).subscribe(d => {
      this.routes.set(d.routes ?? []);
      this.trips.set(d.trips ?? []);
      this.users.set(d.users ?? []);
      this.parents.set(d.parents ?? []);
      this.children.set(d.children ?? []);
    });
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
    const trips = this.trips();
    const routes = this.routes();

    if (role === Role.DRIVER) {
      const myRoutes = routes.filter(r => r.driverId === user?.id);
      const myTrips  = trips.filter(t => t.driverId === user?.id);
      return [
        { icon: 'route',           value: myRoutes.length,                                                     label: 'My Routes' },
        { icon: 'directions_bus',  value: myTrips.filter(t => t.status === 'EN_ROUTE').length,               label: 'Trips Active' },
        { icon: 'group',           value: myRoutes.reduce((s, r) => s + (r.studentIds?.length || 0), 0),     label: 'Students Served' }
      ];
    }

    if (role === Role.PARENT) {
      const me = this.parents().find(p => p.email === user?.email);
      const kids = me ? this.children().filter(c => c.parentId === me.id) : [];
      const kidIds = kids.map(c => c.id);
      const liveTrips = trips.filter(t => t.status === 'EN_ROUTE' && kidIds.some(id => (t.studentIds || []).includes(id)));
      const assignedRoutes = routes.filter(r => r.studentIds?.some((id: number) => kidIds.includes(id)));
      return [
        { icon: 'school',          value: kids.length,           label: 'My Children' },
        { icon: 'directions_bus',  value: liveTrips.length,      label: 'Trips Active' },
        { icon: 'route',           value: assignedRoutes.length, label: 'Routes Assigned' }
      ];
    }

    // ADMIN (default)
    return [
      { icon: 'route',           value: routes.length,                                          label: 'Routes' },
      { icon: 'directions_bus',  value: trips.filter(t => t.status === 'EN_ROUTE').length,    label: 'Trips in Route' },
      { icon: 'group',           value: this.users().length,                                  label: 'Users' }
    ];
  });

  cards = computed<DashboardCard[]>(() => {
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) return [
      { label: 'Register Drivers',  desc: 'Gestiona conductores: licencias, vehículo asignado y estado.', icon: 'badge',     route: '/stakeholder/profiles' },
      { label: 'Register Routes',   desc: 'Crea rutas con paradas, conductor, vehículo y horario.',       icon: 'route',     route: '/routes-management/routes' },
      { label: 'Register Students', desc: 'Registra alumnos y vincúlalos con sus padres.',                icon: 'school',    route: '/stakeholder/profiles' },
      { label: 'Register Parent',   desc: 'Administra padres de familia y datos de contacto.',            icon: 'group',     route: '/stakeholder/profiles' },
      { label: 'Subscription',      desc: 'Visualiza y gestiona el plan de tu organización.',             icon: 'workspace_premium', route: '/subscription/status' }
    ];
    if (role === Role.DRIVER) return [
      { label: 'home.driver.trips',  desc: 'home.driver.trips-desc',  icon: 'directions_bus', route: '/trip/list' },
      { label: 'home.driver.alerts', desc: 'home.driver.alerts-desc', icon: 'notifications',  route: '/notifications/alerts' }
    ];
    if (role === Role.PARENT) return [
      { label: 'My Child',         desc: 'Sigue en tiempo real el viaje y la ubicación de tu hijo.',   icon: 'favorite',      route: '/trip/tracking' },
      { label: 'Incident Report',  desc: 'Revisa reportes de incidentes ocurridos durante los viajes.', icon: 'warning',       route: '/notifications/alerts' },
      { label: 'Check Assistance', desc: 'Verifica la asistencia y estado de abordaje de tu hijo.',     icon: 'check_circle',  route: '/trip/attendance' }
    ];
    return [];
  });

  navigate(route: string): void {
    this.router.navigate([route]).then();
  }
}
