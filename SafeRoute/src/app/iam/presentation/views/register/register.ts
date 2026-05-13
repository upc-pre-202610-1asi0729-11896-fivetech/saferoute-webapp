import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthStore } from '../../../application/auth-store';
import { Role } from '../../../domain/model/role-enum';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    TranslatePipe,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  protected store = inject(AuthStore);

  /** Plan info from landing page query params (e.g. ?plan=Básico&price=$9.99/mes) */
  readonly selectedPlan = signal<string | null>(null);
  readonly selectedPrice = signal<string | null>(null);

  mode = signal<'user' | 'admin'>('user');

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const plan = params.get('plan');
    const price = params.get('price');
    if (plan) {
      this.selectedPlan.set(plan);
      this.selectedPrice.set(price);
      // Plan purchase always requires an admin account (creates an organization)
      this.mode.set('admin');
    }
  }

  private get checkoutUrl(): string | undefined {
    const plan = this.selectedPlan();
    const price = this.selectedPrice();
    if (!plan) return undefined;
    return `/checkout?plan=${encodeURIComponent(plan)}&price=${encodeURIComponent(price ?? '')}`;
  }

  orgForm = this.fb.group({
    name: ['', Validators.required],
  });

  adminForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  userForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [Role.PARENT, Validators.required],
    organizationId: ['', Validators.required],
  });

  setMode(value: 'user' | 'admin'): void {
    this.mode.set(value);
    this.store.clearError();
  }

  registerAdmin(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }
    const org = this.orgForm.value;
    const admin = this.adminForm.value;
    this.store.registerAdmin(
      { name: org.name! },
      {
        firstName: admin.firstName!,
        lastName: admin.lastName!,
        email: admin.email!,
        password: admin.password!,
        role: Role.ADMIN,
      },
      this.checkoutUrl,
    );
  }

  registerUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const v = this.userForm.value;
    // Parents/drivers don't buy a plan — go straight to sign-in
    this.store.registerUser({
      firstName: v.firstName!,
      lastName: v.lastName!,
      email: v.email!,
      password: v.password!,
      role: v.role!,
      organizationId: Number(v.organizationId),
    });
  }
}
