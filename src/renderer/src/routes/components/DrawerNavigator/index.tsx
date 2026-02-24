import { type IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { ResponsiveShow } from '@renderer/components/ResponsiveShow';
import { DrawerDesktop } from './Drawer/DrawerDesktop';
import { DrawerMobile } from './Drawer/DrawerMobile';
import { Header } from './Header';
import { Container, DrawerContent, MainContainer, MainContent } from './styles';
import { PropsWithChildren } from 'react';

export const ROUTES_MAIN_SECTION_ID = 'main-route-section';

type Props = {
  sections: IDrawerSection[];
};

export function DrawerNavigator({
  sections,
  children,
}: Readonly<PropsWithChildren<Props>>) {
  return (
    <Container>
      <DrawerContent>
        <ResponsiveShow>
          <ResponsiveShow.When sizes={['xl', 'lg', 'sm', 'md']}>
            <DrawerDesktop sections={sections} />
          </ResponsiveShow.When>

          <ResponsiveShow.Else>
            <DrawerMobile sections={sections} />
          </ResponsiveShow.Else>
        </ResponsiveShow>
      </DrawerContent>

      <MainContainer>
        <Header />
        <MainContent id={ROUTES_MAIN_SECTION_ID}>{children}</MainContent>
      </MainContainer>
    </Container>
  );
}
