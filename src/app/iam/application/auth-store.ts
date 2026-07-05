import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { UserEntity, OrganizationEntity } from '../domain/model/user-entity';
import { Role } from '../domain/model/role-enum';
import { IamApi } from '../infrastructure/iam-api';
import { SignInRequest, SignUpRequest, CreateOrganizationRequest } from '../infrastructure/user-response';

const TOKEN_KEY = 'saferoute.token';
const USER_KEY = 'saferoute.user';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _currentUser = signal<UserEntity | null>(null);
  private readonly _organization = signal<OrganizationEntity | null>(null);
  private readonly _token = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly organization = this._organization.asReadonly();
  readonly token = this._token.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAuthenticated = computed(() => !!this._token());
  readonly isAdmin = computed(() => this._currentUser()?.role === Role.ADMIN);
  readonly isDriver = computed(() => this._currentUser()?.role === Role.DRIVER);
  readonly isParent = computed(() => this._currentUser()?.role === Role.PARENT);

  constructor(private api: IamApi, private router: Router) {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (token) this._token.set(token);
    if (userJson) {
      try { this._currentUser.set(JSON.parse(userJson)); } catch { /* ignore */ }
    }
  }

  signIn(req: SignInRequest): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.signIn(req).subscribe({
      next: res => {
        this._token.set(res.token);
        localStorage.setItem(TOKEN_KEY, res.token);
        this.api.getUserById(res.id).subscribe({
          next: userResource => {
            const user: UserEntity = {
              id: userResource.id,
              firstName: userResource.firstName ?? userResource.username,
              lastName: userResource.lastName ?? '',
              email: userResource.email ?? userResource.username,
              role: (userResource.role ?? res.role ?? Role.PARENT) as Role,
              organizationId: userResource.organizationId
            };
            this._currentUser.set(user);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            this._loading.set(false);
            this.router.navigate(['/home']).then();
          },
          error: err => {
            this._error.set(err.message ?? 'Failed to load user');
            this._loading.set(false);
          }
        });
      },
      error: err => {
        this._error.set(err.message === 'invalid-credentials' ? 'iam.errors.invalid-credentials' : err.message);
        this._loading.set(false);
      }
    });
  }

  signOut(): void {
    this._currentUser.set(null);
    this._token.set(null);
    this._organization.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/iam/sign-in']).then();
  }

  registerAdmin(orgReq: CreateOrganizationRequest, userReq: SignUpRequest, redirectUrl?: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.createOrganization(orgReq).subscribe({
      next: org => {
        const req: SignUpRequest = { ...userReq, role: Role.ADMIN, organizationId: org.id };
        this.api.signUp(req).subscribe({
          next: () => {
            if (redirectUrl) {
              this.api.signIn({ email: req.email, password: req.password }).subscribe({
                next: res => {
                  this._token.set(res.token);
                  localStorage.setItem(TOKEN_KEY, res.token);
                  const user: UserEntity = {
                    id: res.id,
                    firstName: userReq.firstName || res.username,
                    lastName: userReq.lastName || '',
                    email: res.username,
                    role: (res.role ?? Role.ADMIN) as Role,
                    organizationId: res.organizationId ?? org.id,
                  };
                  this._currentUser.set(user);
                  localStorage.setItem(USER_KEY, JSON.stringify(user));
                  this._loading.set(false);
                  const sep = redirectUrl.includes('?') ? '&' : '?';
                  this.router.navigateByUrl(`${redirectUrl}${sep}orgId=${org.id}`).then();
                },
                error: err => {
                  this._error.set(err.message ?? 'iam.errors.registration-failed');
                  this._loading.set(false);
                },
              });
              return;
            }
            this._loading.set(false);
            this.router.navigate(['/iam/sign-in']).then();
          },
          error: err => {
            this._error.set(err.message ?? 'iam.errors.registration-failed');
            this._loading.set(false);
          }
        });
      },
      error: err => {
        this._error.set(err.message ?? 'iam.errors.organization-create-failed');
        this._loading.set(false);
      }
    });
  }

  registerUser(req: SignUpRequest, redirectUrl?: string): void {
    this._loading.set(true);
    this._error.set(null);
    this.api.signUp(req).subscribe({
      next: () => {
        this._loading.set(false);
        if (redirectUrl) {
          this.router.navigateByUrl(redirectUrl).then();
        } else {
          this.router.navigate(['/iam/sign-in']).then();
        }
      },
      error: err => {
        this._error.set(err.message ?? 'iam.errors.registration-failed');
        this._loading.set(false);
      }
    });
  }

  loadOrganization(): void {
    const user = this._currentUser();
    if (!user?.organizationId) return;
    this.api.getOrganizationById(user.organizationId).subscribe({
      next: org => this.setOrganization({ id: org.id, name: org.name, legalIdentifier: org.legalIdentifier, status: org.status ?? 'ACTIVE', createdAt: org.createdAt ?? '' }),
      error: () => { /* silently ignore */ }
    });
  }

  setOrganization(organization: OrganizationEntity): void {
    this._organization.set(organization);
  }

  /** Clears auth state without navigating (used before redirecting externally) */
  clearSession(): void {
    this._currentUser.set(null);
    this._token.set(null);
    this._organization.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  clearError(): void {
    this._error.set(null);
  }
}
