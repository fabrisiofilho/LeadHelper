import styled from 'styled-components';
export const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background-color: ${({ theme }) => theme.COLORS.grey_100};
`;
export const MessageContainer = styled.div`
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;
