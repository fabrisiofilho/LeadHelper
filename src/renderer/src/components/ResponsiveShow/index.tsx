import { useResponsiveCurrentSize } from '@renderer/hooks/responsiveCurrentSize';
import type { ScreenSize } from '@renderer/styles/styledTheme';
import { Children, type ReactElement } from 'react';

type ChildrenProps = {
  sizes: ScreenSize[];
  children: ReactElement | ReactElement[];
};

type Props = {
  children: ReactElement<ChildrenProps> | ReactElement<ChildrenProps>[];
};

export const ResponsiveShow = (props: Readonly<Props>) => {
  let when: ReactElement | null = null;
  let otherwise: ReactElement | null = null;

  const currentSize = useResponsiveCurrentSize();

  Children.forEach(props.children, (children) => {
    if (children?.props?.sizes === undefined) {
      otherwise = children;
    } else if (!when && !!children?.props?.sizes.includes(currentSize)) {
      when = children;
    }
  });

  return when ?? otherwise;
};

ResponsiveShow.When = ({ sizes, children }: Readonly<ChildrenProps>) => {
  return <>{sizes ? children : null}</>;
};

ResponsiveShow.Else = ({
  children,
}: Readonly<Omit<ChildrenProps, 'sizes'>>) => <>{children}</>;
