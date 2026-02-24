import type { IBreadCrumbs } from '@renderer/types/breadCrumbs';
import { Typography } from '@mui/material';
import {
  CustomBreadcrumbs,
  CustomLink,
  HomeIcon,
  SeparatorIcon,
} from './styles';

type Props = {
  breadcrumbs: IBreadCrumbs | undefined;
};

export function BreadcrumbDesktop({ breadcrumbs }: Readonly<Props>) {
  return (
    <CustomBreadcrumbs separator={<SeparatorIcon />} aria-label="breadcrumb">
      <CustomLink key={0} color="inherit" to={breadcrumbs?.home ?? ''} end>
        <Typography variant="body2">
          <HomeIcon />
        </Typography>
      </CustomLink>

      {breadcrumbs?.items?.map((item) => (
        <CustomLink key={item.label} color="inherit" to={item.path} end>
          <Typography variant="body2">{item.label}</Typography>
        </CustomLink>
      ))}
    </CustomBreadcrumbs>
  );
}
