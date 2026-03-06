import { useState, useEffect, type FC, type SyntheticEvent } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import styled from 'styled-components';
import { SustentacaoTab } from './SustentacaoTab';
import { ProjetosTab } from './ProjetosTab';

/**
 * LocalStorage key for persisting selected tab.
 * Property 46: Persistência de aba selecionada
 */
const STORAGE_KEY = 'dashboard-selected-tab';

/**
 * Tab values for the dashboard.
 */
type TabValue = 'sustentacao' | 'projetos';

/**
 * Props for the DashboardTabs component.
 */
export interface DashboardTabsProps {
  /** Optional initial tab to display */
  initialTab?: TabValue;
}

// Styled components
const TabsContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const StyledTabs = styled(Tabs)`
  border-bottom: 1px solid ${({ theme }) => theme.COLORS.border};
  margin-bottom: 1.5rem;

  .MuiTabs-indicator {
    height: 3px;
    border-radius: 3px 3px 0 0;
  }
`;

const StyledTab = styled(Tab)`
  text-transform: none;
  font-weight: 600;
  font-size: 0.9375rem;
  min-height: 48px;
  padding: 0.75rem 1.5rem;

  &.Mui-selected {
    color: ${({ theme }) => theme.COLORS.primary};
  }

  .MuiTab-iconWrapper {
    margin-right: 0.5rem;
  }
`;

const TabContent = styled(Box)`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

/**
 * Load the saved tab from localStorage.
 * Returns 'sustentacao' as default if no saved value.
 */
const loadSavedTab = (): TabValue => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'sustentacao' || saved === 'projetos') {
      return saved;
    }
  } catch {
    // localStorage not available, use default
  }
  return 'sustentacao';
};

/**
 * Save the selected tab to localStorage.
 * Property 46: Persistência de aba selecionada
 */
const saveTab = (tab: TabValue): void => {
  try {
    localStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // localStorage not available, ignore
  }
};

/**
 * DashboardTabs component - Main dashboard with two tabs.
 *
 * Features:
 * - Two tabs: "Sustentação" and "Projetos"
 * - Persists selected tab in localStorage (Property 46)
 * - Uses MUI Tabs component
 *
 * Validates: Requirements 1.1, 1.4
 */
export const DashboardTabs: FC<DashboardTabsProps> = ({ initialTab }) => {
  const [selectedTab, setSelectedTab] = useState<TabValue>(
    initialTab ?? loadSavedTab(),
  );

  // Save tab to localStorage when it changes
  useEffect(() => {
    saveTab(selectedTab);
  }, [selectedTab]);

  const handleTabChange = (_event: SyntheticEvent, newValue: TabValue) => {
    setSelectedTab(newValue);
  };

  return (
    <TabsContainer>
      <StyledTabs
        value={selectedTab}
        onChange={handleTabChange}
        aria-label="Dashboard tabs"
      >
        <StyledTab
          value="sustentacao"
          label="Sustentação"
          icon={<SupportAgentIcon />}
          iconPosition="start"
          aria-label="Aba Sustentação - Tickets e Improvements"
        />
        <StyledTab
          value="projetos"
          label="Projetos"
          icon={<AccountTreeIcon />}
          iconPosition="start"
          aria-label="Aba Projetos - User Stories da Sprint"
        />
      </StyledTabs>

      <TabContent role="tabpanel">
        {selectedTab === 'sustentacao' && <SustentacaoTab />}
        {selectedTab === 'projetos' && <ProjetosTab />}
      </TabContent>
    </TabsContainer>
  );
};

export default DashboardTabs;
