import { ResponsiveShow } from '@renderer/components/ResponsiveShow';
import type { IBreadCrumbs } from '@renderer/types/breadCrumbs';
import { BreadcrumbDesktop } from './BreadcrumbDesktop';
import { BreadcrumbMobile } from './BreadcrumbMobile';

type Props = {
  breadcrumbs: IBreadCrumbs | undefined;
};

export function Breadcrumb({ breadcrumbs }: Readonly<Props>) {
  return (
    <ResponsiveShow>
      <ResponsiveShow.When sizes={['md', 'lg', 'xl']}>
        <BreadcrumbDesktop breadcrumbs={breadcrumbs} />
      </ResponsiveShow.When>
      <ResponsiveShow.Else>
        <BreadcrumbMobile breadcrumbs={breadcrumbs} />
      </ResponsiveShow.Else>
    </ResponsiveShow>
  );
}
