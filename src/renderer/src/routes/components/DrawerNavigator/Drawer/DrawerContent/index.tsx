import { useState, useCallback, useEffect } from 'react';
import { AppVersion } from '@renderer/components/AppVersion';
import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { useLocation } from 'react-router-dom';
import { drawerStorage } from '@renderer/localStorage/drawerStorage';
import { DrawerArrowButton } from './DrawerArrowButton';
import { DrawerSection } from './DrawerSection';
import { Container, Content, LogoContainer, LogoText } from './styles';

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

  const [expandedSections, setExpandedSections] = useState<string[]>(() =>
    drawerStorage.getExpandedSections(),
  );

  // Persist expanded sections to localStorage
  useEffect(() => {
    drawerStorage.setExpandedSections(expandedSections);
  }, [expandedSections]);

  const handleToggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id) => id !== sectionId);
      }
      return [...prev, sectionId];
    });
  }, []);

  return (
    <Container compacted={compacted}>
      <LogoContainer>
        <LogoText compacted={compacted}>TeamFlow</LogoText>

        <DrawerArrowButton onClick={onChangeCompacted} />
      </LogoContainer>

      <Content>
        {sections.map((section) => (
          <DrawerSection
            key={section.id}
            section={section}
            currentPath={`${pathname}${search}`}
            compacted={compacted}
            expanded={expandedSections.includes(section.id)}
            onToggleExpanded={() => handleToggleSection(section.id)}
            onChangeCompacted={onChangeCompacted}
          />
        ))}
      </Content>

      <AppVersion compacted={compacted} />
    </Container>
  );
}
