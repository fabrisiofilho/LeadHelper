import { type IDrawerItem } from '@renderer/types/drawer/drawerItem';
import { Box } from '@mui/material';
import { DrawerItem } from './DrawerItem';

type Props = {
  list: IDrawerItem[];
  currentPath: string;
  compacted: boolean;
  onChangeCompacted: () => void;
};

export function DrawerCategoryList({
  list,
  currentPath,
  compacted,
  onChangeCompacted,
}: Readonly<Props>) {
  return (
    <Box mt="1rem">
      {list.map((item) => (
        <DrawerItem
          key={item.label}
          item={item}
          currentPath={currentPath}
          compacted={compacted}
          onChangeCompacted={onChangeCompacted}
        />
      ))}
    </Box>
  );
}
