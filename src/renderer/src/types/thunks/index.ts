export type WithCallback<T> = T & {
  cb: (success: boolean) => void;
};

export type ThunkLoading = 'idle' | 'rejected' | 'pending' | 'fulfilled';

export enum ThunkLoadingEnum {
  IDLE = 'idle',
  REJECTED = 'rejected',
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
}
