import { createAsyncThunk } from '@reduxjs/toolkit';
import { WithCallback } from '@renderer/types/thunks';
import {
  LoginCredentials,
  RegisterCredentials,
} from '@shared/interfaces/types/auth.types';

export const login = createAsyncThunk(
  'auth/login',
  async ({ cb, ...params }: WithCallback<LoginCredentials>) => {
    const response = await window.electronAPI.auth.login(
      params.email,
      params.password,
    );

    if (!response.success) {
      cb(false);
      throw new Error(response.error || 'Erro ao fazer login!');
    }

    cb(true);
    return response.data!.user;
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async ({ cb, ...params }: WithCallback<RegisterCredentials>) => {
    const response = await window.electronAPI.auth.register(params);

    if (!response.success) {
      cb(false);
      throw new Error(response.error || 'Erro ao criar conta!');
    }

    cb(true);
    return response.data!;
  },
);

export const loadAuthData = createAsyncThunk('auth/loadAuthData', async () => {
  const response = await window.electronAPI.auth.getCurrentUser();

  if (!response.success) {
    throw new Error(
      response.error || 'Erro ao carregar dados de autenticação!',
    );
  }

  return response.data;
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const response = await window.electronAPI.auth.checkAuth();

  if (!response.success) {
    throw new Error(response.error || 'Erro ao verificar autenticação!');
  }

  return response.data;
});

export const logout = createAsyncThunk(
  'auth/logout',
  async (cb: (success: boolean) => void) => {
    const response = await window.electronAPI.auth.logout();

    if (!response.success) {
      cb(false);
      throw new Error(response.error);
    }

    cb(true);
    return true;
  },
);
