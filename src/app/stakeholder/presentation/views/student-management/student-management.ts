import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StakeholderStore, ParentEntity, ChildEntity } from '../../../application/stakeholder-store';
import { VehicleEntity } from '../../../domain/model/vehicle-entity';

type MainTab = 'usuarios' | 'logistica';
type UsersTab = 'padres' | 'alumnos';

@Component({
  selector: 'app-student-management',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './student-management.html',
  styleUrl: './student-management.css'
})
export class StudentManagement {
  protected store = inject(StakeholderStore);
  private fb = inject(FormBuilder);

  // ── Tab state ──
  mainTab  = signal<MainTab>('usuarios');
  usersTab = signal<UsersTab>('padres');

  // ── Expand state (parent rows) ──
  expanded = signal<Set<number>>(new Set([1, 2])); // Rosita + Carmen pre-expanded

  // ── Dialog state ──
  showParentDialog = signal(false);
  showChildDialog  = signal(false);
  isEdit    = signal(false);
  editId    = signal<number | null>(null);
  editParentId = signal<number | null>(null);

  // ── Computed ──
  parents  = computed(() => this.store.parents());
  children = computed(() => this.store.children());

  childrenOf(parentId: number): ChildEntity[] {
    return this.children().filter(c => c.parentId === parentId);
  }

  initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  toggleExpand(id: number): void {
    this.expanded.update(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  boardingLabel(s: string): string {
    if (s === 'ABORDADO')  return 'Abordado';
    if (s === 'EN_ESPERA') return 'En Espera';
    return 'Ausente';
  }

  boardingClass(s: string): string {
    if (s === 'ABORDADO')  return 'chip-green';
    if (s === 'EN_ESPERA') return 'chip-amber';
    return 'chip-red';
  }

  // ── Parent form ──
  parentForm = this.fb.group({
    name:           ['', Validators.required],
    email:          ['', [Validators.required, Validators.email]],
    phone:          ['', Validators.required],
    status:         [true]
  });

  openCreateParent(): void {
    this.isEdit.set(false); this.editId.set(null);
    this.parentForm.reset({ name: '', email: '', phone: '', status: true });
    this.showParentDialog.set(true);
  }

  openEditParent(p: ParentEntity): void {
    this.isEdit.set(true); this.editId.set(p.id);
    this.parentForm.patchValue({ name: p.name, email: p.email, phone: p.phone, status: p.status });
    this.showParentDialog.set(true);
  }

  saveParent(): void {
    if (this.parentForm.invalid) return;
    const v = this.parentForm.getRawValue();
    if (this.isEdit() && this.editId() !== null) {
      const orig = this.parents().find(p => p.id === this.editId())!;
      this.store.updateParent({ ...orig, name: v.name!, email: v.email!, phone: v.phone!, status: v.status! });
    } else {
      this.store.createParent({ name: v.name!, email: v.email!, phone: v.phone!, status: true, organizationId: 1 });
    }
    this.showParentDialog.set(false);
  }

  deleteParent(id: number): void {
    if (!confirm('¿Eliminar este padre/madre y sus hijos?')) return;
    this.store.deleteParent(id);
  }

  // ── Child form ──
  childForm = this.fb.group({
    name:          ['', Validators.required],
    grade:         ['', Validators.required],
    boardingStatus:['ABORDADO', Validators.required],
    status:        [true]
  });

  openCreateChild(parentId: number): void {
    this.isEdit.set(false); this.editId.set(null); this.editParentId.set(parentId);
    this.childForm.reset({ name: '', grade: '', boardingStatus: 'ABORDADO', status: true });
    this.showChildDialog.set(true);
  }

  openEditChild(c: ChildEntity): void {
    this.isEdit.set(true); this.editId.set(c.id); this.editParentId.set(c.parentId);
    this.childForm.patchValue({ name: c.name, grade: c.grade, boardingStatus: c.boardingStatus, status: c.status });
    this.showChildDialog.set(true);
  }

  saveChild(): void {
    if (this.childForm.invalid) return;
    const v = this.childForm.getRawValue();
    if (this.isEdit() && this.editId() !== null) {
      const orig = this.children().find(c => c.id === this.editId())!;
      this.store.updateChild({ ...orig, name: v.name!, grade: v.grade!, boardingStatus: v.boardingStatus as any, status: v.status! });
    } else {
      this.store.createChild({
        name: v.name!, grade: v.grade!,
        boardingStatus: v.boardingStatus as any,
        status: true, parentId: this.editParentId()!, organizationId: 1
      });
    }
    this.showChildDialog.set(false);
  }

  deleteChild(id: number): void {
    if (!confirm('¿Eliminar este alumno?')) return;
    this.store.deleteChild(id);
  }

  // ── Logística state ──
  logisticaTab = signal<'conductores' | 'vehiculos'>('conductores');

  vehicles = computed(() => this.store.vehicles());
  drivers  = computed(() => this.store.students().filter(u => u.role === 'DRIVER'));

  // ── Driver dialog ──
  showDriverDialog  = signal(false);
  isDriverEdit      = signal(false);
  editDriverId      = signal<number | null>(null);

  driverForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', Validators.required]
  });

  openCreateDriver(): void {
    this.isDriverEdit.set(false); this.editDriverId.set(null);
    this.driverForm.reset({ firstName: '', lastName: '', email: '', password: '' });
    this.showDriverDialog.set(true);
  }

  openEditDriver(d: any): void {
    this.isDriverEdit.set(true); this.editDriverId.set(d.id);
    this.driverForm.patchValue({ firstName: d.firstName, lastName: d.lastName, email: d.email, password: '' });
    this.driverForm.get('password')?.clearValidators();
    this.driverForm.get('password')?.updateValueAndValidity();
    this.showDriverDialog.set(true);
  }

  saveDriver(): void {
    if (this.driverForm.invalid) return;
    const v = this.driverForm.getRawValue();
    if (this.isDriverEdit() && this.editDriverId() !== null) {
      const orig = this.drivers().find(d => d.id === this.editDriverId())!;
      this.store.updateDriver({ ...orig, firstName: v.firstName!, lastName: v.lastName!, email: v.email! });
    } else {
      this.store.createDriver({ firstName: v.firstName!, lastName: v.lastName!, email: v.email!, password: v.password!, role: 'DRIVER', organizationId: 1 });
    }
    this.driverForm.get('password')?.setValidators(Validators.required);
    this.showDriverDialog.set(false);
  }

  deleteDriver(id: number): void {
    if (!confirm('¿Eliminar este conductor?')) return;
    this.store.deleteDriver(id);
  }

  // ── Vehicle dialog ──
  showVehicleDialog  = signal(false);
  isVehicleEdit      = signal(false);
  editVehicleId      = signal<number | null>(null);

  vehicleForm = this.fb.group({
    plate:    ['', Validators.required],
    model:    ['', Validators.required],
    capacity: [20, [Validators.required, Validators.min(1)]],
    status:   ['ACTIVE', Validators.required]
  });

  openCreateVehicle(): void {
    this.isVehicleEdit.set(false); this.editVehicleId.set(null);
    this.vehicleForm.reset({ plate: '', model: '', capacity: 20, status: 'ACTIVE' });
    this.showVehicleDialog.set(true);
  }

  openEditVehicle(v: any): void {
    this.isVehicleEdit.set(true); this.editVehicleId.set(v.id);
    this.vehicleForm.patchValue({ plate: v.plate, model: v.model, capacity: v.capacity, status: v.status ?? 'ACTIVE' });
    this.showVehicleDialog.set(true);
  }

  saveVehicle(): void {
    if (this.vehicleForm.invalid) return;
    const v = this.vehicleForm.getRawValue();
    if (this.isVehicleEdit() && this.editVehicleId() !== null) {
      const orig = this.vehicles().find(x => x.id === this.editVehicleId())!;
      this.store.updateVehicle({ ...orig, plate: v.plate!, model: v.model!, capacity: Number(v.capacity), status: v.status! });
    } else {
      this.store.createVehicle({ plate: v.plate!, model: v.model!, capacity: Number(v.capacity), status: v.status!, organizationId: 1 });
    }
    this.showVehicleDialog.set(false);
  }

  deleteVehicle(id: number): void {
    if (!confirm('¿Eliminar este vehículo?')) return;
    this.store.deleteVehicle(id);
  }
}
