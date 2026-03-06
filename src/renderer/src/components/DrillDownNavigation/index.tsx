import { type FC, type ReactNode, useEffect } from 'react';
import { Box, Button, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import styled from 'styled-components';
import { Task, BreadcrumbItem } from '@shared/interfaces/config/index.types';
import { HierarchyBreadcrumb } from '../HierarchyBreadcrumb';
import { Loading } from '../Loading';
import { AlertBox } from '../AlertBox';
import { EmptyListMessage } from '../EmptyListMessage';
import { useHierarchyNavigation } from '../../hooks/useHierarchyNavigation';

/**
 * Context provided to children via render props.
 *
 * Validates: Requirements 15.3, 15.5, 16.5
 */
export interface DrillDownContext {
  currentParentId: number | undefined;
  breadcrumb: BreadcrumbItem[];
  children: Task[];
  childrenCount: number;
  loading: boolean;
  error: string | null;
  navigateToChild: (childId: number) => Promise<void>;
  navigateToParent: () => Promise<void>;
  navigateToRoot: () => void;
  isAtRoot: boolean;
}

/**
 * Props for the DrillDownNavigation component.
 *
 * Validates: Requirements 15.3, 15.5, 16.5
 */
export interface DrillDownNavigationProps {
  children: (context: DrillDownContext) => ReactNode;
  onItemClick?: (task: Task) => void;
  emptyMessage?: string;
}

// Styled components
const NavigationContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;

const NavigationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.grey_200};
  margin-bottom: 1rem;
`;

const BackButton = styled(Button)`
  min-width: auto;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  text-transform: none;

  .MuiButton-startIcon {
    margin-right: 0.375rem;
  }
`;

const BreadcrumbWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const ContentContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const LoadingContainer = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  width: 100%;
`;

const ErrorContainer = styled(Box)`
  padding: 1rem 0;
`;

/**
 * DrillDownNavigation component for managing hierarchical navigation context.
 *
 * This component wraps content and provides drill-down navigation capabilities
 * through render props. It displays a global breadcrumb at the top and a "Voltar"
 * button when not at the root level.
 *
 * Features:
 * - Displays HierarchyBreadcrumb at the top (Requirement 16.5)
 * - Shows "Voltar" button when not at root level (Requirement 15.3)
 * - Provides navigation context to children via render props
 * - Handles loading and error states
 * - Shows empty state message when no children found
 *
 * Properties implemented:
 * - Property 28: Histórico de navegação permite voltar
 * - Property 29: Mensagem para item sem filhos
 *
 * Validates: Requirements 15.3, 15.5, 16.5
 */
export const DrillDownNavigation: FC<Readonly<DrillDownNavigationProps>> = ({
  children,
  onItemClick,
  emptyMessage = 'Não há itens filhos para exibir.',
}) => {
  const {
    loading,
    error,
    currentParentId,
    breadcrumb,
    children: childItems,
    childrenCount,
    navigateToChild,
    navigateToParent,
    navigateToBreadcrumb,
    navigateToRoot,
    clearError,
  } = useHierarchyNavigation();

  // Determine if we're at the root level
  const isAtRoot = currentParentId === undefined;

  // Create the context object for render props
  const context: DrillDownContext = {
    currentParentId,
    breadcrumb,
    children: childItems,
    childrenCount,
    loading,
    error,
    navigateToChild,
    navigateToParent,
    navigateToRoot,
    isAtRoot,
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (itemId: number) => {
    navigateToBreadcrumb(itemId);
  };

  // Handle back button click
  const handleBackClick = () => {
    navigateToParent();
  };

  // Handle root navigation from breadcrumb
  const handleNavigateToRoot = () => {
    navigateToRoot();
  };

  return (
    <NavigationContainer>
      {/* Navigation header with breadcrumb and back button */}
      <NavigationHeader>
        {/* Property 28: Show "Voltar" button when not at root (Requirement 15.3) */}
        {!isAtRoot && (
          <BackButton
            variant="outlined"
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            aria-label="Voltar para o nível anterior"
          >
            Voltar
          </BackButton>
        )}

        {/* Global breadcrumb at the top (Requirement 16.5) */}
        <BreadcrumbWrapper>
          <HierarchyBreadcrumb
            items={breadcrumb}
            onNavigate={handleBreadcrumbNavigate}
            onNavigateToRoot={handleNavigateToRoot}
          />
        </BreadcrumbWrapper>
      </NavigationHeader>

      {/* Content area */}
      <ContentContainer>
        {/* Loading state */}
        {loading && (
          <LoadingContainer>
            <Loading size={40} />
          </LoadingContainer>
        )}

        {/* Error state */}
        {error && !loading && (
          <ErrorContainer>
            <AlertBox
              title="Erro ao carregar dados"
              description={error}
              variant="danger"
              onClose={clearError}
            />
          </ErrorContainer>
        )}

        {/* Empty state - Property 29: Message when item has no children */}
        {!loading && !error && !isAtRoot && childrenCount === 0 && (
          <EmptyListMessage
            title="Nenhum item encontrado"
            description={emptyMessage}
            size="small"
          />
        )}

        {/* Render children with context */}
        {!loading && !error && children(context)}
      </ContentContainer>
    </NavigationContainer>
  );
};

export default DrillDownNavigation;
