import { Stack } from '@mui/material';
import { Loading } from '@renderer/components/Loading';
import leadhelperLogo from '@renderer/assets/leadhelper_logo.png';
import { Image } from './styles';
import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/redux';
import { loadAuthData } from '@renderer/redux/slices/auth/thunks';
import { useNavigate } from 'react-router-dom';
import { isThunkLoading } from '@renderer/utils/thunk';

export function LoadingPage() {
  const navigate = useNavigate();

  const dispatch = useAppDispatch();

  const { user, authDataLoading } = useAppSelector((state) => state.auth);

  const handleDataLoaded = useCallback(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    navigate('/panel');
  }, [user, navigate]);

  useEffect(() => {
    dispatch(loadAuthData());
  }, [dispatch]);

  useEffect(() => {
    const authLoaded = !isThunkLoading(authDataLoading, true);

    if (authLoaded) {
      handleDataLoaded();
    }
  }, [authDataLoading, handleDataLoaded]);

  return (
    <Stack flex={1} height="100vh" alignItems="center" justifyContent="center">
      <Image src={leadhelperLogo} />

      <Loading size="3.5rem" />
    </Stack>
  );
}
