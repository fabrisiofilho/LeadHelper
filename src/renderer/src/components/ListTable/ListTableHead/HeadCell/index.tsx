import {
  type IPageSort,
  PageSortDirectionEnum,
} from '@renderer/types/page/sort';
import { Box, Stack, TableCell, Typography } from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import type { MouseEvent } from 'react';
import type { ListTableHeadCell } from '../..';
import { SortIcon } from './SortIcon';
import { CustomTableSortLabel } from './styles';

type Props = {
  headCell: ListTableHeadCell;

  sorts: IPageSort[];
  handleSort: (sort: IPageSort) => (event: MouseEvent<unknown>) => void;
};

export function HeadCell({ headCell, sorts, handleSort }: Readonly<Props>) {
  const { label, noOrder, align, id } = headCell;

  const sortIndex = sorts.findIndex((item) => item.property === id);
  const sort = sorts[sortIndex];
  const sortDirection = sort?.direction;

  const getHandleSortParam = (): IPageSort => {
    if (sort) {
      let newDirection: PageSortDirectionEnum | undefined;

      if (!sortDirection) {
        newDirection = PageSortDirectionEnum.ASC;
      } else if (sortDirection === PageSortDirectionEnum.ASC) {
        newDirection = PageSortDirectionEnum.DESC;
      }

      return { ...sort, direction: newDirection! };
    }

    return { property: id, direction: PageSortDirectionEnum.ASC };
  };

  const getSortDirectionForMui = (): 'asc' | 'desc' | false => {
    if (!sortDirection) return false;
    return sortDirection === PageSortDirectionEnum.ASC ? 'asc' : 'desc';
  };

  const renderLabel = () => {
    if (typeof label === 'string') {
      return (
        <Typography
          variant="body2"
          fontWeight="bold"
          color="grey.600"
          whiteSpace="nowrap"
        >
          {label}
        </Typography>
      );
    }

    return label;
  };

  const renderSortIcon = () => {
    const sortIconPosition = sorts.length > 1 ? sortIndex + 1 : 0;

    return <SortIcon direction={sortDirection} position={sortIconPosition} />;
  };

  if (noOrder) {
    return (
      <TableCell sx={{ width: headCell.width }}>
        <Stack flex={1} alignItems={`flex-${align ?? 'end'}`}>
          {renderLabel()}
        </Stack>
      </TableCell>
    );
  }

  return (
    <TableCell
      key={id}
      sortDirection={getSortDirectionForMui()}
      sx={{ width: headCell.width }}
    >
      <CustomTableSortLabel
        IconComponent={renderSortIcon}
        onClick={handleSort(getHandleSortParam())}
        color="grey.600"
      >
        {renderLabel()}

        {sort ? (
          <Box component="span" sx={visuallyHidden}>
            {sortDirection === PageSortDirectionEnum.DESC
              ? 'sorted descending'
              : 'sorted ascending'}
          </Box>
        ) : null}
      </CustomTableSortLabel>
    </TableCell>
  );
}
