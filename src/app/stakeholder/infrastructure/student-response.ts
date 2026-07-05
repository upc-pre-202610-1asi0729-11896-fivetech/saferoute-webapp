export interface ParentResource {
  id: string;
  organizationId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  children: ChildResource[];
}

export interface ChildResource {
  id: string;
  fullName: string;
  school: string;
  state: string;
}

export interface DriverResource {
  id: string;
  organizationId: string;
  fullName: string;
  licenseNumber: string;
  phoneNumber: string;
}
