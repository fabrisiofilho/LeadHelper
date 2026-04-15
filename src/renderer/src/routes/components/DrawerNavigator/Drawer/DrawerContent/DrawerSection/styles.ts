import styled from 'styled-components';
import { Typography } from '@mui/material';

export const SectionContainer = styled.div`
  margin-top: 0.5rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem 0.5rem 2rem;
  border-radius: 0.25rem;
`;

export const SectionTitle = styled(Typography)`
  color: ${({ theme }) => theme.COLORS.textSecondary};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;
`;

export const ItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;
