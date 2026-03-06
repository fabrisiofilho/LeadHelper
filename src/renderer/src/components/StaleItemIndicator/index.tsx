import { type FC, type ReactElement, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * Props for the StaleItemIndicator component.
 *
 * Validates: Requirements 14.1, 14.2, 14.3
 */
export interface StaleItemIndicatorProps {
  /** The date when the item was last updated */
  lastUpdated: Date | string;
  /** Number of days after which an item is considered stale (default: 3) */
  staleDaysThreshold?: number;
  /** Number of days after which an item is considered critical (default: 7) */
  criticalDaysThreshold?: number;
  /** Whether to show the icon (default: true) */
  showIcon?: boolean;
}

type StaleStatus = 'normal' | 'stale' | 'critical';

interface StaleConfig {
  status: StaleStatus;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const getStaleConfig = (
  daysSinceUpdate: number,
  staleDaysThreshold: number,
  criticalDaysThreshold: number,
): StaleConfig => {
  if (daysSinceUpdate >= criticalDaysThreshold) {
    return {
      status: 'critical',
      bgColor: 'error_100',
      textColor: 'error_300',
      borderColor: 'error_200',
    };
  }
  if (daysSinceUpdate >= staleDaysThreshold) {
    return {
      status: 'stale',
      bgColor: 'warn_100',
      textColor: 'warn_300',
      borderColor: 'warn_200',
    };
  }
  return {
    status: 'normal',
    bgColor: 'transparent',
    textColor: 'textSecondary',
    borderColor: 'transparent',
  };
};

// Styled components
const IndicatorContainer = styled.div<{
  $status: StaleStatus;
  $bgColor: string;
  $textColor: string;
  $borderColor: string;
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.15s ease;

  ${({ $status, $bgColor, $textColor, $borderColor, theme }) => {
    const bgColorValue =
      $bgColor === 'transparent'
        ? 'transparent'
        : theme.COLORS[$bgColor as keyof typeof theme.COLORS] || $bgColor;
    const textColorValue =
      theme.COLORS[$textColor as keyof typeof theme.COLORS] || $textColor;
    const borderColorValue =
      $borderColor === 'transparent'
        ? 'transparent'
        : theme.COLORS[$borderColor as keyof typeof theme.COLORS] ||
          $borderColor;

    if ($status === 'critical') {
      return css`
        background-color: ${bgColorValue};
        color: ${textColorValue};
        border: 1px solid ${borderColorValue};

        svg {
          color: ${theme.COLORS.error};
          font-size: 0.875rem;
        }
      `;
    }

    if ($status === 'stale') {
      return css`
        background-color: ${bgColorValue};
        color: ${textColorValue};
        border: 1px solid ${borderColorValue};

        svg {
          color: ${theme.COLORS.warn};
          font-size: 0.875rem;
        }
      `;
    }

    return css`
      background-color: transparent;
      color: ${textColorValue};
      border: 1px solid transparent;

      svg {
        color: ${theme.COLORS.grey_500};
        font-size: 0.875rem;
      }
    `;
  }}
`;

const TimeText = styled.span`
  line-height: 1.2;
`;

/**
 * Formats the elapsed time in a human-readable format.
 * Uses date-fns formatDistanceToNow with Portuguese locale.
 *
 * Property 26: Formatação de tempo decorrido
 * Validates: Requirements 14.2
 */
const formatElapsedTime = (date: Date): string => {
  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: ptBR,
  });
};

/**
 * Parses a date value that can be either a Date object or a string.
 */
const parseDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

/**
 * Gets the appropriate icon based on stale status.
 */
const getStatusIcon = (status: StaleStatus): ReactElement => {
  switch (status) {
    case 'critical':
      return <ErrorOutlineIcon />;
    case 'stale':
      return <WarningAmberIcon />;
    default:
      return <AccessTimeIcon />;
  }
};

/**
 * StaleItemIndicator component for displaying elapsed time since last update.
 *
 * Features:
 * - Displays elapsed time in human-readable format (e.g., "há 2 dias", "há 1 semana")
 * - Shows warning style when item is stale (configurable threshold, default: 3 days)
 * - Shows critical style when item is very stale (configurable threshold, default: 7 days)
 * - Compact design to fit in cards
 * - Uses date-fns for time formatting with Portuguese locale
 *
 * Property 26: Formatação de tempo decorrido
 * Validates: Requirements 14.1, 14.2, 14.3
 */
export const StaleItemIndicator: FC<Readonly<StaleItemIndicatorProps>> = ({
  lastUpdated,
  staleDaysThreshold = 3,
  criticalDaysThreshold = 7,
  showIcon = true,
}) => {
  const { formattedTime, config, daysSinceUpdate } = useMemo(() => {
    const date = parseDate(lastUpdated);
    const now = new Date();
    const days = differenceInDays(now, date);
    const staleConfig = getStaleConfig(
      days,
      staleDaysThreshold,
      criticalDaysThreshold,
    );
    const formatted = formatElapsedTime(date);

    return {
      formattedTime: formatted,
      config: staleConfig,
      daysSinceUpdate: days,
    };
  }, [lastUpdated, staleDaysThreshold, criticalDaysThreshold]);

  const getAriaLabel = (): string => {
    const baseLabel = `Última atualização: ${formattedTime}`;
    if (config.status === 'critical') {
      return `${baseLabel}. Item crítico - parado há ${daysSinceUpdate} dias.`;
    }
    if (config.status === 'stale') {
      return `${baseLabel}. Item parado há ${daysSinceUpdate} dias.`;
    }
    return baseLabel;
  };

  const getTitle = (): string => {
    if (config.status === 'critical') {
      return `Crítico: Parado há ${daysSinceUpdate} dias`;
    }
    if (config.status === 'stale') {
      return `Atenção: Parado há ${daysSinceUpdate} dias`;
    }
    return `Atualizado ${formattedTime}`;
  };

  return (
    <IndicatorContainer
      $status={config.status}
      $bgColor={config.bgColor}
      $textColor={config.textColor}
      $borderColor={config.borderColor}
      aria-label={getAriaLabel()}
      title={getTitle()}
      role="status"
    >
      {showIcon && getStatusIcon(config.status)}
      <TimeText>{formattedTime}</TimeText>
    </IndicatorContainer>
  );
};

export default StaleItemIndicator;
