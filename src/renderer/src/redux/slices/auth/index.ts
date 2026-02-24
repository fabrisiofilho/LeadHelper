import { createSlice } from '@reduxjs/toolkit';
import { User } from '@shared/interfaces/types/auth.types';
import { login, logout, loadAuthData, register, checkAuth } from './thunks';
import { ThunkLoading, ThunkLoadingEnum } from '@renderer/types/thunks';

type InitialState = {
  user: User | null;
  isAuthenticated: boolean;
  loginLoading: ThunkLoading;
  registerLoading: ThunkLoading;
  authDataLoading: ThunkLoading;
  checkAuthLoading: ThunkLoading;
  logoutLoading: ThunkLoading;
};

const initialState: InitialState = {
  user: null,
  isAuthenticated: false,
  loginLoading: ThunkLoadingEnum.IDLE,
  registerLoading: ThunkLoadingEnum.IDLE,
  authDataLoading: ThunkLoadingEnum.IDLE,
  checkAuthLoading: ThunkLoadingEnum.IDLE,
  logoutLoading: ThunkLoadingEnum.IDLE,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loginLoading = ThunkLoadingEnum.IDLE;
      state.registerLoading = ThunkLoadingEnum.IDLE;
      state.authDataLoading = ThunkLoadingEnum.IDLE;
      state.checkAuthLoading = ThunkLoadingEnum.IDLE;
      state.logoutLoading = ThunkLoadingEnum.IDLE;
    },
    resetLoginLoading: (state) => {
      state.loginLoading = ThunkLoadingEnum.IDLE;
    },
    resetRegisterLoading: (state) => {
      state.registerLoading = ThunkLoadingEnum.IDLE;
    },
  },
  extraReducers: (reducers) => {
    reducers

      .addCase(login.fulfilled, (state, { payload }) => {
        state.user = payload || null;
        state.isAuthenticated = !!payload;
        state.loginLoading = ThunkLoadingEnum.FULFILLED;
      })
      .addCase(login.pending, (state) => {
        state.loginLoading = ThunkLoadingEnum.PENDING;
      })
      .addCase(login.rejected, (state) => {
        state.loginLoading = ThunkLoadingEnum.REJECTED;
        state.isAuthenticated = false;
      })

      .addCase(register.fulfilled, (state, { payload }) => {
        state.user = payload || null;
        state.isAuthenticated = !!payload;
        state.registerLoading = ThunkLoadingEnum.FULFILLED;
      })
      .addCase(register.pending, (state) => {
        state.registerLoading = ThunkLoadingEnum.PENDING;
      })
      .addCase(register.rejected, (state) => {
        state.registerLoading = ThunkLoadingEnum.REJECTED;
      })

      .addCase(loadAuthData.fulfilled, (state, { payload }) => {
        state.user = payload || null;
        state.isAuthenticated = !!payload;
        state.authDataLoading = ThunkLoadingEnum.FULFILLED;
      })
      .addCase(loadAuthData.pending, (state) => {
        state.authDataLoading = ThunkLoadingEnum.PENDING;
      })
      .addCase(loadAuthData.rejected, (state) => {
        state.authDataLoading = ThunkLoadingEnum.REJECTED;
        state.isAuthenticated = false;
      })

      .addCase(checkAuth.fulfilled, (state, { payload }) => {
        state.isAuthenticated = !!payload;
        state.checkAuthLoading = ThunkLoadingEnum.FULFILLED;
      })
      .addCase(checkAuth.pending, (state) => {
        state.checkAuthLoading = ThunkLoadingEnum.PENDING;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.checkAuthLoading = ThunkLoadingEnum.REJECTED;
        state.isAuthenticated = false;
      })

      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.logoutLoading = ThunkLoadingEnum.FULFILLED;
      })
      .addCase(logout.pending, (state) => {
        state.logoutLoading = ThunkLoadingEnum.PENDING;
      })
      .addCase(logout.rejected, (state) => {
        state.logoutLoading = ThunkLoadingEnum.REJECTED;
      });
  },
});

export const { clearAuthState, resetLoginLoading, resetRegisterLoading } =
  authSlice.actions;

export { login, logout, loadAuthData, register, checkAuth } from './thunks';

export const selectUser = (state: { auth: InitialState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: InitialState }) =>
  state.auth.isAuthenticated;
export const selectLoginLoading = (state: { auth: InitialState }) =>
  state.auth.loginLoading;
export const selectRegisterLoading = (state: { auth: InitialState }) =>
  state.auth.registerLoading;
export const selectAuthDataLoading = (state: { auth: InitialState }) =>
  state.auth.authDataLoading;
export const selectCheckAuthLoading = (state: { auth: InitialState }) =>
  state.auth.checkAuthLoading;
export const selectLogoutLoading = (state: { auth: InitialState }) =>
  state.auth.logoutLoading;
