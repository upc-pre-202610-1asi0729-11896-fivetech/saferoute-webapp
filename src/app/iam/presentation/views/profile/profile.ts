import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../application/auth-store';
import { Role } from '../../../domain/model/role-enum';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, MatIconModule, TranslatePipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  protected auth = inject(AuthStore);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private translate = inject(TranslateService);

  // Notification toggles (local state only)
  notifyTrip      = signal(true);
  notifyIncident  = signal(true);
  notifyGeneral   = signal(false);

  profileForm = this.fb.group({
    firstName: [this.auth.currentUser()?.firstName ?? '', Validators.required],
    lastName:  [this.auth.currentUser()?.lastName  ?? '', Validators.required],
    email:     [this.auth.currentUser()?.email     ?? '', [Validators.required, Validators.email]],
    phone:     [''],
  });

  securityForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  get initials(): string {
    const u = this.auth.currentUser();
    if (!u) return '?';
    return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
  }

  get roleLabel(): string {
    switch (this.auth.currentUser()?.role) {
      case Role.ADMIN:  return this.translate.instant('home.role.admin');
      case Role.DRIVER: return this.translate.instant('home.role.driver');
      case Role.PARENT: return this.translate.instant('home.role.parent');
      default:          return this.auth.currentUser()?.role ?? '—';
    }
  }

  get fullName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '—';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    // In a real app, call an update API here
    console.log('saveProfile', this.profileForm.value);
    this.snack.open(this.translate.instant('iam.profile.profile-updated'), 'OK', { duration: 3000 });
  }

  saveSecurity(): void {
    if (this.securityForm.invalid) { this.securityForm.markAllAsTouched(); return; }
    const v = this.securityForm.value;
    if (v.newPassword !== v.confirmPassword) {
      this.snack.open(this.translate.instant('iam.profile.passwords-do-not-match'), 'OK', { duration: 3000 });
      return;
    }
    console.log('saveSecurity', v);
    this.snack.open(this.translate.instant('iam.profile.password-updated'), 'OK', { duration: 3000 });
    this.securityForm.reset();
  }
}
