/**
 * Shared types for IPC communication configuration.
 */

import { ApiResponse } from '../types/common.types';
import {
  IAutoUpdaterController,
  UpdateState,
} from '../types/auto-updater.types';
import { IAuthController } from '../controllers/auth.controller.interface';

// ============================================================================
// Common Types
// ============================================================================

export interface IpcResultEvent {
  channel: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// Position Types (Cargos)
// ============================================================================

export interface Position {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePositionInput {
  name: string;
  description?: string;
}

export interface UpdatePositionInput {
  name?: string;
  description?: string;
}

export interface PositionFilters {
  isActive?: boolean;
}

// ============================================================================
// Team Types (Equipes)
// ============================================================================

export interface Team {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  azureAreaPath?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  azureAreaPath?: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  azureAreaPath?: string;
}

export interface TeamFilters {
  isActive?: boolean;
}

// ============================================================================
// Sprint Types
// ============================================================================

export interface Sprint {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  teamId?: number;
  team?: Team;
  description?: string;
  isActive: boolean;
  tasks?: Task[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateSprintInput {
  name: string;
  startDate: Date;
  endDate: Date;
  teamId?: number;
  description?: string;
}

export interface UpdateSprintInput {
  name?: string;
  startDate?: Date;
  endDate?: Date;
  teamId?: number;
  description?: string;
}

export interface SprintFilters {
  teamId?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Team Member Types
// ============================================================================

export type TeamMemberRole =
  | 'developer'
  | 'analyst'
  | 'qa'
  | 'tech_lead'
  | 'devops'
  | 'designer'
  | 'product_owner';

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamMemberRole;
  isActive: boolean;
  positionId?: number;
  position?: Position;
  teams?: Team[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTeamMemberInput {
  name: string;
  email: string;
  role: TeamMemberRole;
  positionId?: number;
  teamIds?: number[];
}

export interface UpdateTeamMemberInput {
  name?: string;
  email?: string;
  role?: TeamMemberRole;
  positionId?: number;
  teamIds?: number[];
}

export interface TeamMemberFilters {
  role?: TeamMemberRole;
  isActive?: boolean;
  teamId?: number;
  positionId?: number;
}

// ============================================================================
// Task Types
// ============================================================================

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | (string & {});
export type TaskOrigin = 'manual' | 'azure_devops';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskType =
  | 'task'
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'support'
  | (string & {});

export interface Task {
  id: number;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  origin: TaskOrigin;
  externalId?: string;
  sprintId?: number;
  sprint?: Sprint;
  teamId?: number;
  team?: Team;
  assignee?: { id: number; name: string };
  assignedToName?: string;
  assignedToEmail?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  storyPoints?: number;
  originalWorkItemType?: string;
  parentId?: number;
  parent?: Task;
  children?: Task[];
  workItemRelations?: WorkItemRelation[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkItemRelation {
  rel: string; // e.g., "System.LinkTypes.Hierarchy-Forward", "System.LinkTypes.Related"
  url: string;
  attributes?: {
    name?: string;
    isLocked?: boolean;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  sprintId?: number;
  teamId?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  sprintId?: number;
  teamId?: number;
}

export interface TaskFilters {
  status?: TaskStatus;
  startDate?: Date;
  endDate?: Date;
  origin?: TaskOrigin;
  sprintId?: number;
  teamId?: number;
}

// ============================================================================
// Team Member Allocation Types (Alocação de Membros em Equipes)
// ============================================================================

export interface TeamMemberAllocation {
  id: number;
  teamMemberId: number;
  teamId: number;
  teamMemberName?: string;
  teamName?: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTeamMemberAllocationInput {
  teamMemberId: number;
  teamId: number;
  startDate: Date;
  endDate?: Date;
  notes: string; // Campo "Motivo" — obrigatório
}

export interface UpdateTeamMemberAllocationInput {
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  isActive?: boolean;
}

export interface TeamMemberAllocationFilters {
  teamId?: number;
  teamMemberId?: number;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface TeamCapacitySummary {
  teamId: number;
  teamName: string;
  totalMembers: number;
  members: {
    id: number;
    name: string;
    role: string;
    startDate: Date;
    endDate?: Date;
  }[];
}

// ============================================================================
// Gantt Types
// ============================================================================

export interface GanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
  teamMemberId?: number;
  teamMemberName?: string;
  taskId?: number;
  taskTitle?: string;
  allocationId: number;
  sprintId?: number;
  sprintName?: string;
}

export interface GanttData {
  items: GanttItem[];
  startDate: Date;
  endDate: Date;
  sprints?: Sprint[];
}

export interface GanttFilters {
  groupBy: 'team_member' | 'task';
  startDate: Date;
  endDate: Date;
  teamMemberIds?: number[];
  taskIds?: number[];
  teamId?: number;
  sprintId?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardPeriod {
  startDate: Date;
  endDate: Date;
}

export interface TeamMemberWorkload {
  teamMember: TeamMember;
  totalWorkload: number;
}

export interface DashboardSummary {
  activeMembers: number;
  tasksInProgress: number;
  totalAllocations: number;
  membersWithHighWorkload: TeamMemberWorkload[];
  membersWithoutAllocation: TeamMember[];
}

export interface AllocationConflict {
  memberId: number;
  memberName: string;
  allocatedTeamId: number;
  allocatedTeamName: string;
  taskTeamId: number;
  taskTeamName: string;
  taskTitle: string;
}

export interface AllocationDashboard {
  activeAllocations: number;
  membersAllocated: number;
  membersWithoutAllocation: TeamMember[];
  allocationConflicts: AllocationConflict[];
  allocationsByTeam: { teamName: string; count: number }[];
}

export interface TaskManagementDashboard {
  totalTasks: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByType: { type: string; count: number }[];
  tasksByTeam: { teamName: string; count: number }[];
  unassignedTasks: number;
}

export interface SprintSummary {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date;
  totalTasks: number;
  completedTasks: number;
  totalStoryPoints: number;
}

export interface SprintDashboard {
  activeSprints: SprintSummary[];
  completedSprints: number;
  tasksBySprint: { sprintName: string; total: number; completed: number }[];
  velocity: { sprintName: string; storyPoints: number }[];
}

// ============================================================================
// Azure DevOps Types
// ============================================================================

export interface AzureDevOpsConfig {
  organizationUrl: string;
  projectName: string;
  isConfigured: boolean;
  pat?: string; // Optional decrypted PAT for display purposes
}

export interface AzureDevOpsConfigInput {
  organizationUrl: string;
  projectName: string;
  pat: string;
}

export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  description?: string;
  assignedTo?: string;
  createdDate: Date;
  changedDate: Date;
  // Campos enriquecidos (V2)
  projectName?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  storyPoints?: number;
  priority?: number;
  originalWorkItemType?: string;
  relations?: Array<{
    rel: string;
    url: string;
    attributes?: Record<string, unknown>;
  }>;
}

export interface WorkItemFilters {
  types?: string[];
  states?: string[];
  query?: string;
  iterationPath?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface IterationNode {
  id: number;
  name: string;
  path: string;
  children: IterationNode[];
}

export interface ReportData {
  totalItems: number;
  byType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  byAssignee: Array<{ assignee: string; count: number }>;
  byProject: Array<{ project: string; count: number }>;
  items: ReportItem[];
}

export interface ReportItem {
  id: number;
  title: string;
  type: string;
  originalType?: string;
  status: string;
  assignee?: string;
  project?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  storyPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DashboardMetrics {
  totalImported: number;
  lastSyncDate?: Date;
  pendingSync: number;
  byStatus: Array<{ status: string; count: number }>;
}

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// ============================================================================
// Controller Interfaces
// ============================================================================

export interface IPositionController {
  create(data: CreatePositionInput): Promise<ApiResponse<Position>>;
  update(id: number, data: UpdatePositionInput): Promise<ApiResponse<Position>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Position | null>>;
  findAll(filters?: PositionFilters): Promise<ApiResponse<Position[]>>;
  activate(id: number): Promise<ApiResponse<Position>>;
  deactivate(id: number): Promise<ApiResponse<Position>>;
}

export interface ITeamController {
  create(data: CreateTeamInput): Promise<ApiResponse<Team>>;
  update(id: number, data: UpdateTeamInput): Promise<ApiResponse<Team>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Team | null>>;
  findAll(filters?: TeamFilters): Promise<ApiResponse<Team[]>>;
  activate(id: number): Promise<ApiResponse<Team>>;
  deactivate(id: number): Promise<ApiResponse<Team>>;
  addMember(teamId: number, memberId: number): Promise<ApiResponse<void>>;
  removeMember(teamId: number, memberId: number): Promise<ApiResponse<void>>;
}

export interface ISprintController {
  create(data: CreateSprintInput): Promise<ApiResponse<Sprint>>;
  update(id: number, data: UpdateSprintInput): Promise<ApiResponse<Sprint>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Sprint | null>>;
  findAll(filters?: SprintFilters): Promise<ApiResponse<Sprint[]>>;
  findByTeam(teamId: number): Promise<ApiResponse<Sprint[]>>;
  findCurrent(teamId?: number): Promise<ApiResponse<Sprint | null>>;
  findUpcoming(teamId?: number, limit?: number): Promise<ApiResponse<Sprint[]>>;
  activate(id: number): Promise<ApiResponse<Sprint>>;
  deactivate(id: number): Promise<ApiResponse<Sprint>>;
}

export interface ITeamMemberController {
  create(data: CreateTeamMemberInput): Promise<ApiResponse<TeamMember>>;
  update(
    id: number,
    data: UpdateTeamMemberInput,
  ): Promise<ApiResponse<TeamMember>>;
  deactivate(id: number): Promise<ApiResponse<void>>;
  activate(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<TeamMember | null>>;
  findAll(filters?: TeamMemberFilters): Promise<ApiResponse<TeamMember[]>>;
  findByRole(role: TeamMemberRole): Promise<ApiResponse<TeamMember[]>>;
}

export interface ITaskController {
  create(data: CreateTaskInput): Promise<ApiResponse<Task>>;
  update(id: number, data: UpdateTaskInput): Promise<ApiResponse<Task>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findById(id: number): Promise<ApiResponse<Task | null>>;
  findAll(filters?: TaskFilters): Promise<ApiResponse<Task[]>>;
  findByStatus(status: TaskStatus): Promise<ApiResponse<Task[]>>;
  findByPeriod(startDate: Date, endDate: Date): Promise<ApiResponse<Task[]>>;
  findBySprint(sprintId: number): Promise<ApiResponse<Task[]>>;
}

export interface IDashboardController {
  getSummary(period: DashboardPeriod): Promise<ApiResponse<DashboardSummary>>;
  getActiveMembers(): Promise<ApiResponse<number>>;
  getTasksInProgress(): Promise<ApiResponse<number>>;
  getMembersWithHighWorkload(
    period: DashboardPeriod,
  ): Promise<ApiResponse<TeamMemberWorkload[]>>;
  getMembersWithoutAllocation(
    period: DashboardPeriod,
  ): Promise<ApiResponse<TeamMember[]>>;
  getAllocationDashboard(): Promise<ApiResponse<AllocationDashboard>>;
  getTaskManagementDashboard(): Promise<ApiResponse<TaskManagementDashboard>>;
  getSprintDashboard(): Promise<ApiResponse<SprintDashboard>>;
}

export interface FullSyncResult {
  sprints: { created: number; updated: number; total: number };
  teams: { created: number; updated: number; total: number };
  members: { created: number; updated: number; total: number };
  tasks: { created: number; updated: number; total: number };
  errors: string[];
  syncedAt: Date;
}

export interface IAzureDevOpsController {
  saveConfig(config: AzureDevOpsConfigInput): Promise<ApiResponse<void>>;
  getConfig(
    includePat?: boolean,
  ): Promise<ApiResponse<AzureDevOpsConfig | null>>;
  testConnection(): Promise<ApiResponse<boolean>>;
  fetchWorkItems(filters?: WorkItemFilters): Promise<ApiResponse<WorkItem[]>>;
  fetchIterations(): Promise<ApiResponse<IterationNode[]>>;
  fullSync(): Promise<ApiResponse<FullSyncResult>>;
}

export interface IAllocationController {
  getGanttData(filters: GanttFilters): Promise<ApiResponse<GanttData>>;
  detectConflicts(
    teamMemberId?: number,
  ): Promise<ApiResponse<AllocationConflict[]>>;
}

export interface ITeamMemberAllocationController {
  create(
    data: CreateTeamMemberAllocationInput,
  ): Promise<ApiResponse<TeamMemberAllocation>>;
  update(
    id: number,
    data: UpdateTeamMemberAllocationInput,
  ): Promise<ApiResponse<TeamMemberAllocation>>;
  delete(id: number): Promise<ApiResponse<void>>;
  deactivate(id: number): Promise<ApiResponse<TeamMemberAllocation>>;
  findById(id: number): Promise<ApiResponse<TeamMemberAllocation | null>>;
  findByTeam(teamId: number): Promise<ApiResponse<TeamMemberAllocation[]>>;
  findByTeamMember(
    teamMemberId: number,
  ): Promise<ApiResponse<TeamMemberAllocation[]>>;
  findActiveByTeam(
    teamId: number,
    referenceDate?: Date,
  ): Promise<ApiResponse<TeamMemberAllocation[]>>;
  findActiveByTeamMember(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<ApiResponse<TeamMemberAllocation[]>>;
  findAll(
    filters?: TeamMemberAllocationFilters,
  ): Promise<ApiResponse<TeamMemberAllocation[]>>;
  getTeamCapacity(
    teamId: number,
    referenceDate?: Date,
  ): Promise<ApiResponse<TeamCapacitySummary>>;
  getMemberAvailability(
    teamMemberId: number,
    referenceDate?: Date,
  ): Promise<ApiResponse<number>>;
}

// ============================================================================
// Task Status Config Types (data types only — backend entity removed)
// ============================================================================

export interface TaskStatusConfig {
  id: number;
  name: string;
  label: string;
  color: string;
  order: number;
  showInKanban: boolean;
  isDefault: boolean;
}

export interface CreateTaskStatusConfigInput {
  name: string;
  label: string;
  color?: string;
  order?: number;
  showInKanban?: boolean;
}

export interface UpdateTaskStatusConfigInput {
  label?: string;
  color?: string;
  order?: number;
  showInKanban?: boolean;
}

// ============================================================================
// Task Comment Types
// ============================================================================

export interface TaskComment {
  id: number;
  content: string;
  author?: string;
  taskId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTaskCommentInput {
  content: string;
  author?: string;
  taskId: number;
}

export interface UpdateTaskCommentInput {
  content?: string;
}

export interface ITaskCommentController {
  findByTask(taskId: number): Promise<ApiResponse<TaskComment[]>>;
  create(data: CreateTaskCommentInput): Promise<ApiResponse<TaskComment>>;
  update(
    id: number,
    data: UpdateTaskCommentInput,
  ): Promise<ApiResponse<TaskComment>>;
  delete(id: number): Promise<ApiResponse<void>>;
}

// ============================================================================
// Custom Electron API
// ============================================================================

export interface CustomElectronAPI {
  // Team Management Controllers
  position: IPositionController;
  team: ITeamController;
  sprint: ISprintController;
  teamMember: ITeamMemberController;
  task: ITaskController;
  allocation: IAllocationController;
  teamMemberAllocation: ITeamMemberAllocationController;
  dashboard: IDashboardController;
  azureDevOps: IAzureDevOpsController;
  autoUpdater: IAutoUpdaterController;
  auth: IAuthController;
  taskComment: ITaskCommentController;

  // Utility methods
  openExternalUrl: (url: string) => void;
  onIpcResult: (callback: (event: IpcResultEvent) => void) => () => void;
  onAutoUpdaterStatus: (callback: (state: UpdateState) => void) => () => void;
  onSyncProgress: (callback: (event: any, progress: any) => void) => () => void;
  offSyncProgress?: (callback: (event: any, progress: any) => void) => void;
}
