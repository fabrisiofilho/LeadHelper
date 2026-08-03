/**
 * PageShell — Componente de layout padrão para todas as telas do sistema.
 *
 * Fornece:
 * - Largura máxima consistente (1400px)
 * - Padding uniforme (24px / 16px em mobile)
 * - Header padronizado (título + subtitle + ações)
 * - FilterBar padronizado (busca + selects + chips)
 * - EmptyState padronizado (ícone + título + descrição + ação)
 */
import { type ReactNode } from 'react';
import { Box, Typography, Stack, Paper } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

// ── PageShell ────────────────────────────────────────────────────────────────

interface PageShellProps {
  children: ReactNode;
  /** When true the container fills height and is flex-column (needed for tables/kanban) */
  fullHeight?: boolean;
  sx?: SxProps<Theme>;
}

export function PageShell({
  children,
  fullHeight = false,
  sx,
}: PageShellProps) {
  return (
    <Box
      sx={{
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
        maxWidth: 1440,
        mx: 'auto',
        width: '100%',
        ...(fullHeight && {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// ── PageHeader ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
  mb?: number;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  mb = 3,
}: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={1.5}
      mb={mb}
    >
      <Box>
        {typeof title === 'string' ? (
          <Typography variant="h5" fontWeight={700}>
            {title}
          </Typography>
        ) : (
          title
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  children: ReactNode;
  mb?: number;
}

export function FilterBar({ children, mb = 2.5 }: FilterBarProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb,
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        flexWrap="wrap"
        useFlexGap
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        {children}
      </Stack>
    </Paper>
  );
}

// ── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** When inside a card/content area that already has a border */
  plain?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  plain = false,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 8,
        px: 3,
        ...(!plain && {
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
        }),
      }}
    >
      {icon && (
        <Box sx={{ mb: 2, color: 'text.disabled', fontSize: 0 }}>{icon}</Box>
      )}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.disabled"
          sx={{ mb: action ? 3 : 0, maxWidth: 400 }}
        >
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}

export default PageShell;
