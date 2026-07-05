import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StakeholderStore } from '../../../application/stakeholder-store';
import { VehicleEntity } from '../../../domain/model/vehicle-entity';
import { AuthStore } from '../../../../iam/application/auth-store';

/**
 * Vehicle management view (Fleet assets).
 *
 * <p>Provides full CRUD over vehicles through the {@link StakeholderStore}, whose vehicle
 * operations are wired to the Spring Boot (Java) backend. Vehicles are loaded for the logged-in
 * user's organization on init.</p>
 */
@Component({
  selector: 'app-vehicle-management',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule
  ],
  templateUrl: './vehicle-management.html',
  styleUrl: './vehicle-management.css'
})
export class VehicleManagement implements OnInit {
  protected store = inject(StakeholderStore);
  private auth = inject(AuthStore);
  private fb = inject(FormBuilder);

  /** Operational status options offered by the form (match the backend VehicleStatus enum). */
  readonly statuses = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'];

  vehicles = computed(() => this.store.vehicles());

  // ── Dialog state ──
  showDialog = signal(false);
  isEdit     = signal(false);
  editId     = signal<number | null>(null);

  vehicleForm = this.fb.group({
    plate:    ['', Validators.required],
    model:    ['', Validators.required],
    capacity: [20, [Validators.required, Validators.min(1)]],
    status:   ['ACTIVE', Validators.required]
  });

  /** Resolves the organization id from the authenticated user (defaults to 1 in dev). */
  private orgId(): number {
    return Number(this.auth.currentUser()?.organizationId ?? 1);
  }

  ngOnInit(): void {
    this.store.loadAll(this.orgId());
  }

  openCreate(): void {
    this.isEdit.set(false);
    this.editId.set(null);
    this.vehicleForm.reset({ plate: '', model: '', capacity: 20, status: 'ACTIVE' });
    this.showDialog.set(true);
  }

  openEdit(v: VehicleEntity): void {
    this.isEdit.set(true);
    this.editId.set(Number(v.id));
    this.vehicleForm.patchValue({
      plate: v.plate, model: v.model, capacity: v.capacity, status: v.status ?? 'ACTIVE'
    });
    this.showDialog.set(true);
  }

  cancel(): void {
    this.showDialog.set(false);
  }

  save(): void {
    if (this.vehicleForm.invalid) return;
    const v = this.vehicleForm.getRawValue();
    if (this.isEdit() && this.editId() !== null) {
      const orig = this.vehicles().find(x => x.id === this.editId())!;
      this.store.updateVehicle({
        ...orig,
        plate: v.plate!, model: v.model!, capacity: Number(v.capacity), status: v.status!
      });
    } else {
      this.store.createVehicle({
        plate: v.plate!, model: v.model!, capacity: Number(v.capacity),
        status: v.status!, organizationId: this.orgId()
      });
    }
    this.showDialog.set(false);
  }

  remove(id: number): void {
    if (!confirm('¿Eliminar este vehículo?')) return;
    this.store.deleteVehicle(id);
  }
}
