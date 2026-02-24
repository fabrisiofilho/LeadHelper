import { Badge, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { type ReactNode } from 'react';

type BadgeColor =
  | 'error'
  | 'default'
  | 'success'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'warning';

type Props = {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badgeCount?: number;
  badgeLoading?: boolean;
  badgeColor?: BadgeColor;
};

export function ActionButton({
  icon,
  onClick,
  label,
  badgeCount,
  badgeLoading,
  disabled,
  badgeColor = 'error',
}: Props) {
  const badgeContent = badgeLoading ? (
    <CircularProgress size={12} style={{ color: 'white' }} />
  ) : (
    badgeCount
  );

  const button = (
    <IconButton onClick={onClick} disabled={disabled}>
      <Badge badgeContent={badgeContent} color={badgeColor}>
        {icon}
      </Badge>
    </IconButton>
  );

  return (
    <Tooltip title={label}>{disabled ? <span>{button}</span> : button}</Tooltip>
  );
}
