/**
 * Controller configuration for IPC communication.
 * This file defines the available controllers and their methods for the preload bridge.
 */

export const CONTROLLER_CONFIG = {
  position: {
    prefix: 'position',
    methods: [
      'create',
      'update',
      'delete',
      'findById',
      'findAll',
      'activate',
      'deactivate',
    ] as const,
  },
  team: {
    prefix: 'team',
    methods: [
      'create',
      'update',
      'delete',
      'findById',
      'findAll',
      'activate',
      'deactivate',
      'addMember',
      'removeMember',
    ] as const,
  },
  sprint: {
    prefix: 'sprint',
    methods: [
      'create',
      'update',
      'delete',
      'findById',
      'findAll',
      'findByTeam',
      'findCurrent',
      'findUpcoming',
      'activate',
      'deactivate',
    ] as const,
  },
  teamMember: {
    prefix: 'team-member',
    methods: [
      'create',
      'update',
      'deactivate',
      'activate',
      'findById',
      'findAll',
      'findByRole',
    ] as const,
  },
  task: {
    prefix: 'task',
    methods: [
      'create',
      'update',
      'delete',
      'findById',
      'findAll',
      'findByStatus',
      'findByPeriod',
      'findBySprint',
    ] as const,
  },
  allocation: {
    prefix: 'allocation',
    methods: [
      'create',
      'update',
      'delete',
      'findById',
      'findByTeamMember',
      'findByTask',
      'findByPeriod',
      'getGanttData',
    ] as const,
  },
  teamMemberAllocation: {
    prefix: 'team-member-allocation',
    methods: [
      'create',
      'update',
      'delete',
      'deactivate',
      'findById',
      'findByTeam',
      'findByTeamMember',
      'findActiveByTeam',
      'findActiveByTeamMember',
      'findAll',
      'getTeamCapacity',
      'getMemberAvailability',
    ] as const,
  },
  dashboard: {
    prefix: 'dashboard',
    methods: [
      'getSummary',
      'getActiveMembers',
      'getTasksInProgress',
      'getMembersWithHighWorkload',
      'getMembersWithoutAllocation',
    ] as const,
  },
  azureDevOps: {
    prefix: 'azure-devops',
    methods: [
      'saveConfig',
      'getConfig',
      'testConnection',
      'fetchWorkItems',
      'importWorkItems',
      'syncTask',
      'syncAllImportedTasks',
    ] as const,
  },
  autoUpdater: {
    prefix: 'autoUpdater',
    methods: [
      'getAppVersion',
      'checkForUpdates',
      'downloadUpdate',
      'installUpdate',
      'getUpdateState',
    ] as const,
  },
  auth: {
    prefix: 'auth',
    methods: [
      'register',
      'login',
      'logout',
      'checkAuth',
      'getCurrentUser',
      'updateProfile',
      'changePassword',
    ] as const,
  },
  taskStatusConfig: {
    prefix: 'task-status-config',
    methods: ['findAll', 'findKanban', 'create', 'update', 'delete'] as const,
  },
} as const;

export type ControllerConfigType = typeof CONTROLLER_CONFIG;
