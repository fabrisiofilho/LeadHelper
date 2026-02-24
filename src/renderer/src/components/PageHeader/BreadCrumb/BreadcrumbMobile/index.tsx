import { Show } from '@renderer/components/Show';
import type { IBreadCrumbs } from '@renderer/types/breadCrumbs';
import { MenuItem, Stack, Typography } from '@mui/material';
import { type MouseEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BreadcrumbButton,
  CustomMenu,
  MoreIcon,
  SeparatorIcon,
} from './styles';

type Props = {
  breadcrumbs: IBreadCrumbs | undefined;
};

export function BreadcrumbMobile({ breadcrumbs }: Readonly<Props>) {
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = !!anchorEl;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const itensLength = breadcrumbs?.items?.length ?? 0;

  const lastItem = breadcrumbs?.items?.[itensLength - 1];

  const menuItems = breadcrumbs?.items?.slice(0, itensLength - 1);

  const goToBreadcrumbItemPath = (path: string) => () => {
    navigate(path);
    handleClose();
  };

  const breadcrumbMenuItems = (() => {
    return menuItems?.map(({ label, path }) => (
      <MenuItem
        key={path}
        onClick={goToBreadcrumbItemPath(path)}
        disableTouchRipple
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <SeparatorIcon />
          <Typography variant="body2">{label}</Typography>
        </Stack>
      </MenuItem>
    ));
  })();
  return (
    <>
      <Stack direction="row" alignItems="center" gap={0.5} px={1}>
        <Show.When isTrue={!!menuItems?.length}>
          <BreadcrumbButton
            onClick={handleClick}
            aria-controls={open ? 'breadcrumb-button-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
          >
            <MoreIcon />
          </BreadcrumbButton>
        </Show.When>
        <SeparatorIcon />
        <Typography variant="body2" color="grey.500">
          {lastItem?.label}
        </Typography>
      </Stack>
      <CustomMenu
        id="breadcrumb-button-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'header-button',
        }}
      >
        {breadcrumbMenuItems}
      </CustomMenu>
    </>
  );
}
