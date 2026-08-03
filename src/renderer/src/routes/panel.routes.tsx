import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GroupWorkOutlinedIcon from '@mui/icons-material/GroupWorkOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DrawerNavigator } from './components/DrawerNavigator';
import { IDrawerItem } from '@renderer/types/drawer/drawerItem';
import { IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { JSX } from 'react';

import { DashboardSustentacaoPage } from '@renderer/pages/DashboardSustentacao';
import { DashboardProjetosPage } from '@renderer/pages/DashboardProjetos';
import { TeamMembersPage } from '@renderer/pages/TeamMembers';
import { AzureDevOpsConfigPage } from '@renderer/pages/AzureDevOpsConfig';
import { PositionsPage } from '@renderer/pages/Positions';
import { TeamsPage } from '@renderer/pages/Teams';
import { TeamAllocationPage } from '@renderer/pages/TeamAllocation';
import { TaskAllocationPage } from '@renderer/pages/TaskAllocation';
import { TaskManagementPage } from '@renderer/pages/TaskManagement';
import { SystemSettingsPage } from '@renderer/pages/SystemSettings';
import { NotesBoardPage } from '@renderer/pages/NotesBoard';
import { SlaConfigPage } from '@renderer/pages/SlaConfig';

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
      label: 'Dashboard Sustentação',
      path: '/panel/dashboard-sustentacao',
      icon: <SupportAgentOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Dashboard Projetos',
      path: '/panel/dashboard-projetos',
      icon: <AccountTreeOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Alocação de Equipes',
      path: '/panel/team-allocation',
      icon: <GroupWorkOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Alocação de Tarefas',
      path: '/panel/task-allocation',
      icon: <AssignmentIndOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Gestão de Tarefas',
      path: '/panel/task-management',
      icon: <TaskAltOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Quadro de Notas',
      path: '/panel/notes-board',
      icon: <StickyNote2OutlinedIcon />,
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
    label: 'Dashboard Sustentação',
    path: '/panel/dashboard-sustentacao',
    icon: <SupportAgentOutlinedIcon />,
    canAccess: true,
    routeElement: <DashboardSustentacaoPage />,
    routePath: '/dashboard-sustentacao',
  },
  {
    label: 'Dashboard Projetos',
    path: '/panel/dashboard-projetos',
    icon: <AccountTreeOutlinedIcon />,
    canAccess: true,
    routeElement: <DashboardProjetosPage />,
    routePath: '/dashboard-projetos',
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
    label: 'Alocação de Tarefas',
    path: '/panel/task-allocation',
    icon: <AssignmentIndOutlinedIcon />,
    canAccess: true,
    routeElement: <TaskAllocationPage />,
    routePath: '/task-allocation',
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
    label: 'Quadro de Notas',
    path: '/panel/notes-board',
    icon: <StickyNote2OutlinedIcon />,
    canAccess: true,
    routeElement: <NotesBoardPage />,
    routePath: '/notes-board',
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
  {
    label: 'Configuração de SLA',
    path: '/panel/sla-config',
    icon: <SettingsOutlinedIcon />,
    canAccess: true,
    routeElement: <SlaConfigPage />,
    routePath: '/sla-config',
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

        <Route
          path="/reports"
          element={<Navigate to="/panel/dashboard-sustentacao" replace />}
        />
        <Route
          path="/dashboard"
          element={<Navigate to="/panel/dashboard-sustentacao" replace />}
        />
        <Route
          path="/"
          element={<Navigate to="/panel/dashboard-sustentacao" replace />}
        />
        <Route
          path="*"
          element={<Navigate to="/panel/dashboard-sustentacao" replace />}
        />
      </Routes>
    </DrawerNavigator>
  );
}
