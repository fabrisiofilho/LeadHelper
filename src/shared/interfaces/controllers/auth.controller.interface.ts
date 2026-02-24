import { ApiResponse } from '../types/common.types';
import {
  RegisterInput,
  UpdateProfileInput,
  User,
  AuthData,
} from '../types/auth.types';

export interface IAuthController {
  register(data: RegisterInput): Promise<ApiResponse<User>>;
  login(email: string, password: string): Promise<ApiResponse<AuthData>>;
  logout(): Promise<ApiResponse<void>>;
  checkAuth(): Promise<ApiResponse<boolean>>;
  getCurrentUser(): Promise<ApiResponse<User>>;
  updateProfile(data: UpdateProfileInput): Promise<ApiResponse<User>>;
  changePassword(
    oldPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<void>>;
}
