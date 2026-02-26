import {
  Box,
  Skeleton,
  Stack,
  CircularProgress,
  Typography,
} from '@mui/material';

interface ContentLoadingProps {
  /** Show skeleton placeholders (default) or a centered spinner */
  variant?: 'skeleton' | 'spinner';
  /** Number of skeleton rows to show */
  rows?: number;
  /** Height of each skeleton row */
  rowHeight?: number;
  /** Optional message below spinner */
  message?: string;
  /** Minimum height for the container */
  minHeight?: number;
}

export function ContentLoading({
  variant = 'skeleton',
  rows = 4,
  rowHeight = 60,
  message,
  minHeight = 200,
}: ContentLoadingProps) {
  if (variant === 'spinner') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight,
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Stack spacing={2} sx={{ minHeight }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={rowHeight}
          sx={{ borderRadius: '0.75rem' }}
        />
      ))}
    </Stack>
  );
}

export default ContentLoading;
