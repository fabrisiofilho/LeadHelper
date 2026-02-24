import styled, { css } from 'styled-components';

type ChipProps = {
  color: string;
  bgColor: string;
};

export const Chip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['bgColor'].includes(prop),
})<ChipProps>`
  cursor: pointer;

  display: flex;
  direction: row;
  align-items: center;
  align-self: center;
  gap: 0.5rem;

  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.2rem 0.5rem;
  border-radius: 1rem;

  ${({ color, bgColor }) => css`
    color: ${color};
    background-color: ${bgColor};
  `}
`;
