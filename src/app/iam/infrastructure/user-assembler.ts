import { Injectable } from '@angular/core';
import { UserEntity } from '../domain/model/user-entity';
import { UserResource, UsersResponse } from './user-response';
import { Role } from '../domain/model/role-enum';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';

@Injectable({ providedIn: 'root' })
export class UserAssembler implements BaseAssembler<UserEntity, UserResource, UsersResponse> {
  toEntityFromResource(resource: UserResource): UserEntity {
    return {
      id: resource.id,
      firstName: resource.firstName ?? resource.username,
      lastName: resource.lastName ?? '',
      email: resource.email ?? resource.username,
      role: this.toFrontendRole(resource.role ?? resource.roles?.[0] ?? '') as Role,
      organizationId: resource.organizationId
    };
  }

  toResourceFromEntity(entity: UserEntity): UserResource {
    return {
      id: entity.id,
      username: entity.email,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      role: entity.role,
      roles: [entity.role === Role.ADMIN ? 'ROLE_ADMINISTRATOR' : `ROLE_${entity.role}`],
      organizationId: entity.organizationId
    };
  }

  toEntitiesFromResponse(response: UsersResponse): UserEntity[] {
    const list = Array.isArray(response)
      ? (response as unknown as UserResource[])
      : (response.users ?? []);
    return list.map(r => this.toEntityFromResource(r));
  }

  private toFrontendRole(role: string): string {
    const normalized = role.replace(/^ROLE_/, '');
    return normalized === 'ADMINISTRATOR' ? Role.ADMIN : normalized || Role.PARENT;
  }
}
