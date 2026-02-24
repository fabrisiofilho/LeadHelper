import { styledTheme } from '@renderer/styles/styledTheme';
import { useMediaQuery } from '@mui/material';

export type Size = 'small' | 'medium' | 'large';

export function useResponsiveSize(
  small: Size,
  medium: Size,
  large?: Size,
): Size {
  const isXs = useMediaQuery(styledTheme.SIZES.xs);
  const isSm = useMediaQuery(styledTheme.SIZES.sm);
  const isMd = useMediaQuery(styledTheme.SIZES.md);
  const isLg = useMediaQuery(styledTheme.SIZES.lg);
  const isXl = useMediaQuery(styledTheme.SIZES.xl);

  if (isXs || isSm) return small;
  if (isMd) return medium;
  if (isLg || isXl) return large ?? medium;

  return medium;
}
