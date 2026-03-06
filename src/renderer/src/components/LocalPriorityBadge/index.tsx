import { type FC, useState, useRef } from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import styled, { css } from 'styled-components';
import { rgba } from 'polished';

/**
 * Props for the LocalPriorityBadge component.
 *
 * Validates: Requirements 4.4, 4.5
 */
export interface LocalPriorityBadgeProps {
  priority: number; // 0-5, where 0 means no priority
  onChange: (newPriority: number) => void;
  onRemove?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

/**
 * Priority color mapping.
 * 1=red (highest), 2=orange, 3=yellow, 4=blue, 5=grey (lowest)
 */
type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface PriorityColorConfig {
  bg: string;
  text: string;
  border: string;
}

const getPriorityColors = (priority: PriorityLevel): PriorityColorConfig => {
  const colorMap: Record<PriorityLevel, PriorityColorConfig> = {
    0: { bg: 'transparent', text: '#919EAB', border: '#919EAB' }, // No priority - grey outline
    1: { bg: '#FF5630', text: '#FFFFFF', border: '#FF5630' }, // Red - highest
    2: { bg: '#FFAB00', text: '#7A4100', border: '#FFAB00' }, // Orange
    3: { bg: '#FFD666', text: '#7A4100', border: '#FFD666' }, // Yellow
    4: { bg: '#135bec', text: '#FFFFFF', border: '#135bec' }, // Blue
    5: { bg: '#919EAB', text: '#FFFFFF', border: '#919EAB' }, // Grey - lowest
  };
  return colorMap[priority] || colorMap[0];
};

const getPriorityLabel = (priority: number): string => {
  const labels: Record<number, string> = {
    1: 'Crítica',
    2: 'Alta',
    3: 'Média',
    4: 'Baixa',
    5: 'Mínima',
  };
  return labels[priority] || '';
};

// Styled components
const BadgeContainer = styled.button<{
  $bgColor: string;
  $textColor: string;
  $borderColor: string;
  $size: 'small' | 'medium';
  $hasPriority: boolean;
  $disabled: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid ${({ $borderColor }) => $borderColor};
  border-radius: 0.375rem;
  font-weight: 700;
  cursor: ${({ $disabled }) => ($disabled ? 'default' : 'pointer')};
  transition: all 0.15s ease;
  background-color: ${({ $bgColor }) => $bgColor};
  color: ${({ $textColor }) => $textColor};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  ${({ $size }) =>
    $size === 'small'
      ? css`
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.25rem;
          font-size: 0.6875rem;
        `
      : css`
          min-width: 1.5rem;
          height: 1.5rem;
          padding: 0 0.375rem;
          font-size: 0.75rem;
        `}

  ${({ $disabled, $hasPriority, theme }) =>
    !$disabled &&
    css`
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 4px ${rgba(theme.COLORS.grey_800, 0.2)};
        ${!$hasPriority &&
        css`
          background-color: ${rgba(theme.COLORS.grey_500, 0.1)};
        `}
      }

      &:active {
        transform: scale(0.98);
      }
    `}

  &:focus {
    outline: 2px solid ${({ theme }) => theme.COLORS.primary};
    outline-offset: 2px;
  }
`;

const NoPriorityText = styled.span`
  font-size: inherit;
  line-height: 1;
`;

const StyledMenu = styled(Menu)`
  .MuiPaper-root {
    min-width: 140px;
    border-radius: 0.5rem;
    box-shadow: ${({ theme }) => theme.SHADOWS.dropdown};
  }
`;

const PriorityMenuItem = styled(MenuItem)<{
  $bgColor: string;
  $textColor: string;
}>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;

  &:hover {
    background-color: ${({ $bgColor }) => rgba($bgColor, 0.12)};
  }
`;

const PriorityDot = styled.span<{ $color: string }>`
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const RemoveMenuItem = styled(MenuItem)`
  color: ${({ theme }) => theme.COLORS.error};

  &:hover {
    background-color: ${({ theme }) => rgba(theme.COLORS.error, 0.08)};
  }

  .MuiListItemIcon-root {
    color: inherit;
    min-width: 32px;
  }
`;

/**
 * LocalPriorityBadge component for displaying and editing local priority (1-5).
 *
 * Features:
 * - Displays priority as a colored badge (1=highest/red, 5=lowest/grey)
 * - Shows "—" when priority is 0 or undefined
 * - Click to open dropdown with priority options (1-5 and "Remove")
 * - Compact design to fit in cards
 * - Supports small and medium sizes
 *
 * Validates: Requirements 4.4, 4.5
 */
export const LocalPriorityBadge: FC<Readonly<LocalPriorityBadgeProps>> = ({
  priority,
  onChange,
  onRemove,
  disabled = false,
  size = 'small',
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const open = Boolean(anchorEl);

  const normalizedPriority = (
    priority >= 0 && priority <= 5 ? priority : 0
  ) as PriorityLevel;
  const hasPriority = normalizedPriority > 0;
  const colors = getPriorityColors(normalizedPriority);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      event.stopPropagation();
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePrioritySelect = (newPriority: number) => {
    onChange(newPriority);
    handleClose();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onChange(0);
    }
    handleClose();
  };

  const priorityOptions: PriorityLevel[] = [1, 2, 3, 4, 5];

  return (
    <>
      <BadgeContainer
        ref={buttonRef}
        onClick={handleClick}
        $bgColor={colors.bg}
        $textColor={colors.text}
        $borderColor={colors.border}
        $size={size}
        $hasPriority={hasPriority}
        $disabled={disabled}
        disabled={disabled}
        aria-label={
          hasPriority
            ? `Prioridade ${normalizedPriority}: ${getPriorityLabel(normalizedPriority)}. Clique para alterar.`
            : 'Sem prioridade. Clique para definir.'
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        title={
          hasPriority
            ? `Prioridade ${normalizedPriority} - ${getPriorityLabel(normalizedPriority)}`
            : 'Sem prioridade'
        }
      >
        {hasPriority ? (
          normalizedPriority
        ) : (
          <NoPriorityText aria-hidden="true">—</NoPriorityText>
        )}
      </BadgeContainer>

      <StyledMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        MenuListProps={{
          'aria-label': 'Selecionar prioridade',
          role: 'listbox',
        }}
      >
        {priorityOptions.map((p) => {
          const pColors = getPriorityColors(p);
          const isSelected = p === normalizedPriority;
          return (
            <PriorityMenuItem
              key={p}
              onClick={() => handlePrioritySelect(p)}
              selected={isSelected}
              $bgColor={pColors.bg}
              $textColor={pColors.text}
              role="option"
              aria-selected={isSelected}
            >
              <PriorityDot $color={pColors.bg} />
              <ListItemText
                primary={`${p} - ${getPriorityLabel(p)}`}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 600 : 400,
                }}
              />
            </PriorityMenuItem>
          );
        })}

        {hasPriority && (
          <RemoveMenuItem onClick={handleRemove} role="option">
            <ListItemIcon>
              <RemoveCircleOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Remover"
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </RemoveMenuItem>
        )}
      </StyledMenu>
    </>
  );
};

export default LocalPriorityBadge;
