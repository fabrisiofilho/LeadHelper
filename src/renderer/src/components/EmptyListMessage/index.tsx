import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { AlertIcon } from './styles';

type MessageConfig = {
  [key: string]: {
    containerPadding: string;
    iconSize: string;
    titleVariant: 'h6' | 'h4' | 'body2';
    descriptionVariant: 'body2' | 'body1';
    titleMargin: string;
  };
};

const MESSAGE_CONFIG: MessageConfig = {
  large: {
    containerPadding: '4rem',
    iconSize: '4.8rem',
    titleVariant: 'h4',
    titleMargin: '0.8rem',
    descriptionVariant: 'body1',
  },
  small: {
    containerPadding: '1rem',
    iconSize: '2.8rem',
    titleVariant: 'body2',
    titleMargin: '0.4rem',
    descriptionVariant: 'body2',
  },
};

export type EmptyListMessageProps = {
  title: string;
  description: string | ReactNode;
  size?: 'small' | 'large';
  fillContainer?: boolean;
};

export function EmptyListMessage({
  title,
  description,
  size = 'large',
  fillContainer = false,
}: Readonly<EmptyListMessageProps>) {
  const {
    containerPadding,
    iconSize,
    titleVariant,
    titleMargin,
    descriptionVariant,
  } = MESSAGE_CONFIG[size];

  return (
    <Stack
      width={fillContainer ? '100%' : 'auto'}
      height={fillContainer ? '100%' : 'auto'}
      alignItems="center"
      justifyContent="center"
      p={containerPadding}
    >
      <AlertIcon sx={{ fontSize: iconSize }} />

      <Typography
        variant={titleVariant}
        textAlign="center"
        fontWeight={600}
        my={titleMargin}
      >
        {title}
      </Typography>

      <Typography variant={descriptionVariant} textAlign="center">
        {description}
      </Typography>
    </Stack>
  );
}
