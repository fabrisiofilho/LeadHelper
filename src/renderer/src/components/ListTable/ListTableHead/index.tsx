import type { IPageSort } from '@renderer/types/page/sort';
import { TableHead, TableRow } from '@mui/material';
import type { MouseEvent } from 'react';
import type { ListTableHeadCell } from '..';
import { HeadCell } from './HeadCell';

type Props = {
  onRequestSort: (event: MouseEvent<unknown>, sort: IPageSort) => void;
  sorts: IPageSort[];
  headCells: ListTableHeadCell[];
};

export function ListTableHead(props: Readonly<Props>) {
  const { headCells, sorts, onRequestSort } = props;

  const handleSort = (sort: IPageSort) => (event: MouseEvent<unknown>) => {
    onRequestSort(event, sort);
  };

  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <HeadCell
            key={headCell.id}
            handleSort={handleSort}
            headCell={headCell}
            sorts={sorts}
          />
        ))}
      </TableRow>
    </TableHead>
  );
}
