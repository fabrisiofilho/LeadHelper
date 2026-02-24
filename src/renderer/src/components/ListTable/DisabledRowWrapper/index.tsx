import { Tooltip, Box } from '@mui/material';
import { ReactNode } from 'react';
type Props = {
  children: ReactNode;
  disabled?: boolean;
  tooltipMessage?: string;
};
export function DisabledRowWrapper({
  children,
  disabled = false,
  tooltipMessage,
}: Props) {
  if (!disabled || !tooltipMessage) {
    return <>{children}</>;
  }
  return (
    <Tooltip
      title={tooltipMessage}
      placement="top"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'grey.800',
            fontSize: '0.75rem',
            maxWidth: 300,
            textAlign: 'center',
            py: 1,
            px: 1.5,
          },
        },
        arrow: {
          sx: {
            color: 'grey.800',
          },
        },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          cursor: 'not-allowed',
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}
