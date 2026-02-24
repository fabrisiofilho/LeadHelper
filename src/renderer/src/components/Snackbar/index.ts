import { styled } from '@mui/material';
import { MaterialDesignContent } from 'notistack';
import { rgba } from 'polished';

export const CustomMaterialDesignContent = styled(MaterialDesignContent)(({
  theme,
}) => {
  const isDark = theme.palette.mode === 'dark';

  const baseStyle = {
    backgroundColor: isDark ? '#1a1f2e' : theme.palette.grey[800],
    borderRadius: '0.5rem',
    padding: '0.25rem 1.5rem 0.25rem 0.625rem',
    fontWeight: 600,
    color: '#FFFFFF',
    border: isDark ? '1px solid #2d3748' : 'none',
  };

  const baseSvgStyle = {
    borderRadius: '0.75rem',
    fontSize: '2.375rem !important',
    padding: '0.5rem',
    marginRight: '0.75rem !important',
  };

  return {
    '&.notistack-MuiContent-success': {
      ...baseStyle,
      svg: {
        color: theme.palette.success.main,
        backgroundColor: rgba(theme.palette.success.main, 0.16),
        ...baseSvgStyle,
      },
    },
    '&.notistack-MuiContent-error': {
      ...baseStyle,
      svg: {
        color: theme.palette.error.main,
        backgroundColor: rgba(theme.palette.error.main, 0.16),
        ...baseSvgStyle,
      },
    },
    '&.notistack-MuiContent-warning': {
      ...baseStyle,
      svg: {
        color: theme.palette.warning.main,
        backgroundColor: rgba(theme.palette.warning.main, 0.16),
        ...baseSvgStyle,
      },
    },
    '&.notistack-MuiContent-info': {
      ...baseStyle,
      svg: {
        color: theme.palette.info.main,
        backgroundColor: rgba(theme.palette.info.main, 0.16),
        ...baseSvgStyle,
      },
    },
  };
});
