import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../ActionButton';
import { useAppDispatch } from '@renderer/hooks/redux';
import { useConfirmModal } from '@renderer/hooks/confirmModal';
import { useLogoutLoading } from '@renderer/hooks/logoutLoading';
import { logout } from '@renderer/redux/slices/auth/thunks';

type Props = {
  onClick?: () => void;
  variant?: 'listItem' | 'button';
};

export function SignOutButton({ onClick }: Props) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { openConfirmModal } = useConfirmModal();
  const { showLogoutLoading, hideLogoutLoading } = useLogoutLoading();

  const handleSignOut = () => {
    openConfirmModal({
      title: 'Sair',
      description: 'Tem certeza que deseja sair do LeadHelper?',
      action: async () => {
        showLogoutLoading();

        dispatch(
          logout((success) => {
            hideLogoutLoading();

            if (success) {
              navigate('/login');
            }
          }),
        );
      },
    });
  };

  const handleClick = () => {
    handleSignOut();
    onClick?.();
  };

  return (
    <ActionButton icon={<LogoutIcon />} label="Sair" onClick={handleClick} />
  );
}
