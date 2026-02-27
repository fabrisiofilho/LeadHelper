import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as TaskIcon,
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { OverviewTab } from '../tabs/OverviewTab';
import { AllocationDashboardTab } from '../AllocationDashboardTab';
import { TaskManagementDashboardTab } from '../TaskManagementDashboardTab';
import { SprintDashboardTab } from '../SprintDashboardTab';
import { TeamPerformanceTab } from '../tabs/TeamPerformanceTab';
import { AlertsTab } from '../tabs/AlertsTab';
import { useDashboard } from '@renderer/hooks/useDashboard';
import { useTeams } from '@renderer/hooks/useTeams';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeamMembers } from '@renderer/hooks/useTeamMembers';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
import type { DashboardPeriod } from '@shared/interfaces/config/index.types';

const getDefaultPeriod = (): DashboardPeriod => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { startDate, endDate };
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export function TeamDashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState<DashboardPeriod>(getDefaultPeriod);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { loading, error, getSummary, clearError } = useDashboard();
  const { findAll: findAllTeams, loading: teamsLoading } = useTeams();
  const { findAll: findAllSprints } = useSprints();
  const { findAll: findAllTasks } = useTasks();
  const { findAll: findAllMembers } = useTeamMembers();
  const { findAll: findAllAllocations } = useTeamMemberAllocations();

  const loadDashboardData = useCallback(async () => {
    clearError();
    await Promise.all([
      getSummary(period),
      findAllTeams(),
      findAllSprints(),
      findAllTasks(),
      findAllMembers({ isActive: true }),
      findAllAllocations({ isActive: true }),
    ]);
    setLastUpdated(new Date());
  }, [
    getSummary,
    findAllTeams,
    findAllSprints,
    findAllTasks,
    findAllMembers,
    findAllAllocations,
    period,
    clearError,
  ]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading && teamsLoading) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body1" color="text.secondary" mt={2}>
            Carregando dashboard...
          </Typography>
        </Stack>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <WarningIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
          <Typography variant="h6" color="error">
            {error}
          </Typography>
          <IconButton onClick={loadDashboardData} sx={{ mt: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Dashboard da Equipe
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Visão completa e controle para Tech Leads
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Atualizado: {lastUpdated.toLocaleTimeString('pt-BR')}
            </Typography>
          )}
          <Tooltip title="Atualizar dados">
            <IconButton
              onClick={loadDashboardData}
              size="small"
              disabled={loading || teamsLoading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              minHeight: 56,
            },
          }}
        >
          <Tab
            icon={<DashboardIcon />}
            iconPosition="start"
            label="Visão Geral"
          />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="Alocações" />
          <Tab icon={<TaskIcon />} iconPosition="start" label="Tarefas" />
          <Tab icon={<CalendarIcon />} iconPosition="start" label="Sprints" />
          <Tab
            icon={<TimelineIcon />}
            iconPosition="start"
            label="Performance"
          />
          <Tab icon={<WarningIcon />} iconPosition="start" label="Alertas" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <OverviewTab period={period} onPeriodChange={setPeriod} />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <AllocationDashboardTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <TaskManagementDashboardTab />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <SprintDashboardTab />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <TeamPerformanceTab period={period} />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <AlertsTab />
      </TabPanel>
    </PageLayout>
  );
}

export default TeamDashboardPage;
