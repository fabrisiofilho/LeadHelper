import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GroupWorkOutlinedIcon from '@mui/icons-material/GroupWorkOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DrawerNavigator } from './components/DrawerNavigator';
import { IDrawerItem } from '@renderer/types/drawer/drawerItem';
import { IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { JSX } from 'react';

import { TeamDashboardPage } from '@renderer/pages/Dashboard/TeamDashboard';
import { TeamMembersPage } from '@renderer/pages/TeamMembers';
import { AzureDevOpsConfigPage } from '@renderer/pages/AzureDevOpsConfig';
import { PositionsPage } from '@renderer/pages/Positions';
import { TeamsPage } from '@renderer/pages/Teams';
import { TeamAllocationPage } from '@renderer/pages/TeamAllocation';
import { SprintsTasksPage } from '@renderer/pages/SprintsTasks';
import { TaskManagementPage } from '@renderer/pages/TaskManagement';
import { SystemSettingsPage } from '@renderer/pages/SystemSettings';
import { ReportsPage } from '@renderer/pages/Reports';

type WithRouteProps<T> = T & {
  routePath: string;
  routeElement: JSX.Element;
};

// Seção Geral - Funcionalidades de fluxo principal para uso diário
const GENERAL_SECTION: IDrawerSection = {
  id: 'general',
  title: 'Geral',
  items: [
    {
      label: 'Dashboard',
      path: '/panel/dashboard',
      icon: <DashboardOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Alocação de Equipes',
      path: '/panel/team-allocation',
      icon: <GroupWorkOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Gestão de Tarefas',
      path: '/panel/task-management',
      icon: <TaskAltOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Sprints',
      path: '/panel/sprints-tasks',
      icon: <ViewKanbanOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Relatórios',
      path: '/panel/reports',
      icon: <AssessmentOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Sistema',
      path: '/panel/system',
      icon: <SettingsOutlinedIcon />,
      canAccess: true,
    },
  ],
};

// Array exportado com todas as seções para uso pelo DrawerNavigator
export const DRAWER_SECTIONS: IDrawerSection[] = [GENERAL_SECTION];

const ROUTES_ITEMS: WithRouteProps<IDrawerItem>[] = [
  {
    label: 'Dashboard',
    path: '/panel/dashboard',
    icon: <DashboardOutlinedIcon />,
    canAccess: true,
    routeElement: <TeamDashboardPage />,
    routePath: '/dashboard',
  },
  {
    label: 'Sistema',
    path: '/panel/system',
    icon: <SettingsOutlinedIcon />,
    canAccess: true,
    routeElement: <SystemSettingsPage />,
    routePath: '/system',
  },
  {
    label: 'Alocação de Equipes',
    path: '/panel/team-allocation',
    icon: <GroupWorkOutlinedIcon />,
    canAccess: true,
    routeElement: <TeamAllocationPage />,
    routePath: '/team-allocation',
  },
  {
    label: 'Gestão de Tarefas',
    path: '/panel/task-management',
    icon: <TaskAltOutlinedIcon />,
    canAccess: true,
    routeElement: <TaskManagementPage />,
    routePath: '/task-management',
  },
  {
    label: 'Sprints',
    path: '/panel/sprints-tasks',
    icon: <ViewKanbanOutlinedIcon />,
    canAccess: true,
    routeElement: <SprintsTasksPage />,
    routePath: '/sprints-tasks',
  },
  {
    label: 'Relatórios',
    path: '/panel/reports',
    icon: <AssessmentOutlinedIcon />,
    canAccess: true,
    routeElement: <ReportsPage />,
    routePath: '/reports',
  },
  {
    label: 'Cargos',
    path: '/panel/positions',
    icon: <WorkOutlinedIcon />,
    canAccess: true,
    routeElement: <PositionsPage />,
    routePath: '/positions',
  },
  {
    label: 'Equipes',
    path: '/panel/teams',
    icon: <GroupsOutlinedIcon />,
    canAccess: true,
    routeElement: <TeamsPage />,
    routePath: '/teams',
  },
  {
    label: 'Membros',
    path: '/panel/team-members',
    icon: <PeopleOutlinedIcon />,
    canAccess: true,
    routeElement: <TeamMembersPage />,
    routePath: '/team-members',
  },
  {
    label: 'Azure DevOps',
    path: '/panel/azure-devops',
    icon: <CloudOutlinedIcon />,
    canAccess: true,
    routeElement: <AzureDevOpsConfigPage />,
    routePath: '/azure-devops',
  },
];

export function PanelRoutes() {
  return (
    <DrawerNavigator sections={DRAWER_SECTIONS}>
      <Routes>
        {ROUTES_ITEMS.map((item) => (
          <Route
            key={item.routePath}
            path={item.routePath}
            element={item.routeElement}
          />
        ))}

        <Route path="/" element={<Navigate to="/panel/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/panel/dashboard" replace />} />
      </Routes>
    </DrawerNavigator>
  );
}
