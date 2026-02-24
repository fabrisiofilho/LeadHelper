import { rgba } from 'polished';
import { type FC, type PropsWithChildren } from 'react';
import styled, { css } from 'styled-components';

export type SituationChipColor = 'error' | 'success' | 'warn' | 'grey';

type SituationChipProps = {
  color: SituationChipColor;
};

export const BaseChip = styled.div<SituationChipProps>`
  cursor: default;
  width: fit-content;
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;

  & + & {
    margin-left: 0.625rem;
  }

  ${({ color, theme }) => {
    if (color === 'grey') {
      return css`
        span {
          color: ${theme.COLORS.grey_600};
          font-size: smaller;
          font-weight: 800;
        }

        background-color: ${rgba(theme.COLORS.grey_600, 0.16)};
      `;
    }

    return css`
      span {
        color: ${theme.COLORS[`${color}_300`]};
        font-size: smaller;
        font-weight: 800;
      }

      background-color: ${rgba(theme.COLORS[color], 0.16)};
    `;
  }};
`;

export const SituationChip: FC<
  Readonly<PropsWithChildren<SituationChipProps>>
> = ({ children, color }) => {
  return (
    <BaseChip color={color}>
      <span>{children}</span>
    </BaseChip>
  );
};
