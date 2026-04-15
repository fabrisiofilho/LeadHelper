import { AppVersion } from '@renderer/components/AppVersion';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { useLocation } from 'react-router-dom';
import { DrawerArrowButton } from './DrawerArrowButton';
import { DrawerSection } from './DrawerSection';
import { Container, Content, LogoContainer, LogoImage } from './styles';
import leadhelperLogo from '@renderer/assets/leadhelper_logo.png';

type Props = {
  sections: IDrawerSection[];
  compacted: boolean;
  onChangeCompacted: () => void;
};

export function DrawerContent({
  sections,
  compacted,
  onChangeCompacted,
}: Readonly<Props>) {
  const { pathname, search } = useLocation();

  return (
    <Container compacted={compacted}>
      <LogoContainer>
        <LogoImage
          src={leadhelperLogo}
          alt="LeadHelper"
          compacted={compacted}
        />
        <DrawerArrowButton onClick={onChangeCompacted} />
      </LogoContainer>

      <Content>
        {sections.map((section) => (
          <DrawerSection
            key={section.id}
            section={section}
            currentPath={`${pathname}${search}`}
            compacted={compacted}
            onChangeCompacted={onChangeCompacted}
          />
        ))}
      </Content>

      <AppVersion compacted={compacted} />
    </Container>
  );
}
