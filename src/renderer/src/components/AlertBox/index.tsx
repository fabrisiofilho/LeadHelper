import type React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { Show } from '../Show';
import {
  AlertBoxContainer,
  IconWrapper,
  TypographyDescription,
} from './styles';

export enum AlertBoxVariantsEnum {
  success = 'success',
  info = 'info',
  danger = 'danger',
  warn = 'warn',
  primary = 'primary',
}
export type AlertBoxVariants = keyof typeof AlertBoxVariantsEnum;

type Props = {
  title: string;
  description: string | React.ReactNode;
  show?: boolean;
  onClose?: () => void;
  variant?: AlertBoxVariants;
  icon?: AlertBoxVariants;
  noMargin?: boolean;
};

type IconProps = {
  conditional: AlertBoxVariants;
};

const Icon = ({ conditional }: IconProps) => {
  switch (conditional) {
    case 'success':
      return <CheckCircleIcon />;
    case 'danger':
      return <WarningIcon />;
    case 'warn':
      return <WarningIcon />;
    default:
      return <InfoIcon />;
  }
};

export function AlertBox({
  title,
  description,
  variant = 'info',
  icon,
  show = true,
  onClose,
  noMargin = false,
}: Readonly<Props>) {
  if (!show) return <></>;

  return (
    <AlertBoxContainer variant={variant} $noMargin={noMargin}>
      <Stack gap="0.75rem" flexDirection="row">
        <IconWrapper variant={variant}>
          <Icon conditional={icon ?? variant} />
        </IconWrapper>

        <Stack gap="0.25rem">
          <Typography variant="subtitle1" component="h2">
            {title}
          </Typography>

          <TypographyDescription variant="body2" as="div">
            {description}
          </TypographyDescription>
        </Stack>
      </Stack>

      <Show.When isTrue={!!onClose}>
        <Box alignSelf="flex-start">
          <IconButton onClick={onClose} color="primary">
            <CloseIcon />
          </IconButton>
        </Box>
      </Show.When>
    </AlertBoxContainer>
  );
}
