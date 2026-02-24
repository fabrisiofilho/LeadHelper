import { styledTheme } from '@renderer/styles/styledTheme';
import { useMediaQuery } from '@mui/material';

export function useResponsiveCurrentSize() {
  const isXs = useMediaQuery(styledTheme.SIZES.xs);
  const isSm = useMediaQuery(styledTheme.SIZES.sm);
  const isMd = useMediaQuery(styledTheme.SIZES.md);
  const isLg = useMediaQuery(styledTheme.SIZES.lg);
  const isXl = useMediaQuery(styledTheme.SIZES.xl);

  if (isXs) return 'xs';
  if (isSm) return 'sm';
  if (isMd) return 'md';
  if (isLg) return 'lg';
  if (isXl) return 'xl';

  return 'md';
}
