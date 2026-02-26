import styled from 'styled-components';
import { Box } from '@mui/material';

export const PageContainer = styled(Box)`
  padding: 1.5rem;
  min-height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  background-color: ${({ theme }) => theme.COLORS.background};

  @media ${({ theme }) => theme.SIZES.xs} {
    padding: 1rem;
  }
`;
