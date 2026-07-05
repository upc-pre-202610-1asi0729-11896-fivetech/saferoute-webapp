import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { AuthStore } from '../../../../iam/application/auth-store';
import { NotificationStore } from '../../../application/notification-store';

interface IncidentItem {
  id: string;
  tripId: number | null;
  routeName: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  reportedBy: string;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
}

interface NotifItem {
  id: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
}

@Component({
  selector: 'app-incident-report',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule, MatIconModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDialogModule, MatChipsModule
  ],
  templateUrl: './incident-report.html',
  styleUrl: './incident-report.css'
})
export class IncidentReport implements OnInit {
  private auth = inject(AuthStore);
  private store = inject(NotificationStore);
  private fb = inject(FormBuilder);

  activeTab = signal<'incidents' | 'notifications'>('incidents');
  showDialog = signal(false);

  filterType = signal('ALL');
  filterSeverity = signal('ALL');
  filterStatus = signal('ALL');

  readonly INCIDENT_TYPES = [
    { value: 'ALL',            label: 'Todos los tipos' },
    { value: 'RETRASO',        label: 'Retraso' },
    { value: 'AVERIA',         label: 'Avería' },
    { value: 'ACCIDENTE',      label: 'Accidente' },
    { value: 'COMPORTAMIENTO', label: 'Comportamiento' },
    { value: 'EMERGENCIA',     label: 'Emergencia' },
    { value: 'OTRO',           label: 'Otro' }
  ];
  readonly SEVERITY_LABELS: Record<string, string>  = { LOW: 'Leve', MEDIUM: 'Moderado', HIGH: 'Grave' };
  readonly SEVERITY_COLORS: Record<string, string>  = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#ef4444' };
  readonly TYPE_ICONS: Record<string, string> = {
    RETRASO: 'schedule', AVERIA: 'build', ACCIDENTE: 'warning',
    COMPORTAMIENTO: 'person', EMERGENCIA: 'phone', OTRO: 'info'
  };
  readonly NOTIF_COLORS: Record<string, string> = {
    ABORDAJE: '#22c55e', PROXIMIDAD: '#f59e0b', AUSENCIA: '#ef4444',
    LLEGADA: '#6366f1', RETRASO: '#f97316'
  };

  filteredIncidents = computed(() => {
    let list = this.store.incidents().map(item => ({
      id: item.id.toString(),
      tripId: item.tripId ? Number(item.tripId) : null,
      routeName: '',
      type: item.type,
      severity: (item.severity || 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
      description: item.description ?? item.message,
      reportedBy: '',
      timestamp: item.date,
      status: item.status ?? 'OPEN',
    }));
    if (this.filterType()     !== 'ALL') list = list.filter(i => i.type     === this.filterType());
    if (this.filterSeverity() !== 'ALL') list = list.filter(i => i.severity === this.filterSeverity());
    if (this.filterStatus()   !== 'ALL') list = list.filter(i => i.status   === this.filterStatus());
    return [...list].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  });

  visibleNotifs = computed(() =>
    this.store.notifications().map(item => ({
      id: item.id.toString(),
      message: item.body,
      type: item.type ?? item.title,
      timestamp: item.date,
      read: item.read,
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  );

  unreadCount = computed(() => this.store.notifications().filter(n => !n.read).length);

  isAdmin = computed(() => this.auth.isAdmin());

  form = this.fb.group({
    tripId:      [null as number | null],
    type:        ['OTRO', Validators.required],
    severity:    ['LOW',  Validators.required],
    description: ['',     Validators.required]
  });

  ngOnInit(): void {
    this.store.loadNotifications(this.auth.currentUser()?.id);
  }

  openDialog(): void {
    this.form.reset({ tripId: null, type: 'OTRO', severity: 'LOW', description: '' });
    this.showDialog.set(true);
  }

  saveIncident(): void {
    if (!this.form.value.description) return;
    const v = this.form.value;
    const incident: IncidentItem = {
      id: `i-${Date.now()}`,
      tripId:      v.tripId ?? null,
      routeName:   '',
      type:        v.type!,
      severity:    v.severity as 'LOW' | 'MEDIUM' | 'HIGH',
      description: v.description!,
      reportedBy:  this.auth.currentUser()?.id?.toString() ?? 'UNKNOWN',
      timestamp:   new Date().toISOString(),
      status:      'OPEN'
    };
    this.store.reportIncident({
      tripId: incident.tripId ?? undefined,
      type: incident.type,
      severity: incident.severity,
      message: incident.description,
      description: incident.description,
      date: incident.timestamp,
      status: incident.status,
    });
    this.showDialog.set(false);
  }

  resolveIncident(inc: IncidentItem): void {
    this.store.clearError();
  }

  markRead(n: NotifItem): void {
    this.store.markAsRead(n.id);
  }

  markAllRead(): void {
    this.store.markAllAsRead();
  }

  fmt(ts: string): string {
    return new Date(ts).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  }

  typeLabel(value: string): string {
    return this.INCIDENT_TYPES.find(t => t.value === value)?.label ?? value;
  }
}
