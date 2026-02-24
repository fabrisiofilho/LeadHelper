import styled, { css } from 'styled-components';
import { Typography } from '@mui/material';

export const SectionContainer = styled.div`
  margin-top: 0.5rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.5rem 0.5rem 2rem;
  cursor: pointer;
  border-radius: 0.25rem;

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.grey_100};
  }
`;

export const SectionTitle = styled(Typography)`
  color: ${({ theme }) => theme.COLORS.grey_500};
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  user-select: none;
`;

type ItemsContainerProps = {
  expanded: boolean;
};

export const ItemsContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'expanded',
})<ItemsContainerProps>`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    max-height 0.25s ease-in-out,
    opacity 0.2s ease-in-out;

  ${({ expanded }) =>
    expanded
      ? css`
          max-height: 500px;
          opacity: 1;
        `
      : css`
          max-height: 0;
          opacity: 0;
        `}
`;

export const ExpandIcon = styled.div<{ expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.COLORS.grey_500};
  transition: transform 0.2s ease-in-out;

  ${({ expanded }) =>
    expanded &&
    css`
      transform: rotate(180deg);
    `}
`;
