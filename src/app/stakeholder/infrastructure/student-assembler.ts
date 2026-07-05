import { ChildEntity, ParentEntity, UserEntity } from '../domain/model/student-entity';
import { ChildResource, DriverResource, ParentResource } from './student-response';

export class StudentAssembler {
  toParentEntity(resource: ParentResource): ParentEntity {
    return {
      id: resource.id as unknown as number,
      name: resource.fullName,
      email: resource.email,
      phone: resource.phoneNumber,
      status: true,
      organizationId: resource.organizationId,
    };
  }

  toChildEntity(resource: ChildResource, parent: ParentResource): ChildEntity {
    return {
      id: resource.id as unknown as number,
      name: resource.fullName,
      grade: resource.school,
      parentId: parent.id as unknown as number,
      status: resource.state !== 'INACTIVE',
      boardingStatus: resource.state === 'ABSENT' ? 'AUSENTE' : 'EN_ESPERA',
      organizationId: parent.organizationId,
    };
  }

  toDriverEntity(resource: DriverResource): UserEntity {
    const [firstName, ...rest] = resource.fullName.split(' ');
    return {
      id: resource.id as unknown as number,
      firstName: firstName || resource.fullName,
      lastName: rest.join(' '),
      email: '',
      role: 'DRIVER',
      organizationId: resource.organizationId,
    };
  }
}
