import styled from 'styled-components';
import { Box, Stack, Avatar } from '@mui/material';

type CardVariant = 'primary' | 'success' | 'error' | 'info' | 'warning';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getVariantColors = (theme: any, variant: CardVariant) => {
  const variants = {
    primary: {
      bg: theme.COLORS.primary_100,
      icon: theme.COLORS.primary,
    },
    success: {
      bg: theme.COLORS.success_100,
      icon: theme.COLORS.success,
    },
    error: {
      bg: theme.COLORS.error_100,
      icon: theme.COLORS.error,
    },
    info: {
      bg: theme.COLORS.info_100,
      icon: theme.COLORS.info,
    },
    warning: {
      bg: theme.COLORS.warn_100,
      icon: theme.COLORS.warn,
    },
  };
  return variants[variant];
};

export const SummaryCard = styled(Box)<{ $variant?: CardVariant }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  min-width: 200px;
  flex: 1;

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.SHADOWS.z_12};
  }
`;

export const SummaryCardIcon = styled(Box)<{ $variant?: CardVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  background-color: ${({ theme, $variant }) =>
    $variant ? getVariantColors(theme, $variant).bg : theme.COLORS.primary_100};

  svg {
    font-size: 1.5rem;
    color: ${({ theme, $variant }) =>
      $variant ? getVariantColors(theme, $variant).icon : theme.COLORS.primary};
  }
`;

export const SummaryCardContent = styled(Box)`
  flex: 1;
  min-width: 0;
`;

export const SummaryCardValue = styled.p`
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: ${({ theme }) => theme.COLORS.text};
`;

export const SummaryCardLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.COLORS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const FiltersContainer = styled(Stack).attrs({
  direction: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  useFlexGap: true,
})`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 0.75rem;
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  gap: 1rem;

  @media ${({ theme }) => theme.SIZES.md} {
    gap: 0.875rem;
  }

  @media ${({ theme }) => theme.SIZES.sm} {
    gap: 0.75rem;
  }

  @media ${({ theme }) => theme.SIZES.xs} {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  & > * {
    flex-shrink: 0;
  }
`;

export const SectionCard = styled(Box)<{ $fullWidth?: boolean }>`
  background-color: ${({ theme }) => theme.COLORS.surface};
  border-radius: 1rem;
  box-shadow: ${({ theme }) => theme.SHADOWS.cards};
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  padding: 1.5rem;
  height: fit-content;
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'auto')};
`;

export const SectionTitle = styled(Stack).attrs({
  direction: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
})`
  margin-bottom: 1rem;
`;

export const MemberItem = styled(Box)<{ $isHighWorkload?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: ${({ theme, $isHighWorkload }) =>
    $isHighWorkload ? theme.COLORS.error_100 : theme.COLORS.surfaceAlt};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme, $isHighWorkload }) =>
      $isHighWorkload ? theme.COLORS.error_200 : theme.COLORS.grey_300};
  }
`;

export const MemberInfo = styled(Box)`
  flex: 1;
  min-width: 0;
`;

export const EmptyState = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.5rem;
`;

export const CardsGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;

  @media ${({ theme }) => theme.SIZES.md} {
    grid-template-columns: repeat(2, 1fr);
  }

  @media ${({ theme }) => theme.SIZES.xs} {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

export const ContentGrid = styled(Box)`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;

  @media ${({ theme }) => theme.SIZES.md} {
    grid-template-columns: 1fr;
  }
`;

export const TeamCard = styled(Box)`
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
  border-radius: 0.75rem;
  border: 1px solid ${({ theme }) => theme.COLORS.border};
  overflow: hidden;
`;

export const TeamHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: ${({ theme }) => theme.COLORS.surface};
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.grey_200};
  }
`;

export const TeamMembersList = styled(Box)`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: ${({ theme }) => theme.COLORS.surfaceAlt};
`;

export const MemberAvatar = styled(Avatar)`
  border: 2px solid ${({ theme }) => theme.COLORS.surface};
`;

export const TeamStats = styled(Box)`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;
