export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    scope: string;
    schoolId?: number | null;
    roleId: number;
  };
}

