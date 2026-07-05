import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthStore } from '../../../application/auth-store';
import { IamApi } from '../../../infrastructure/iam-api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-organization',
  imports: [ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule, TranslatePipe],
  templateUrl: './organization.html',
  styleUrl: './organization.css',
})
export class Organization {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthStore);
  private readonly api = inject(IamApi);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly organization = this.auth.organization;
  protected readonly canEdit = computed(() => !!this.auth.currentUser()?.organizationId);

  protected readonly form = this.fb.group({
    name: ['', Validators.required],
    legalIdentifier: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (!orgId) return;
    this.loading.set(true);
    this.error.set(null);
    this.api.getOrganizationById(orgId).subscribe({
      next: org => {
        this.auth.setOrganization({
          id: org.id,
          name: org.name,
          status: org.status ?? 'ACTIVE',
          createdAt: org.createdAt ?? '',
          legalIdentifier: org.legalIdentifier,
        });
        this.form.patchValue({ name: org.name, legalIdentifier: org.legalIdentifier ?? '' });
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message ?? this.translate.instant('iam.organization.load-error'));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    const orgId = this.auth.currentUser()?.organizationId;
    if (!orgId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.api.updateOrganization(orgId, {
      name: value.name!,
      legalIdentifier: value.legalIdentifier ?? undefined,
    }).subscribe({
      next: org => {
        this.auth.setOrganization({
          id: org.id,
          name: org.name,
          status: org.status ?? 'ACTIVE',
          createdAt: org.createdAt ?? '',
          legalIdentifier: org.legalIdentifier,
        });
        this.snack.open(this.translate.instant('iam.organization.updated'), 'OK', { duration: 3000 });
        this.saving.set(false);
      },
      error: err => {
        this.error.set(err.message ?? this.translate.instant('iam.organization.update-error'));
        this.saving.set(false);
      },
    });
  }
}

