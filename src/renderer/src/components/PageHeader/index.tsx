import type { IBreadCrumbs } from '@renderer/types/breadCrumbs';
import { muiResponsiveValues } from '@renderer/utils/responsive';
import { Box, Stack, Typography } from '@mui/material';
import { type ReactNode } from 'react';
import { Breadcrumb } from './BreadCrumb';

type Props = {
  title: string;
  breadcrumbs: IBreadCrumbs;
  rightContent?: ReactNode;
};

export function PageHeader({ title, breadcrumbs, rightContent }: Props) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems={muiResponsiveValues('flex-start', 'flex-start', 'center')}
      pb="2.5rem"
    >
      <Stack mt={muiResponsiveValues('0.1rem', '0.1rem', 0)}>
        <Stack direction="row" alignItems="center">
          <Typography variant="h4" mr="0.5rem">
            {title}
          </Typography>
        </Stack>

        <Breadcrumb breadcrumbs={breadcrumbs} />
      </Stack>

      <Box>{rightContent}</Box>
    </Stack>
  );
}
