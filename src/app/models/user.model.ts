export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER'
}

export enum Scope {
  SCHOOL = 'SCHOOL',
  PROVIDER = 'PROVIDER'
}

export interface User {
  id?: number;
  fullName: string;
  gender: Gender;
  birthYear: string; // LocalDateTime as string
  address: string;
  phoneNumber: string;
  email: string;
  password?: string;
  isActive: boolean;
  scope: Scope;
  schoolId?: number | null;
  roleId: number;
  createdAt?: string;
  updatedAt?: string;
  createBy: number;
  updateBy: number;
}

