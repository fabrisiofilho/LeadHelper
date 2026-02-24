import { useDebounce } from '@renderer/hooks/debounce';
import { useAppDispatch, useAppSelector } from '@renderer/hooks/redux';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { closeDrawer, openDrawer } from '@renderer/redux/slices/drawer';
import { useState } from 'react';
import { DrawerContent } from '../DrawerContent';
import { DynamicWidthContainer } from './styles';

type Props = {
  sections: IDrawerSection[];
};

export function DrawerDesktop({ sections }: Readonly<Props>) {
  const dispatch = useAppDispatch();

  const { compacted } = useAppSelector((state) => state.drawer);

  const [isHovering, setIsHovering] = useState(false);
  const debouncedHovering = useDebounce(isHovering, 150);

  const isCompacted = compacted && !debouncedHovering;

  const handleOnClickArrowButton = () => {
    if (compacted) {
      dispatch(openDrawer());
      return;
    }

    dispatch(closeDrawer());
  };

  return (
    <DynamicWidthContainer
      compacted={isCompacted}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <DrawerContent
        sections={sections}
        compacted={isCompacted}
        onChangeCompacted={handleOnClickArrowButton}
      />
    </DynamicWidthContainer>
  );
}
