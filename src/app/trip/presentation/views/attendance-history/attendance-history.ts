import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TripStore } from '../../../application/trip-store';
import { AuthStore } from '../../../../iam/application/auth-store';
import { StakeholderStore } from '../../../../stakeholder/application/stakeholder-store';

interface DayAttendance {
  date: string;          // YYYY-MM-DD
  dot: 'green' | 'amber' | 'red' | null;
}

interface StudentRecord {
  studentName: string;
  checkIn:  string | null;
  checkOut: string | null;
  status:   'present' | 'late' | 'absent';
}

@Component({
  selector: 'app-attendance-history',
  imports: [MatIconModule],
  templateUrl: './attendance-history.html',
  styleUrl:    './attendance-history.css'
})
export class AttendanceHistory {
  private tripStore = inject(TripStore);
  private auth      = inject(AuthStore);
  private stkStore  = inject(StakeholderStore);

  // ── Calendar state ──
  today        = new Date();
  currentYear  = signal(this.today.getFullYear());
  currentMonth = signal(this.today.getMonth()); // 0-based
  selectedDate = signal<string>(this.today.toISOString().slice(0, 10));

  monthName = computed(() =>
    new Date(this.currentYear(), this.currentMonth(), 1)
      .toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  );

  prevMonth(): void {
    if (this.currentMonth() === 0) { this.currentMonth.set(11); this.currentYear.update(y => y - 1); }
    else this.currentMonth.update(m => m - 1);
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) { this.currentMonth.set(0); this.currentYear.update(y => y + 1); }
    else this.currentMonth.update(m => m + 1);
  }

  // Calendar days: null = padding cell
  calendarDays = computed<(DayAttendance | null)[]>(() => {
    const y = this.currentYear();
    const m = this.currentMonth();
    const firstDay  = new Date(y, m, 1).getDay();     // 0 = Sun
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells: (DayAttendance | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dot = this.dotForDate(dateStr);
      cells.push({ date: dateStr, dot });
    }
    return cells;
  });

  // ── Trips relevant to the logged-in parent's children ──
  private myChildIds = computed(() => {
    const user = this.auth.currentUser();
    const parents = this.stkStore.parents();
    const children = this.stkStore.children();
    const parent = parents.find(p => p.email === user?.email);
    if (!parent) return [] as number[];
    return children.filter(c => c.parentId === parent.id).map(c => c.id);
  });

  private tripsWithMyKids = computed(() => {
    const ids = this.myChildIds();
    return this.tripStore.trips().filter(t =>
      t.studentIds && ids.some(id => t.studentIds!.includes(id))
    );
  });

  // ── Summary stats ──
  totalTrips = computed(() => this.tripsWithMyKids().length);

  presentRate = computed(() => {
    const trips = this.tripsWithMyKids();
    if (!trips.length) return '—';
    const completed = trips.filter(t => t.status === 'COMPLETED').length;
    return (completed / trips.length * 100).toFixed(1) + '%';
  });

  lateCheckIns = computed(() =>
    this.tripsWithMyKids().filter(t => t.status === 'EN_ROUTE' || t.status === 'SCHEDULED').length
  );

  absences = computed(() =>
    this.tripsWithMyKids().filter(t => {
      const kids = this.myChildIds();
      return kids.some(id => !t.studentIds?.includes(id));
    }).length
  );

  // Dot color for a calendar day
  private dotForDate(dateStr: string): 'green' | 'amber' | 'red' | null {
    const trips = this.tripsWithMyKids().filter(t => t.scheduledDate === dateStr);
    if (!trips.length) return null;
    const allDone = trips.every(t => t.status === 'COMPLETED');
    if (allDone) return 'green';
    const hasActive = trips.some(t => t.status === 'EN_ROUTE');
    if (hasActive) return 'amber';
    return 'red';
  }

  dayNumber(d: DayAttendance | null): number {
    if (!d) return 0;
    return +d.date.split('-')[2];
  }

  isToday(d: DayAttendance | null): boolean {
    return !!d && d.date === this.today.toISOString().slice(0, 10);
  }

  isSelected(d: DayAttendance | null): boolean {
    return !!d && d.date === this.selectedDate();
  }

  selectDay(d: DayAttendance | null): void {
    if (d) this.selectedDate.set(d.date);
  }

  // ── Daily detail table ──
  selectedDateLabel = computed(() => {
    const d = this.selectedDate();
    return new Date(d + 'T12:00:00').toLocaleDateString('es-PE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  });

  dailyTrip = computed(() =>
    this.tripsWithMyKids().find(t => t.scheduledDate === this.selectedDate())
  );

  dailyRecords = computed<StudentRecord[]>(() => {
    const trip = this.dailyTrip();
    const kids = this.stkStore.children();
    const myIds = this.myChildIds();

    if (!trip) {
      // Show all my children as absent
      return kids.filter(c => myIds.includes(c.id)).map(c => ({
        studentName: c.name, checkIn: null, checkOut: null, status: 'absent' as const
      }));
    }

    return kids.filter(c => myIds.includes(c.id)).map(c => {
      const boarded = trip.studentIds?.includes(c.id) ?? false;
      if (boarded && trip.status === 'COMPLETED') {
        return {
          studentName: c.name,
          checkIn:  trip.startTime ? this.formatTime(trip.startTime) : '07:00 AM',
          checkOut: trip.endTime   ? this.formatTime(trip.endTime)   : '03:30 PM',
          status: 'present' as const
        };
      }
      if (boarded) {
        return {
          studentName: c.name,
          checkIn:  trip.startTime ? this.formatTime(trip.startTime) : '07:45 AM',
          checkOut: null,
          status: 'late' as const
        };
      }
      return { studentName: c.name, checkIn: null, checkOut: null, status: 'absent' as const };
    });
  });

  private formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  routeLabel = computed(() => this.dailyTrip()?.routeName ?? '');

  statusLabel(s: 'present' | 'late' | 'absent'): string {
    return s === 'present' ? 'Present' : s === 'late' ? 'Late' : 'Absent';
  }

  weekDayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
}
