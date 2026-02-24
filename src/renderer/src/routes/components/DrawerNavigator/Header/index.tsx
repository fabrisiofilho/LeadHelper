import { ResponsiveShow } from '@renderer/components/ResponsiveShow';
import { HeaderDesktop } from './HeaderDesktop';
import { HeaderMobile } from './HeaderMobile';

export function Header() {
  return (
    <ResponsiveShow>
      <ResponsiveShow.When sizes={['xl', 'lg', 'sm', 'md']}>
        <HeaderDesktop />
      </ResponsiveShow.When>

      <ResponsiveShow.Else>
        <HeaderMobile />
      </ResponsiveShow.Else>
    </ResponsiveShow>
  );
}
