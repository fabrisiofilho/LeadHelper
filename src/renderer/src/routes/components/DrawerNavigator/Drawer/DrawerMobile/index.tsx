import { useAppDispatch, useAppSelector } from '@renderer/hooks/redux';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { closeDrawer } from '@renderer/redux/slices/drawer';
import { Drawer } from '@mui/material';
import { DrawerContent } from '../DrawerContent';

type Props = {
  sections: IDrawerSection[];
};

export function DrawerMobile({ sections }: Readonly<Props>) {
  const dispatch = useAppDispatch();

  const { compacted } = useAppSelector((state) => state.drawer);

  const handleCloseDrawer = () => {
    dispatch(closeDrawer());
  };

  return (
    <Drawer anchor="left" open={!compacted} onClose={handleCloseDrawer}>
      <DrawerContent
        compacted={compacted}
        sections={sections}
        onChangeCompacted={handleCloseDrawer}
      />
    </Drawer>
  );
}
