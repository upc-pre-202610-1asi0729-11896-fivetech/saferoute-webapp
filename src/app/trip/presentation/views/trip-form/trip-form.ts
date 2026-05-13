import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { TripStore } from '../../../application/trip-store';

@Component({
  selector: 'app-trip-form',
  imports: [
    ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatIconModule, MatProgressSpinnerModule, TranslatePipe
  ],
  templateUrl: './trip-form.html',
  styleUrl: './trip-form.css'
})
export class TripForm implements OnInit {
  protected store = inject(TripStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  isEdit = false;
  editId: number | null = null;

  form = this.fb.group({
    routeId: [null as number | null, [Validators.required]],
    driverId: [null as number | null, [Validators.required]],
    status: ['EN_ROUTE', Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  statusOptions = ['EN_ROUTE', 'COMPLETED', 'CANCELLED', 'PENDING'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.editId = +id;
      const trip = this.store.getTripById(this.editId);
      if (trip) {
        this.form.patchValue({
          routeId: trip.routeId,
          driverId: trip.driverId,
          status: trip.status,
          date: trip.scheduledDate ?? new Date().toISOString().split('T')[0]
        });
      } else {
        this.router.navigate(['/trip/list']);
      }
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    if (this.isEdit && this.editId !== null) {
      this.store.updateTrip({
        id: this.editId,
        routeId: v.routeId!,
        driverId: v.driverId!,
        status: v.status!,
        scheduledDate: v.date!
      });
    } else {
      this.store.createTrip({
        routeId: v.routeId!,
        driverId: v.driverId!,
        status: v.status!,
        scheduledDate: v.date!
      });
    }
    this.router.navigate(['/trip/list']);
  }

  cancel(): void { this.router.navigate(['/trip/list']); }
}
