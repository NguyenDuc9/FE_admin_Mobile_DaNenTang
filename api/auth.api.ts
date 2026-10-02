import api from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  data: {
    token: string;
    user: {
      id: number;
      fullName: string;
      email: string;
      role: string;
    };
  };
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/api/auth/login', data);
}
