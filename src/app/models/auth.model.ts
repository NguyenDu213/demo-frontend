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

// Backend API Response wrapper
export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

