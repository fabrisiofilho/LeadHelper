import { TableSortLabel } from '@mui/material';
import styled from '@mui/styled-engine';

export const CustomTableSortLabel = styled(TableSortLabel)`
  .not-active {
    opacity: 0;
  }

  &:hover {
    .not-active {
      opacity: 0.48;
    }
  }
`;
