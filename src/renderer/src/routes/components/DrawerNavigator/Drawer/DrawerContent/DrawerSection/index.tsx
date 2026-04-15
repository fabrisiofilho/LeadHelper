import { Show } from '@renderer/components/Show';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { DrawerItem } from '../DrawerCategoryList/DrawerItem';
import {
  SectionContainer,
  SectionHeader,
  SectionTitle,
  ItemsContainer,
} from './styles';

type Props = {
  section: IDrawerSection;
  currentPath: string;
  compacted: boolean;
  onChangeCompacted: () => void;
};

export function DrawerSection({
  section,
  currentPath,
  compacted,
  onChangeCompacted,
}: Readonly<Props>) {
  const { title, items } = section;

  return (
    <SectionContainer>
      <Show.When isTrue={!compacted}>
        <SectionHeader>
          <SectionTitle variant="caption">{title}</SectionTitle>
        </SectionHeader>
      </Show.When>

      <ItemsContainer>
        {items.map((item) => (
          <DrawerItem
            key={item.label}
            item={item}
            currentPath={currentPath}
            compacted={compacted}
            onChangeCompacted={onChangeCompacted}
          />
        ))}
      </ItemsContainer>
    </SectionContainer>
  );
}
