import { Show } from '@renderer/components/Show';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { DrawerItem } from '../DrawerCategoryList/DrawerItem';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import {
  SectionContainer,
  SectionHeader,
  SectionTitle,
  ItemsContainer,
  ExpandIcon,
} from './styles';

type Props = {
  section: IDrawerSection;
  currentPath: string;
  compacted: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChangeCompacted: () => void;
};

export function DrawerSection({
  section,
  currentPath,
  compacted,
  expanded,
  onToggleExpanded,
  onChangeCompacted,
}: Readonly<Props>) {
  const { title, items } = section;

  // When compacted, always show items (no accordion)
  const showItems = compacted || expanded;

  return (
    <SectionContainer>
      <Show.When isTrue={!compacted}>
        <SectionHeader onClick={onToggleExpanded}>
          <SectionTitle variant="caption">{title}</SectionTitle>
          <ExpandIcon expanded={expanded}>
            <ExpandMoreIcon fontSize="small" />
          </ExpandIcon>
        </SectionHeader>
      </Show.When>

      <ItemsContainer expanded={showItems}>
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
