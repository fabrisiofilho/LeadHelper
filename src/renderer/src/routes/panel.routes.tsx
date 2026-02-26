import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import WorkOutlinedIcon from '@mui/icons-material/WorkOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import GroupWorkOutlinedIcon from '@mui/icons-material/GroupWorkOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DrawerNavigator } from './components/DrawerNavigator';
import { IDrawerItem } from '@renderer/types/drawer/drawerItem';
import { IDrawerSection } from '@renderer/types/drawer/drawerSection';
import { JSX } from 'react';

import { TeamDashboardPage } from '@renderer/pages/Dashboard/TeamDashboard';
import { TeamMembersPage } from '@renderer/pages/TeamMembers';
import { TasksPage } from '@renderer/pages/Tasks';
import { AllocationsPage } from '@renderer/pages/Allocations';
import { TeamMemberAllocationsPage } from '@renderer/pages/TeamMemberAllocations';
import { GanttPage } from '@renderer/pages/Gantt';
import { AzureDevOpsConfigPage } from '@renderer/pages/AzureDevOpsConfig';
import { PositionsPage } from '@renderer/pages/Positions';
import { TeamsPage } from '@renderer/pages/Teams';
import { SprintsPage } from '@renderer/pages/Sprints';
import { TeamAllocationPage } from '@renderer/pages/TeamAllocation';
import { SprintsTasksPage } from '@renderer/pages/SprintsTasks';
import { TaskBoardPage } from '@renderer/pages/TaskBoard';
import { SystemSettingsPage } from '@renderer/pages/SystemSettings';
import { AzureDevOpsReportsPage } from '@renderer/pages/AzureDevOpsReports';

import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
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
      path: '/panel/task-board',
      icon: <TaskAltOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Sprints e Tarefas',
      path: '/panel/sprints-tasks',
      icon: <ViewKanbanOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Gantt',
      path: '/panel/gantt',
      icon: <TimelineOutlinedIcon />,
      canAccess: true,
    },
    {
      label: 'Relatórios Azure DevOps',
      path: '/panel/azure-devops-reports',
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
    path: '/panel/task-board',
    icon: <TaskAltOutlinedIcon />,
    canAccess: true,
    routeElement: <TaskBoardPage />,
    routePath: '/task-board',
  },
  {
    label: 'Sprints e Tarefas',
    path: '/panel/sprints-tasks',
    icon: <ViewKanbanOutlinedIcon />,
    canAccess: true,
    routeElement: <SprintsTasksPage />,
    routePath: '/sprints-tasks',
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
    label: 'Alocação em Equipes',
    path: '/panel/team-member-allocations',
    icon: <PersonAddOutlinedIcon />,
    canAccess: true,
    routeElement: <TeamMemberAllocationsPage />,
    routePath: '/team-member-allocations',
  },
  {
    label: 'Sprints',
    path: '/panel/sprints',
    icon: <SpeedOutlinedIcon />,
    canAccess: true,
    routeElement: <SprintsPage />,
    routePath: '/sprints',
  },
  {
    label: 'Tarefas',
    path: '/panel/tasks',
    icon: <AssignmentOutlinedIcon />,
    canAccess: true,
    routeElement: <TasksPage />,
    routePath: '/tasks',
  },
  {
    label: 'Alocações',
    path: '/panel/allocations',
    icon: <EventNoteOutlinedIcon />,
    canAccess: true,
    routeElement: <AllocationsPage />,
    routePath: '/allocations',
  },
  {
    label: 'Gantt',
    path: '/panel/gantt',
    icon: <TimelineOutlinedIcon />,
    canAccess: true,
    routeElement: <GanttPage />,
    routePath: '/gantt',
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
    label: 'Relatórios Azure DevOps',
    path: '/panel/azure-devops-reports',
    icon: <AssessmentOutlinedIcon />,
    canAccess: true,
    routeElement: <AzureDevOpsReportsPage />,
    routePath: '/azure-devops-reports',
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
