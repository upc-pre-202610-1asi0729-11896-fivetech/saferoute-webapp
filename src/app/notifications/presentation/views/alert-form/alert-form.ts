import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthStore } from '../../../../iam/application/auth-store';
import { NotificationStore } from '../../../application/notification-store';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-alert-form',
  imports: [ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule, TranslatePipe],
  templateUrl: './alert-form.html',
  styleUrl: './alert-form.css',
})
export class AlertForm {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);
  protected readonly store = inject(NotificationStore);

  protected readonly form = this.fb.group({
    tripId: [''],
    recipientEmail: ['', Validators.email],
    message: ['', [Validators.required, Validators.minLength(8)]],
    priority: [false],
  });

  submit(): void {
    const organizationId = this.auth.currentUser()?.organizationId;
    if (!organizationId || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.store.createAlert({
      organizationId,
      tripId: value.tripId || undefined,
      recipientEmail: value.recipientEmail || undefined,
      message: value.message!,
      priority: !!value.priority,
    }, () => this.router.navigate(['/notifications/alerts']));
  }
}

