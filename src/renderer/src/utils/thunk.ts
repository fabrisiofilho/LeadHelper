import { ThunkLoading, ThunkLoadingEnum } from '@renderer/types/thunks';

export function isThunkLoading(
  loading: ThunkLoading | ThunkLoadingEnum,
  idle: boolean = false,
) {
  if (idle)
    return [ThunkLoadingEnum.PENDING, ThunkLoadingEnum.IDLE].includes(
      loading as ThunkLoadingEnum,
    );

  return loading === ThunkLoadingEnum.PENDING;
}
