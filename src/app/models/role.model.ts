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
  createdAt?: string;
  updatedAt?: string;
  createBy: number;
  updateBy: number;
}

