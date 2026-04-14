import styled, { css } from 'styled-components';
import { rgba } from 'polished';
import {
  KeyboardArrowRight,
  KeyboardArrowDown,
  FiberManualRecord,
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';

export const ListItem = styled(NavLink)`
  align-self: stretch;

  display: flex;
  align-items: center;

  position: relative;
  padding: 0.67rem 0.45rem 0.67rem 2rem;
  margin-right: 0.75rem;

  border-top-right-radius: 2.5rem;
  border-bottom-right-radius: 2.5rem;

  color: ${({ theme }) => theme.COLORS.grey_600};

  cursor: pointer;

  p {
    margin-left: 0.5rem;
  }

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  }

  &.active {
    background-color: ${({ theme }) => rgba(theme.COLORS.primary, 0.08)};
    color: ${({ theme }) => theme.COLORS.primary};

    p {
      font-weight: 600;
      color: ${({ theme }) => theme.COLORS.primary};
    }

    svg {
      font-weight: 600;
      color: ${({ theme }) => theme.COLORS.primary};
    }

    &:hover {
      background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
    }

    &:before {
      position: absolute;
      left: 0;

      width: 0.3rem;
      height: 60%;
      content: '';

      background-color: ${({ theme }) => theme.COLORS.primary};
      border-top-right-radius: 9rem;
      border-bottom-right-radius: 9rem;
    }
  }
`;

type ListSubItemProps = {
  isActive: boolean;
};

export const ListSubItem = styled(NavLink)<ListSubItemProps>`
  align-self: stretch;

  display: flex;
  align-items: center;

  position: relative;
  padding: 0.75rem 0.45rem 0.75rem 2rem;
  margin-right: 0.75rem;

  border-top-right-radius: 2.5rem;
  border-bottom-right-radius: 2.5rem;

  color: ${({ theme }) => theme.COLORS.grey_600};

  cursor: pointer;

  p {
    margin-left: 0.5rem;
  }

  svg {
    font-size: 0.25rem;
  }

  ${({ isActive }) =>
    isActive &&
    css`
      p {
        font-weight: 600;
      }

      svg {
        font-size: 0.5rem;
        color: ${({ theme }) => theme.COLORS.primary};
      }
    `}
`;

export const SubItemIcon = styled(FiberManualRecord)``;

export const ClosedIcon = styled(KeyboardArrowRight)``;

export const OpenIcon = styled(KeyboardArrowDown)``;
