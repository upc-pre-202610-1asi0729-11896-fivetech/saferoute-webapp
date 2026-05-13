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
      firstName: resource.firstName,
      lastName: resource.lastName,
      email: resource.email,
      role: resource.role as Role,
      organizationId: resource.organizationId
    };
  }

  toResourceFromEntity(entity: UserEntity): UserResource {
    return {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      email: entity.email,
      role: entity.role,
      organizationId: entity.organizationId
    };
  }

  toEntitiesFromResponse(response: UsersResponse): UserEntity[] {
    const list = Array.isArray(response)
      ? (response as unknown as UserResource[])
      : (response.users ?? []);
    return list.map(r => this.toEntityFromResource(r));
  }
}
