import type { IPageSort } from '@renderer/types/page/sort';
import { TableBody, TablePagination, Tooltip } from '@mui/material';
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import { type ChangeEvent, type MouseEvent, type ReactNode } from 'react';
import { EmptyListMessage } from '../EmptyListMessage';
import { Loading } from '../Loading';
import { Show } from '../Show';
import { ListTableHead } from './ListTableHead';
import {
  Container,
  CustomStack,
  CustomTable,
  CustomTableContainer,
  CustomTableHeader,
  CustomTableRow,
} from './styles';

interface LabelDisplayedRowsArgs {
  from: number;
  to: number;
  count: number;
  page: number;
}

function defaultLabelDisplayedRows({ from, to }: LabelDisplayedRowsArgs) {
  return `${from}–${to}`;
}

export type ContentProps = {
  [key: string]: string | ReactNode;
};

export type ListTableRow = {
  id: string | number;
  onClick?: () => void;
  content: ContentProps;

  disabled?: boolean;

  disabledTooltip?: string;
};

export type ListTableHeadCell = {
  id: string;
  label: string | ReactNode;
  align?: 'start' | 'end' | 'center';
  noOrder?: boolean;
  width?: string | number;
};

type Props = {
  disableShadow?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  headCells: ListTableHeadCell[];
  rows: ListTableRow[];
  page: number;
  totalElements: number;
  rowsPerPage: number;
  rowsPerPageOptions?: number[];
  showList?: boolean;
  sorts: IPageSort[];
  onChangeSorts: (newSorts: IPageSort[]) => void;
  onChangePage: (newPage: number) => void;
  onChangeRowsPerPage: (rowsPerPage: number) => void;
  scrollAtTop?: boolean;
  fullHeight?: boolean;
};

export function ListTable({
  header = <></>,
  footer,
  headCells,
  rows,
  page,
  rowsPerPage,
  totalElements,
  rowsPerPageOptions,
  loading,
  sorts,
  onChangeSorts,
  onChangePage,
  onChangeRowsPerPage,
  disableShadow,
  showList = true,
  scrollAtTop,
  fullHeight,
}: Readonly<Props>) {
  const handleRequestSort = (_: MouseEvent<unknown>, sort: IPageSort) => {
    if (!sort.direction) {
      onChangeSorts(sorts.filter((item) => item.property !== sort.property));
      return;
    }

    const sortOnList = sorts.some((item) => item.property === sort.property);

    if (!sortOnList) {
      onChangeSorts([...sorts, sort]);
      return;
    }

    onChangeSorts(
      sorts.map((item) => {
        if (item.property === sort.property) {
          return sort;
        }

        return item;
      }),
    );
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    onChangePage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);

    onChangeRowsPerPage(value);
    onChangePage(0);
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <CustomStack
          alignItems="center"
          justifyContent="center"
          py="2rem"
          scrollAtTop={scrollAtTop}
          fullHeight={fullHeight}
        >
          <Loading />
        </CustomStack>
      );
    }

    if (rows?.length <= 0) {
      return (
        <CustomStack
          scrollAtTop={scrollAtTop}
          justifyItems="center"
          alignItems="center"
        >
          <EmptyListMessage
            title="Não há nenhum resultado"
            size="large"
            fillContainer={fullHeight}
            description={
              <>
                Talvez seja necessário usar outras palavras-chave, verificar
                <br />
                erros de digitação ou ajustar os filtros.
              </>
            }
          />
        </CustomStack>
      );
    }

    return (
      <CustomTable
        aria-labelledby="tableTitle"
        size="medium"
        scrollAtTop={scrollAtTop}
      >
        <ListTableHead
          headCells={headCells}
          sorts={sorts}
          onRequestSort={handleRequestSort}
        />
        <TableBody>
          {rows?.map((row) => {
            const keys = Object.keys(row.content);
            const values = Object.values(row.content);

            const rowContent = (
              <CustomTableRow
                tabIndex={-1}
                key={row.id}
                onClick={row.disabled ? undefined : row.onClick}
                sx={row.disabled ? { cursor: 'not-allowed' } : undefined}
              >
                {values.map((value, index) => (
                  <TableCell align="left" key={`${keys[index]}`}>
                    {value}
                  </TableCell>
                ))}
              </CustomTableRow>
            );

            if (row.disabled && row.disabledTooltip) {
              return (
                <Tooltip
                  key={row.id}
                  title={row.disabledTooltip}
                  placement="top"
                  arrow
                  slotProps={{
                    tooltip: {
                      sx: {
                        bgcolor: 'grey.800',
                        fontSize: '0.75rem',
                        maxWidth: 300,
                        textAlign: 'center',
                        py: 1,
                        px: 1.5,
                      },
                    },
                    arrow: {
                      sx: {
                        color: 'grey.800',
                      },
                    },
                  }}
                >
                  {rowContent}
                </Tooltip>
              );
            }

            return rowContent;
          })}
        </TableBody>
      </CustomTable>
    );
  };

  return (
    <Container disableShadow={disableShadow} fullHeight={fullHeight}>
      <CustomTableHeader>{header}</CustomTableHeader>
      <CustomTableContainer
        hasFooter={Boolean(footer)}
        scrollAtTop={scrollAtTop}
        fullHeight={fullHeight}
      >
        <Show.When isTrue={!!showList}>{renderTableBody()}</Show.When>
      </CustomTableContainer>

      <TablePagination
        component="div"
        labelRowsPerPage={
          !rowsPerPageOptions?.length ? '' : 'Resultados por página:'
        }
        slotProps={{
          select: {
            sx: {
              display: !rowsPerPageOptions?.length ? 'none' : 'flex',
            },
          },
        }}
        count={totalElements}
        page={page}
        rowsPerPageOptions={rowsPerPageOptions}
        rowsPerPage={rowsPerPage}
        labelDisplayedRows={defaultLabelDisplayedRows}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      <Show.When isTrue={!!footer}>
        <Box p={3}>{footer}</Box>
      </Show.When>
    </Container>
  );
}
