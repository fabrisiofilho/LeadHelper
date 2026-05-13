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
  allowedStatuses?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreatePositionInput {
  name: string;
  description?: string;
  allowedStatuses?: string;
}

export interface UpdatePositionInput {
  name?: string;
  description?: string;
  allowedStatuses?: string;
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

/**
 * SLA limits per priority in business hours.
 * Business hours: 08:00–12:00 and 13:30–17:30 (8h/day).
 */
export const SLA_LIMITS: Record<TaskPriority, number> = {
  critical: 4, // Prioridade 4 (Crítica): 4 horas úteis
  high: 8, // Prioridade 3 (Alta): 8 horas úteis (1 dia útil)
  medium: 24, // Prioridade 2 (Média): 24 horas úteis (3 dias úteis)
  low: 40, // Prioridade 1 (Baixa): 40 horas úteis (5 dias úteis)
};

// TaskType uses Azure DevOps work item types directly (Epic, Feature, User Story, Task, Bug, etc.)
export type TaskType = string;

export interface Task {
  id: number;
  title: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType; // Azure DevOps work item type (Epic, Feature, User Story, Task, Bug, etc.)
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
  azureCreatedDate?: Date;
  azureChangedDate?: Date;
  azurePriority?: number;
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
  notes?: string;
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

// Default Area Paths for Sustentação and Projetos (Property 25)
export const DEFAULT_SUSTENTACAO_AREA_PATH = 'Tribo SEIF\\Sustentação';
export const DEFAULT_PROJETOS_AREA_PATH = 'Tribo SEIF\\Projetos';

export interface AzureDevOpsConfig {
  organizationUrl: string;
  projectName: string;
  isConfigured: boolean;
  pat?: string; // Optional decrypted PAT for display purposes
  sustentacaoAreaPath?: string;
  projetosAreaPath?: string;
}

export interface AzureDevOpsConfigInput {
  organizationUrl: string;
  projectName: string;
  pat: string;
  sustentacaoAreaPath?: string;
  projetosAreaPath?: string;
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

export interface WorkItemUpdate {
  revision: number;
  changedDate: Date;
  changedBy?: string;
  fields: {
    fieldName: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

/** Record returned by getTaskUpdateHistory for display in CardHistoryDialog */
export interface TaskUpdateRecord {
  id: number;
  changedDate: Date;
  changedBy?: string;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
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
// Note Card Types
// ============================================================================

export interface NoteCard {
  id: number;
  title: string;
  body: string; // Conteúdo HTML gerado pelo TipTap (rich text)
  deadline?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  links: NoteLink[];
}

export interface NoteLink {
  id: number;
  noteCardId: number;
  entityType: 'team_member' | 'team' | 'position' | 'task';
  entityId: number;
  entityName?: string; // Resolvido no service ao carregar
}

export interface CreateNoteCardInput {
  title: string;
  body: string; // HTML string do TipTap
  deadline?: string | null;
  links?: { entityType: string; entityId: number }[];
}

export interface UpdateNoteCardInput {
  title?: string;
  body?: string; // HTML string do TipTap
  deadline?: string | null;
  links?: { entityType: string; entityId: number }[];
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
  importPositions(
    rows: Array<{ email: string; positionId: number }>,
  ): Promise<ApiResponse<{ updated: number; errors: string[] }>>;
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
  search(query: string, limit?: number): Promise<ApiResponse<Task[]>>;
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
  // Extended dashboard methods
  getSustentacaoItems(
    options?: SustentacaoOptions,
  ): Promise<ApiResponse<SustentacaoItemWithSLA[]>>;
  getSustentacaoMetrics(
    statuses?: string[],
  ): Promise<ApiResponse<SustentacaoMetrics>>;
  getSustentacaoMembersWithCards(): Promise<
    ApiResponse<SustentacaoMemberWithCards[]>
  >;
  getTaskAllocationData(): Promise<ApiResponse<TaskAllocationMember[]>>;
  getProjetosItems(sprintId: number): Promise<ApiResponse<ProjetosResult>>;
  getTaskUpdateHistory(
    taskId: number,
  ): Promise<ApiResponse<TaskUpdateRecord[]>>;
  getBurndownData(sprintId: number): Promise<ApiResponse<BurndownPoint[]>>;
  getStatusDistribution(
    parentId?: number,
  ): Promise<ApiResponse<StatusDistribution[]>>;
  getAssigneeDistribution(
    parentId?: number,
  ): Promise<ApiResponse<AssigneeDistribution[]>>;
  getHierarchyProgress(
    parentId: number,
  ): Promise<ApiResponse<HierarchyProgress>>;
  excludeSla(externalId: string, reason?: string): Promise<ApiResponse<void>>;
  restoreSla(externalId: string): Promise<ApiResponse<void>>;
  getSlaExclusions(): Promise<ApiResponse<string[]>>;
  hideItem(externalId: string, reason?: string): Promise<ApiResponse<void>>;
  unhideItem(externalId: string): Promise<ApiResponse<void>>;
  invalidateCache(): Promise<ApiResponse<void>>;
}

export interface FullSyncResult {
  sprints: { created: number; updated: number; total: number };
  teams: { created: number; updated: number; total: number };
  members: { created: number; updated: number; total: number };
  tasks: { created: number; updated: number; total: number };
  errors: string[];
  failureCount: number;
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
  proxyImage(imageUrl: string): Promise<ApiResponse<string>>;
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
// Task Local Priority Types
// ============================================================================

export interface TaskLocalPriority {
  id: number;
  externalId: string;
  localPriority: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskLocalPriorityController {
  get(externalId: string): Promise<ApiResponse<TaskLocalPriority | null>>;
  set(
    externalId: string,
    priority: number,
  ): Promise<ApiResponse<TaskLocalPriority>>;
  remove(externalId: string): Promise<ApiResponse<void>>;
  getBatch(externalIds: string[]): Promise<ApiResponse<Record<string, number>>>;
}

// ============================================================================
// Hierarchy Types
// ============================================================================

/**
 * Represents a single item in a breadcrumb trail.
 * Contains both the full title and a truncated version for display.
 */
export interface BreadcrumbItem {
  id: number;
  externalId?: string;
  title: string;
  type: string;
  truncatedTitle: string; // Max 30 characters
}

export interface IHierarchyController {
  getChildren(parentId: number): Promise<ApiResponse<Task[]>>;
  countChildren(parentId: number): Promise<ApiResponse<number>>;
  buildBreadcrumb(taskId: number): Promise<ApiResponse<BreadcrumbItem[]>>;
  getRootItems(areaPathPattern: string): Promise<ApiResponse<Task[]>>;
}

// ============================================================================
// Task Local Kanban Types
// ============================================================================

/**
 * Represents a local Kanban position for a work item.
 * Used for simulating card movements without syncing to Azure DevOps.
 */
export interface TaskLocalKanban {
  id: number;
  externalId: string;
  localColumn: string;
  localOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITaskLocalKanbanController {
  getPosition(externalId: string): Promise<ApiResponse<TaskLocalKanban | null>>;
  setPosition(
    externalId: string,
    column: string,
    order: number,
  ): Promise<ApiResponse<TaskLocalKanban>>;
  resetPosition(externalId: string): Promise<ApiResponse<void>>;
  getByContext(parentId?: number): Promise<ApiResponse<TaskLocalKanban[]>>;
}

// ============================================================================
// Dashboard Extended Types
// ============================================================================

/**
 * Options for filtering Sustentação dashboard items.
 */
export interface SustentacaoOptions {
  staleDays?: number;
  sortBy?: 'priority' | 'updatedAt';
}

/**
 * Represents a work item in the Sustentação dashboard.
 * Includes local priority, stale status, and children count.
 */
export interface SustentacaoItem {
  task: Task;
  localPriority: number;
  isStale: boolean;
  daysSinceUpdate: number;
  childrenCount: number;
}

/**
 * Extends SustentacaoItem with SLA calculation fields.
 * Used by the Sustentação dashboard to display SLA status indicators.
 */
export interface SustentacaoItemWithSLA extends SustentacaoItem {
  businessHoursElapsed: number; // horas úteis decorridas
  slaLimit: number; // limite SLA em horas úteis
  slaPercentage: number; // % do SLA consumido
  slaViolated: boolean; // SLA ultrapassado
  slaWarning: boolean; // ≥80% do SLA
  expirationDate: string | null; // data/hora prevista de expiração do SLA
  businessHoursRemaining: number; // horas úteis restantes (negativo se estourado)
  daysUntilExpiration: number; // dias úteis até expirar (negativo se estourado)
  expirationAlert: 'expired' | 'critical' | 'warning' | 'attention' | null;
  // expired = já estourou, critical = 1 dia, warning = 2 dias, attention = 3 dias
  slaExcluded?: boolean; // SLA removido manualmente pelo usuário
  isHidden?: boolean; // Item oculto/desativado pelo usuário
  // Local priority SLA fields (calculated from prioritization note)
  localPriorityDeadline?: string | null; // deadline da nota de priorização
  localPriorityCreatedAt?: string | null; // quando a priorização foi criada
  localPriorityHoursRemaining?: number | null; // horas restantes até estourar (negativo se estourado)
  localPriorityExpired?: boolean; // se a priorização já estourou
}

/**
 * Metrics for the Sustentação dashboard KPI cards.
 */
export interface SustentacaoMetrics {
  totalOpen: number;
  openTickets: number;
  openImprovements: number;
  slaViolatedCount: number;
  slaViolatedPercent: number;
  slaWarningCount: number;
  slaUrgentCount: number;
  unassignedCount: number;
  avgAgeBusinessHours: number;
  avgCloseTimeBusinessHours: number | null; // null if no closed tickets in period
  closedTicketsLast30Days: number;
  byPriority: { priority: string; count: number }[];
  oldestOpenTicketHours: number | null;
  oldestOpenTicketExternalId: string | null;
}

/**
 * Represents a Sustentação team member with their in-progress cards.
 * Used by the Sustentação dashboard to display members and their workload.
 *
 * Validates: Requirements 2.2, 2.3, 2.4
 */
export interface SustentacaoMemberWithCards {
  member: TeamMember;
  inProgressCards: SustentacaoItemWithSLA[];
  hasNoCards: boolean;
}

/**
 * Represents a team member with their tasks filtered by position's allowed statuses.
 * Used by the Task Allocation page.
 */
export interface TaskAllocationMember {
  member: TeamMember;
  /** Tasks grouped by area context */
  taskGroups: TaskAllocationGroup[];
  positionName?: string;
  totalTasks: number;
  hasCards: boolean;
  /** Whether the member's position has allowedStatuses configured */
  hasAllowedStatuses: boolean;
}

export interface TaskAllocationGroup {
  area: string; // e.g. 'Gestão de Terceiros', 'Chamada Tecnológica', 'Projetos', 'Outros'
  tasks: Task[];
}

/**
 * Represents a work item in the Projetos dashboard.
 * Includes progress calculation based on completed children.
 */
export interface ProjetosItem {
  task: Task;
  localPriority: number;
  childrenCount: number;
  completedChildrenCount: number;
  progressPercent: number;
}

/**
 * Quantitative summary of a sprint's cards grouped by status.
 * Property 8: total = pending + inProgress + completed + cancelled
 * and completionPercentage = (completed / total) * 100 (or 0 if total = 0).
 */
export interface SprintQuantitativeSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
  completionPercentage: number;
}

/**
 * Alert for sprint items that are pending (no progress) or stagnant (no update in 2+ business days)
 * when there are ≤5 business days remaining until sprint end.
 *
 * Validates: Requirements 3.4, 3.5
 */
export interface SprintAlert {
  type: 'pending_no_progress' | 'stagnant';
  taskId: number;
  externalId?: string;
  taskTitle: string;
  message: string;
  parentExternalId?: string;
  parentTitle?: string;
}

/**
 * Result of getProjetosItems: items grouped by status + quantitative summary + alerts.
 */
export interface ProjetosResult {
  items: ProjetosItem[];
  groupedByStatus: {
    pending: ProjetosItem[];
    inProgress: ProjetosItem[];
    completed: ProjetosItem[];
    cancelled: ProjetosItem[];
  };
  summary: SprintQuantitativeSummary;
  alerts: SprintAlert[];
}

/**
 * Represents a point in the Burndown chart.
 */
export interface BurndownPoint {
  date: Date;
  planned: number;
  completed: number;
}

/**
 * Represents status distribution for charts.
 */
export interface StatusDistribution {
  status: string;
  count: number;
  color: string;
}

/**
 * Represents assignee distribution for charts.
 */
export interface AssigneeDistribution {
  assignee: string;
  count: number;
}

/**
 * Represents hierarchy progress data.
 */
export interface HierarchyProgress {
  parentId: number;
  parentTitle: string;
  totalChildren: number;
  completedChildren: number;
  progressPercent: number;
}

// ============================================================================
// Sync Status Types
// ============================================================================

export interface SyncStatus {
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  isSyncing: boolean;
  isConfigured: boolean;
}

/** Represents a task status change detected during sync. */
export interface TaskStatusChange {
  externalId: string;
  title: string;
  type: string;
  oldStatus: string;
  newStatus: string;
}

export interface ISyncController {
  getStatus(): Promise<ApiResponse<SyncStatus>>;
}

export interface INoteCardController {
  create(input: CreateNoteCardInput): Promise<ApiResponse<NoteCard>>;
  update(
    id: number,
    input: UpdateNoteCardInput,
  ): Promise<ApiResponse<NoteCard>>;
  delete(id: number): Promise<ApiResponse<void>>;
  complete(id: number): Promise<ApiResponse<NoteCard>>;
  reactivate(id: number): Promise<ApiResponse<NoteCard>>;
  findById(id: number): Promise<ApiResponse<NoteCard>>;
  findAllActive(): Promise<ApiResponse<NoteCard[]>>;
  findAllCompleted(): Promise<ApiResponse<NoteCard[]>>;
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
  taskLocalPriority: ITaskLocalPriorityController;
  hierarchy: IHierarchyController;
  taskLocalKanban: ITaskLocalKanbanController;
  sync: ISyncController;
  noteCard: INoteCardController;

  // Utility methods
  openExternalUrl: (url: string) => void;
  onIpcResult: (callback: (event: IpcResultEvent) => void) => () => void;
  onAutoUpdaterStatus: (callback: (state: UpdateState) => void) => () => void;
  onSyncProgress: (callback: (event: any, progress: any) => void) => () => void;
  offSyncProgress?: (callback: (event: any, progress: any) => void) => void;
  onSyncStatusChanged: (callback: (status: SyncStatus) => void) => () => void;
  onSyncCompleted: (callback: () => void) => () => void;
  onSyncTaskStatusChanges: (
    callback: (changes: TaskStatusChange[]) => void,
  ) => () => void;
  onSyncOpenTask: (callback: (externalId: string) => void) => () => void;
}
