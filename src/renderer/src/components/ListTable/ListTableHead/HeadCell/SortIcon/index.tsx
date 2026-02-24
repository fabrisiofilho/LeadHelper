import { PageSortDirectionEnum } from '@renderer/types/page/sort';
import { AscIcon, Container, CustomBadge, DescIcon } from './styles';

type Props = {
  direction: PageSortDirectionEnum | false;
  position: number;
};

export function SortIcon({ direction, position }: Readonly<Props>) {
  const isDesc = direction === PageSortDirectionEnum.DESC;
  const iconClassName = (!direction && 'not-active') || '';

  return (
    <Container>
      <CustomBadge badgeContent={position}>
        {!isDesc ? <AscIcon className={iconClassName} /> : <DescIcon />}
      </CustomBadge>
    </Container>
  );
}
