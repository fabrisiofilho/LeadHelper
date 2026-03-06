import { type FC } from 'react';
import { BreadcrumbItem } from '@shared/interfaces/config/index.types';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import styled from 'styled-components';

/**
 * Props for the HierarchyBreadcrumb component.
 *
 * Validates: Requirements 16.1, 16.3, 16.4, 16.5, 16.6
 */
export interface HierarchyBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (itemId: number) => void;
  onNavigateToRoot?: () => void;
}

const BreadcrumbContainer = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
`;

const BreadcrumbLink = styled.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  color: ${({ theme }) => theme.COLORS.primary};
  font-size: 0.875rem;
  font-family: inherit;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.COLORS.primary_100};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.COLORS.primary};
    outline-offset: 2px;
  }
`;

const HomeButton = styled(BreadcrumbLink)`
  padding: 0.25rem;
`;

const Separator = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.COLORS.grey_400};
`;

const ItemType = styled.span`
  color: ${({ theme }) => theme.COLORS.grey_500};
  font-size: 0.75rem;
  margin-right: 0.25rem;
`;

const ItemTitle = styled.span`
  color: ${({ theme }) => theme.COLORS.text};
`;

const CurrentItem = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  color: ${({ theme }) => theme.COLORS.grey_600};
  font-size: 0.875rem;
`;

/**
 * HierarchyBreadcrumb component for displaying hierarchical navigation path.
 *
 * Features:
 * - Displays clickable breadcrumb items for navigation
 * - Uses truncatedTitle field from BreadcrumbItem (already truncated to 30 chars)
 * - Shows Home icon for root navigation
 * - Shows separator between items
 * - Last item is displayed as non-clickable current location
 *
 * Property 32: Truncar títulos > 30 caracteres
 * - The truncatedTitle field is already truncated by the backend HierarchyService
 *
 * Validates: Requirements 16.1, 16.3, 16.4, 16.5, 16.6
 */
export const HierarchyBreadcrumb: FC<Readonly<HierarchyBreadcrumbProps>> = ({
  items,
  onNavigate,
  onNavigateToRoot,
}) => {
  const handleRootClick = () => {
    if (onNavigateToRoot) {
      onNavigateToRoot();
    }
  };

  const handleItemClick = (itemId: number) => {
    onNavigate(itemId);
  };

  // If no items, show only home button
  if (items.length === 0) {
    return (
      <BreadcrumbContainer aria-label="Navegação hierárquica">
        <HomeButton
          onClick={handleRootClick}
          aria-label="Ir para início"
          title="Início"
        >
          <HomeOutlinedIcon fontSize="small" />
        </HomeButton>
      </BreadcrumbContainer>
    );
  }

  // Separate the last item (current location) from clickable items
  const clickableItems = items.slice(0, -1);
  const currentItem = items[items.length - 1];

  return (
    <BreadcrumbContainer aria-label="Navegação hierárquica">
      {/* Home button */}
      <HomeButton
        onClick={handleRootClick}
        aria-label="Ir para início"
        title="Início"
      >
        <HomeOutlinedIcon fontSize="small" />
      </HomeButton>

      {/* Clickable breadcrumb items */}
      {clickableItems.map((item) => (
        <span key={item.id} style={{ display: 'contents' }}>
          <Separator aria-hidden="true">
            <NavigateNextIcon fontSize="small" />
          </Separator>
          <BreadcrumbLink
            onClick={() => handleItemClick(item.id)}
            aria-label={`Navegar para ${item.title}`}
            title={item.title}
          >
            <ItemType>{item.type}:</ItemType>
            <ItemTitle>{item.truncatedTitle}</ItemTitle>
          </BreadcrumbLink>
        </span>
      ))}

      {/* Current item (non-clickable) */}
      <Separator aria-hidden="true">
        <NavigateNextIcon fontSize="small" />
      </Separator>
      <CurrentItem aria-current="page" title={currentItem.title}>
        <ItemType>{currentItem.type}:</ItemType>
        <ItemTitle>{currentItem.truncatedTitle}</ItemTitle>
      </CurrentItem>
    </BreadcrumbContainer>
  );
};

export default HierarchyBreadcrumb;
