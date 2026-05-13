import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { AuthStore } from '../../../../iam/application/auth-store';
import { Role } from '../../../../iam/domain/model/role-enum';
import { StakeholderStore } from '../../../../stakeholder/application/stakeholder-store';
import { TripStore } from '../../../../trip/application/trip-store';
import { RoutesManagementStore } from '../../../../routes-management/application/routes-management.store';
import { SubscriptionStore } from '../../../../subscription/application/subscription-store';

interface NavItem {
  link: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatDividerModule,
    TranslatePipe,
    LanguageSwitcher,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  protected auth        = inject(AuthStore);
  private stakeholder   = inject(StakeholderStore);
  private tripStore     = inject(TripStore);
  private routesStore   = inject(RoutesManagementStore);
  private subStore      = inject(SubscriptionStore);

  constructor() {
    // Reload all org-scoped data whenever the logged-in user changes
    effect(() => {
      const orgId = this.auth.currentUser()?.organizationId;
      if (orgId) {
        this.stakeholder.loadAll(orgId);
        this.tripStore.loadAll(orgId);
        this.routesStore.loadRoutes(orgId);
        this.subStore.loadSubscription(orgId);
      }
    });
  }

  navItems = computed<NavItem[]>(() => {
    if (!this.auth.isAuthenticated()) return [];
    const role = this.auth.currentUser()?.role;
    if (role === Role.ADMIN) {
      return [
        { link: '/home', label: 'option.home', icon: 'home' },
        { link: '/stakeholder/profiles', label: 'option.community', icon: 'group' },
        { link: '/routes-management/routes', label: 'option.routes', icon: 'route' },
        { link: '/trip/monitor', label: 'option.trips', icon: 'directions_bus' },
        { link: '/subscription/status', label: 'option.subscription', icon: 'workspace_premium' },
        { link: '/notifications/alerts', label: 'option.alerts', icon: 'notifications' },
        { link: '/iam/profile', label: 'option.profile', icon: 'person' },
      ];
    }
    if (role === Role.DRIVER) {
      return [
        { link: '/home', label: 'option.home', icon: 'home' },
        { link: '/trip/list', label: 'option.trips', icon: 'directions_bus' },
        { link: '/notifications/alerts', label: 'option.alerts', icon: 'notifications' },
        { link: '/iam/profile', label: 'option.profile', icon: 'person' },
      ];
    }
    if (role === Role.PARENT) {
      return [
        { link: '/home',             label: 'option.home',       icon: 'home' },
        { link: '/trip/tracking',    label: 'option.tracking',   icon: 'location_on' },
        { link: '/trip/attendance',  label: 'option.attendance', icon: 'event_available' },
        { link: '/notifications/alerts', label: 'option.alerts', icon: 'notifications' },
        { link: '/iam/profile',      label: 'option.profile',    icon: 'person' },
      ];
    }
    return [{ link: '/home', label: 'option.home', icon: 'home' }];
  });

  signOut(): void {
    this.auth.signOut();
  }
}
