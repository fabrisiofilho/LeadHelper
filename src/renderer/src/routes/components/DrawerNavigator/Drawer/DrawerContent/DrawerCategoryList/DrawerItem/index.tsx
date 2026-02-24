import { Show } from '@renderer/components/Show';
import { useResponsiveCurrentSize } from '@renderer/hooks/responsiveCurrentSize';
import {
  type IDrawerItem,
  type IDrawerSubItem,
} from '@renderer/types/drawer/drawerItem';
import { Stack, Typography } from '@mui/material';
import {
  ClosedIcon,
  ListItem,
  ListSubItem,
  OpenIcon,
  SubItemIcon,
} from './styles';

type Props = {
  item: IDrawerItem;
  currentPath: string;
  compacted: boolean;
  onChangeCompacted: () => void;
};

export function DrawerItem({
  item,
  currentPath,
  compacted,
  onChangeCompacted,
}: Readonly<Props>) {
  const { label, icon, path, subItems } = item;

  const isSelected = currentPath.includes(path);

  const hasSubItems = subItems?.length;

  const isSubItemSelected = (subItem: IDrawerSubItem) => {
    return currentPath === subItem.path;
  };

  const isMobile = useResponsiveCurrentSize() === 'xs';

  return (
    <>
      <ListItem
        key={label}
        to={path}
        onClick={isMobile && !hasSubItems ? onChangeCompacted : () => {}}
      >
        {icon}

        <Show.When isTrue={!compacted}>
          <Typography flex={1} variant="body2">
            {label}
          </Typography>

          <Stack visibility={hasSubItems ? 'visible' : 'hidden'}>
            {isSelected ? <OpenIcon /> : <ClosedIcon />}
          </Stack>
        </Show.When>
      </ListItem>

      <Show.When isTrue={!compacted && isSelected}>
        <>
          {subItems?.map(
            (subItem) =>
              subItem.canAccess && (
                <ListSubItem
                  key={subItem.label}
                  to={subItem.path}
                  end={subItem.end}
                  isActive={isSubItemSelected(subItem)}
                  onClick={isMobile ? onChangeCompacted : () => {}}
                >
                  <SubItemIcon />
                  <Typography flex={1} variant="body2">
                    {subItem.label}
                  </Typography>
                </ListSubItem>
              ),
          )}
        </>
      </Show.When>
    </>
  );
}
