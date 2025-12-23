export enum TypeRole {
  PROVIDER = 'PROVIDER',
  SCHOOL = 'SCHOOL'
}

export interface Role {
  id?: number;
  roleName: string;
  typeRole: TypeRole;
  description: string;
  schoolId?: number | null;
  schoolName?: string; // From backend RoleResponse
  userCount?: number; // From backend RoleResponse
  createdAt?: string;
  updatedAt?: string;
  createBy?: number; // Optional in response
  updateBy?: number; // Optional in response
}

