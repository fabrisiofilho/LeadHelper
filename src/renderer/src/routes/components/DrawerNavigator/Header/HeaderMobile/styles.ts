import styled from 'styled-components';

export const Container = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;

  z-index: 1;
  height: 4rem;
  padding: 0rem 1.4rem;

  border-bottom: ${({ theme }) => theme.BORDERS.b_01};
  background-color: ${({ theme }) => theme.COLORS.surface};
`;
