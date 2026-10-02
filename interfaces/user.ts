export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface User {
  id: number;
  role_id: number;
  role_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface UserRequest {
  roleId: number;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  avatarUrl: string;
  status: UserStatus;
}

export type UserUpdateRequest = Omit<UserRequest, 'password'> & {
  password?: string;
};

export interface UserInfo {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
  fullName?: string;
}
