export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AuthData {
  user: User;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type RegisterCredentials = RegisterInput;
