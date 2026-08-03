import { Stack, styled, Typography } from '@mui/material';
import { AlertBoxVariantsEnum, type AlertBoxVariants } from '.';

type ElementWithVariant = {
  variant: AlertBoxVariants;
  $noMargin?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getVariantColors = (theme: any, variant: AlertBoxVariants) => {
  switch (variant) {
    case AlertBoxVariantsEnum.success:
      return {
        bg: theme.palette.success.light,
        text: theme.palette.success.dark,
      };
    case AlertBoxVariantsEnum.danger:
      return { bg: theme.palette.error.light, text: theme.palette.error.dark };
    case AlertBoxVariantsEnum.warn:
      return {
        bg: theme.palette.warning.light,
        text: theme.palette.warning.dark,
      };
    case AlertBoxVariantsEnum.primary:
      return {
        bg: theme.palette.primary.light,
        text: theme.palette.primary.dark,
      };
    case AlertBoxVariantsEnum.info:
    default:
      return { bg: theme.palette.info.light, text: theme.palette.info.dark };
  }
};

export const AlertBoxContainer = styled(Stack, {
  shouldForwardProp: (prop) => prop !== 'variant' && prop !== '$noMargin',
})<ElementWithVariant>(({ theme, variant, $noMargin }) => {
  const colors = getVariantColors(theme, variant);
  return {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: $noMargin ? '0' : '1.5rem',
    padding: '1rem 1.25rem',
    borderRadius: '0.75rem',
    backgroundColor: colors.bg,
    color: theme.palette.text.secondary,
    '& > div > div > h2': {
      color: colors.text,
    },
  };
});

export const IconWrapper = styled('div', {
  shouldForwardProp: (prop) => prop !== 'variant',
})<ElementWithVariant>(({ theme, variant }) => {
  const colors = getVariantColors(theme, variant);
  return {
    display: 'flex',
    alignItems: 'flex-start',
    paddingTop: '0.125rem',
    '& > *': {
      fontSize: '1.25rem',
      color: colors.text,
    },
  };
});

export const TypographyDescription = styled(Typography)(({ theme }) => ({
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  color: theme.palette.text.primary,
  fontSize: '0.875rem',
  lineHeight: 1.43,
}));
