export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface User {
  id: number;
  role_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserRequest {
  role_id: number;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  avatar_url: string;
  status: UserStatus;
}

export type UserUpdateRequest = Omit<UserRequest, 'password_hash'> & {
  password_hash?: string;
};
