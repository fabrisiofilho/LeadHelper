import type { IListTableFilters } from '@renderer/types/page/listTableFilters';
import type { IListTableHeaderField } from '@renderer/types/page/listTableHeaderFilters';
import type { BaseTextFieldProps } from '@mui/material';
import { ResponsiveShow } from '../ResponsiveShow';
import { ListTableHeaderDesktop } from './ListTableHeaderDesktop';
import { ListTableHeaderMobile } from './ListTableHeaderMobile';
import { Container } from './styles';

type Props<T> = {
  searchLabel?: string;
  searchPosition?: 'right' | 'left';
  iconPosition?: 'right' | 'left';
  headerFields?: IListTableHeaderField<T>[];
  filters?: IListTableFilters<T>;
  defaultFilters?: IListTableFilters<T>;
  padding?: string;
  hideSearch?: boolean;
  initialSearchValue?: string;
  onChangeSearch: (search: string) => void;
  onChangeFilters?: (filters: IListTableFilters<T>) => void;
  onCleanSorts?: () => void;
  hideWipeFieldsButton?: boolean;
  searchFieldSize?: BaseTextFieldProps['size'];
};

export function ListTableHeader<T>(props: Readonly<Props<T>>) {
  return (
    <Container>
      <ResponsiveShow>
        <ResponsiveShow.When sizes={['xs', 'sm']}>
          <ListTableHeaderMobile {...props} />
        </ResponsiveShow.When>
        <ResponsiveShow.Else>
          <ListTableHeaderDesktop {...props} />
        </ResponsiveShow.Else>
      </ResponsiveShow>
    </Container>
  );
}
