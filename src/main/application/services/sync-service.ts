/**
 * SyncService — Central orchestrator for full synchronization with Azure DevOps.
 *
 * Fetches iterations, area paths, and all work items from Azure DevOps,
 * then parses and upserts sprints, teams, members, and tasks into the local database.
 *
 * The Hub is READ-ONLY with respect to Azure DevOps — it never sends data back.
 *
 * Optimized with batch processing and progress reporting.
 */

import { AzureDevOpsService } from './azure-devops-service';
import { SprintRepository } from '../repositories/sprint-repository';
import { TeamRepository } from '../repositories/team-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TaskRepository } from '../repositories/task-repository';

import {
  flattenIterationTree,
  parseSprintMany,
  type AzureIterationNode,
  type ParsedSprint,
} from '../parsers/sprint-parser';
import {
  flattenAreaTree,
  parseTeamMany,
  type ParsedTeam,
} from '../parsers/team-parser';
import {
  parseMemberMany,
  deduplicateMembers,
  type ParsedMember,
} from '../parsers/member-parser';
import {
  parseTaskMany,
  type AzureWorkItem,
  type ParsedTask,
} from '../parsers/task-parser';

import type { SprintEntity } from '../entities/sprint.entity';
import type { TeamEntity } from '../entities/team.entity';

import { logger } from '@main/infrastructure/log/logger';
import { BrowserWindow } from 'electron';
import {
  normalizeIterationPath as normalizeIterationPathUtil,
  resolveSprintByIterationPath as resolveSprintByIterationPathUtil,
} from '@main/infrastructure/utils/iteration-path';
import { resolveTeamByAreaPath as resolveTeamByAreaPathUtil } from '@main/infrastructure/utils/area-path';

interface SyncStepResult {
  created: number;
  updated: number;
  total: number;
  errors: string[];
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

export interface SyncProgress {
  step: 'sprints' | 'teams' | 'work_items' | 'members' | 'tasks' | 'complete';
  message: string;
  current: number;
  total: number;
  percentage: number;
  stepErrors?: string[];
  stepResult?: { created: number; updated: number; total: number };
}

export class SyncService {
  private mainWindow: BrowserWindow | null = null;
  private readonly BATCH_SIZE = 50; // Process items in batches

  constructor(
    private azureDevOpsService: AzureDevOpsService,
    private sprintRepository: SprintRepository,
    private teamRepository: TeamRepository,
    private teamMemberRepository: TeamMemberRepository,
    private taskRepository: TaskRepository,
  ) {}

  /**
   * Yields control back to the event loop so the UI stays responsive.
   * Call this between heavy synchronous operations (e.g. DB writes).
   */
  private yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
  }

  setMainWindow(window: BrowserWindow | null): void {
    this.mainWindow = window;
  }

  private emitProgress(progress: SyncProgress): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('sync:progress', progress);
    }
  }

  /**
   * Performs a full synchronization of all data from Azure DevOps.
   *
   * Flow:
   * 1. Fetch iterations → parse → upsert sprints
   * 2. Fetch area paths → parse → upsert teams
   * 3. Fetch all work items
   * 4. Parse members from work items → upsert members
   * 5. Parse tasks from work items → resolve relationships → upsert tasks
   * 6. Return FullSyncResult with counters and errors
   *
   * Error handling: catches errors per step, continues with next steps,
   * collects errors in the result.
   *
   * Optimized with batch processing and progress reporting.
   */
  async fullSync(): Promise<FullSyncResult> {
    const errors: string[] = [];

    // Steps 1 & 2: Sync sprints and teams in parallel (they are independent)
    this.emitProgress({
      step: 'sprints',
      message: 'Sincronizando sprints e equipes...',
      current: 0,
      total: 100,
      percentage: 0,
    });

    let sprintsResult: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };
    let teamsResult: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    // Run sprints and teams sync in parallel since they don't depend on each other
    const [sprintsOutcome, teamsOutcome] = await Promise.allSettled([
      this.syncSprints(),
      this.syncTeams(),
    ]);

    if (sprintsOutcome.status === 'fulfilled') {
      sprintsResult = sprintsOutcome.value;
      errors.push(...sprintsResult.errors);
    } else {
      const msg = `Erro ao sincronizar sprints: ${sprintsOutcome.reason instanceof Error ? sprintsOutcome.reason.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
      sprintsResult.errors.push(msg);
    }

    if (teamsOutcome.status === 'fulfilled') {
      teamsResult = teamsOutcome.value;
      errors.push(...teamsResult.errors);
    } else {
      const msg = `Erro ao sincronizar equipes: ${teamsOutcome.reason instanceof Error ? teamsOutcome.reason.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
      teamsResult.errors.push(msg);
    }

    this.emitProgress({
      step: 'sprints',
      message:
        sprintsResult.errors.length > 0
          ? `Sprints sincronizados com ${sprintsResult.errors.length} erro(s)`
          : `Sprints sincronizados: ${sprintsResult.total}`,
      current: 20,
      total: 100,
      percentage: 20,
      stepErrors:
        sprintsResult.errors.length > 0 ? sprintsResult.errors : undefined,
      stepResult: {
        created: sprintsResult.created,
        updated: sprintsResult.updated,
        total: sprintsResult.total,
      },
    });

    this.emitProgress({
      step: 'teams',
      message:
        teamsResult.errors.length > 0
          ? `Equipes sincronizadas com ${teamsResult.errors.length} erro(s)`
          : `Equipes sincronizadas: ${teamsResult.total}`,
      current: 40,
      total: 100,
      percentage: 40,
      stepErrors:
        teamsResult.errors.length > 0 ? teamsResult.errors : undefined,
      stepResult: {
        created: teamsResult.created,
        updated: teamsResult.updated,
        total: teamsResult.total,
      },
    });

    // Step 3: Fetch all work items
    this.emitProgress({
      step: 'work_items',
      message: 'Buscando work items do Azure DevOps...',
      current: 40,
      total: 100,
      percentage: 40,
    });

    let workItems: AzureWorkItem[] = [];
    const workItemErrors: string[] = [];
    try {
      workItems = await this.azureDevOpsService.fetchAllWorkItems();
      logger.info(
        `[fullSync] Fetched ${workItems.length} work items from Azure DevOps`,
      );
    } catch (error) {
      const msg = `Erro ao buscar work items: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      logger.error(msg);
      logger.error('[fullSync] Error details:', error);
      errors.push(msg);
      workItemErrors.push(msg);
    }

    this.emitProgress({
      step: 'work_items',
      message:
        workItemErrors.length > 0
          ? `Erro ao buscar work items`
          : `${workItems.length} work items encontrados`,
      current: 60,
      total: 100,
      percentage: 60,
      stepErrors: workItemErrors.length > 0 ? workItemErrors : undefined,
    });

    // Step 4: Sync members from work items
    this.emitProgress({
      step: 'members',
      message: 'Sincronizando membros da equipe...',
      current: 60,
      total: 100,
      percentage: 60,
    });

    let membersResult: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };
    try {
      membersResult = await this.syncMembers(workItems);
      errors.push(...membersResult.errors);
    } catch (error) {
      const msg = `Erro ao sincronizar membros: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
      membersResult.errors.push(msg);
    }

    this.emitProgress({
      step: 'members',
      message:
        membersResult.errors.length > 0
          ? `Membros sincronizados com ${membersResult.errors.length} erro(s)`
          : `Membros sincronizados: ${membersResult.total}`,
      current: 80,
      total: 100,
      percentage: 80,
      stepErrors:
        membersResult.errors.length > 0 ? membersResult.errors : undefined,
      stepResult: {
        created: membersResult.created,
        updated: membersResult.updated,
        total: membersResult.total,
      },
    });

    // Step 5: Sync tasks from work items (needs sprints and teams for relationship resolution)
    this.emitProgress({
      step: 'tasks',
      message: `Sincronizando ${workItems.length} tarefas...`,
      current: 80,
      total: 100,
      percentage: 80,
    });

    let tasksResult: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };
    try {
      const allSprints = await this.sprintRepository.findAll();
      const allTeams = await this.teamRepository.findAll();
      tasksResult = await this.syncTasks(workItems, allSprints, allTeams);
      errors.push(...tasksResult.errors);
    } catch (error) {
      const msg = `Erro ao sincronizar tarefas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
      tasksResult.errors.push(msg);
    }

    const failureCount = errors.length;

    if (failureCount > 0) {
      logger.warning(
        `[fullSync] Sincronização concluída com ${failureCount} falha(s). Detalhes: ${errors.join('; ')}`,
      );
    }

    // Single WAL checkpoint after all bulk operations are done
    try {
      await this.taskRepository.walCheckpoint();
    } catch (error) {
      logger.warning('[fullSync] WAL checkpoint failed:', error);
    }

    this.emitProgress({
      step: 'complete',
      message:
        failureCount > 0
          ? `Sincronização concluída com ${failureCount} falha(s).`
          : 'Sincronização concluída!',
      current: 100,
      total: 100,
      percentage: 100,
      stepErrors:
        tasksResult.errors.length > 0 ? tasksResult.errors : undefined,
      stepResult: {
        created: tasksResult.created,
        updated: tasksResult.updated,
        total: tasksResult.total,
      },
    });

    return {
      sprints: {
        created: sprintsResult.created,
        updated: sprintsResult.updated,
        total: sprintsResult.total,
      },
      teams: {
        created: teamsResult.created,
        updated: teamsResult.updated,
        total: teamsResult.total,
      },
      members: {
        created: membersResult.created,
        updated: membersResult.updated,
        total: membersResult.total,
      },
      tasks: {
        created: tasksResult.created,
        updated: tasksResult.updated,
        total: tasksResult.total,
      },
      errors,
      failureCount,
      syncedAt: new Date(),
    };
  }

  /**
   * Sync sprints: fetch iteration nodes → flatten → parse → upsert by iterationPath.
   */
  private async syncSprints(): Promise<SyncStepResult> {
    const result: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    const iterationNodes = await this.azureDevOpsService.fetchIterationNodes();

    // Flatten all iteration trees into a single list
    const flatNodes: AzureIterationNode[] = [];
    for (const node of iterationNodes) {
      flatNodes.push(...flattenIterationTree(node));
    }

    // Parse into ParsedSprint[] (filters out nodes without dates)
    const parsedSprints = parseSprintMany(flatNodes);

    // Pre-load all existing sprints once (instead of per-item)
    const existingSprints = await this.sprintRepository.findAll();
    const sprintMap = new Map(
      existingSprints
        .filter((s) => s.iterationPath)
        .map((s) => [s.iterationPath!, s]),
    );

    for (let i = 0; i < parsedSprints.length; i++) {
      try {
        await this.upsertSprint(parsedSprints[i], result, sprintMap);
      } catch (error) {
        const msg = `Erro ao upsert sprint "${parsedSprints[i].name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
      // Yield to event loop every 10 items to keep UI responsive
      if (i % 10 === 0) await this.yieldToEventLoop();
    }

    result.total = result.created + result.updated;
    return result;
  }

  private async upsertSprint(
    parsed: ParsedSprint,
    result: SyncStepResult,
    sprintMap: Map<string, SprintEntity>,
  ): Promise<void> {
    const match = sprintMap.get(parsed.iterationPath);

    if (match) {
      // Update existing sprint
      await this.sprintRepository.update(match.id, {
        name: parsed.name,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      });
      result.updated++;
      logger.debug('[upsertSprint] Updated:', {
        id: match.id,
        name: parsed.name,
        iterationPath: parsed.iterationPath,
      });
    } else {
      // Create new sprint
      const created = await this.sprintRepository.create({
        name: parsed.name,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        iterationPath: parsed.iterationPath,
        isActive: true,
      });
      result.created++;
      logger.debug('[upsertSprint] Created:', {
        id: created.id,
        name: parsed.name,
        iterationPath: parsed.iterationPath,
      });
    }
  }

  /**
   * Sync teams: fetch area paths → flatten → parse → upsert by azureAreaPath.
   */
  private async syncTeams(): Promise<SyncStepResult> {
    const result: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    const areaNodes = await this.azureDevOpsService.fetchAreaPaths();

    // Flatten all area trees into a single list
    const flatNodes = areaNodes.flatMap((node) => flattenAreaTree(node));

    // Parse into ParsedTeam[]
    const parsedTeams = parseTeamMany(flatNodes);

    for (let i = 0; i < parsedTeams.length; i++) {
      try {
        await this.upsertTeam(parsedTeams[i], result);
      } catch (error) {
        const msg = `Erro ao upsert equipe "${parsedTeams[i].name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
      // Yield to event loop every 10 items to keep UI responsive
      if (i % 10 === 0) await this.yieldToEventLoop();
    }

    result.total = result.created + result.updated;
    return result;
  }

  private async upsertTeam(
    parsed: ParsedTeam,
    result: SyncStepResult,
  ): Promise<void> {
    // Find existing team by azureAreaPath
    const match = await this.teamRepository.findByAreaPath(
      parsed.azureAreaPath,
    );

    if (match) {
      // Update existing team name
      await this.teamRepository.update(match.id, {
        name: parsed.name,
      });
      result.updated++;
      logger.debug('[upsertTeam] Updated:', {
        id: match.id,
        name: parsed.name,
        azureAreaPath: parsed.azureAreaPath,
      });
    } else {
      // Create new team
      const created = await this.teamRepository.create({
        name: parsed.name,
        azureAreaPath: parsed.azureAreaPath,
        isActive: true,
      });
      result.created++;
      logger.debug('[upsertTeam] Created:', {
        id: created.id,
        name: parsed.name,
        azureAreaPath: parsed.azureAreaPath,
      });
    }
  }

  /**
   * Sync members: extract AssignedTo from work items → parse → deduplicate → upsert by email.
   */
  private async syncMembers(
    workItems: AzureWorkItem[],
  ): Promise<SyncStepResult> {
    const result: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    // Extract AssignedTo objects from work items (skip items without AssignedTo)
    const assignedToList = workItems
      .map((wi) => wi.fields['System.AssignedTo'])
      .filter((a): a is NonNullable<typeof a> => a != null);

    // Parse and deduplicate by email
    const parsedMembers = deduplicateMembers(parseMemberMany(assignedToList));

    for (let i = 0; i < parsedMembers.length; i++) {
      try {
        await this.upsertMember(parsedMembers[i], result);
      } catch (error) {
        const msg = `Erro ao upsert membro "${parsedMembers[i].name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
      // Yield to event loop every 10 items to keep UI responsive
      if (i % 10 === 0) await this.yieldToEventLoop();
    }

    result.total = result.created + result.updated;
    return result;
  }

  private async upsertMember(
    parsed: ParsedMember,
    result: SyncStepResult,
  ): Promise<void> {
    // Find existing member by email
    const match = await this.teamMemberRepository.findByEmail(parsed.email);

    if (match) {
      // Update azureUniqueId if provided
      if (parsed.azureUniqueId) {
        await this.teamMemberRepository.update(
          { id: match.id },
          { azureUniqueId: parsed.azureUniqueId },
        );
      }
      result.updated++;
    } else {
      // Create new member with default role 'developer'
      await this.teamMemberRepository.save({
        name: parsed.name,
        email: parsed.email,
        azureUniqueId: parsed.azureUniqueId,
        role: 'developer',
        isActive: true,
      });
      result.created++;
    }
  }

  /**
   * Sync tasks: parse work items → resolve relationships (sprint, team) → upsert by externalId + origin.
   * Then link parent-child relationships in a second pass.
   *
   * Optimized:
   * - Pre-loads all existing tasks into a Map (1 query instead of N)
   * - Batches DB writes
   * - Syncs task updates with limited concurrency (not 1-by-1)
   * - Pre-loads all tasks for linkTaskHierarchy (1 query instead of 2N)
   */
  private async syncTasks(
    workItems: AzureWorkItem[],
    sprints: SprintEntity[],
    teams: TeamEntity[],
  ): Promise<SyncStepResult> {
    const result: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };

    const parsedTasks = parseTaskMany(workItems);
    const totalTasks = parsedTasks.length;

    // Pre-load ALL existing azure_devops tasks into a Map<externalId, TaskEntity>
    // This replaces 1788 individual SELECT queries with 1 single query
    const allExistingTasks = await this.taskRepository.find({
      where: { origin: 'azure_devops' as const },
    });
    const existingTaskMap = new Map<string, { id: number }>();
    for (const task of allExistingTasks) {
      if (task.externalId) {
        existingTaskMap.set(task.externalId, { id: task.id });
      }
    }
    logger.info(
      `[syncTasks] Pre-loaded ${existingTaskMap.size} existing tasks into map`,
    );

    // FIRST PASS: Create/update all tasks without parent relationships
    for (let i = 0; i < parsedTasks.length; i += this.BATCH_SIZE) {
      const batch = parsedTasks.slice(i, i + this.BATCH_SIZE);
      const batchPromises = batch.map((parsed) =>
        this.upsertTask(parsed, sprints, teams, result, existingTaskMap).catch(
          (error) => {
            const msg = `Erro ao upsert tarefa "${parsed.title}" (externalId=${parsed.externalId}): ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
            logger.error(msg);
            result.errors.push(msg);
          },
        ),
      );

      await Promise.all(batchPromises);

      // Yield to event loop between batches to keep UI responsive
      await this.yieldToEventLoop();

      // Emit progress for tasks
      const processed = Math.min(i + this.BATCH_SIZE, totalTasks);
      const percentage = 80 + Math.floor((processed / totalTasks) * 10);
      this.emitProgress({
        step: 'tasks',
        message: `Sincronizando tarefas: ${processed}/${totalTasks}`,
        current: processed,
        total: totalTasks,
        percentage,
      });
    }

    // SECOND PASS: Link parent-child relationships (using pre-loaded map)
    this.emitProgress({
      step: 'tasks',
      message: 'Vinculando hierarquia de tarefas...',
      current: totalTasks,
      total: totalTasks,
      percentage: 90,
    });

    await this.linkTaskHierarchy(workItems);

    result.total = result.created + result.updated;
    return result;
  }

  private async upsertTask(
    parsed: ParsedTask,
    sprints: SprintEntity[],
    teams: TeamEntity[],
    result: SyncStepResult,
    existingTaskMap: Map<string, { id: number }>,
  ): Promise<void> {
    // Resolve Task → Sprint by iterationPath
    const sprintId = this.resolveSprintByIterationPath(
      parsed.iterationPath,
      sprints,
    );

    // Resolve Task → Team by areaPath
    const teamId = this.resolveTeamByAreaPath(parsed.areaPath, teams);

    // Enhanced debug logging for first few tasks
    if (result.created + result.updated < 5) {
      logger.info('[upsertTask] Debug info:', {
        taskTitle: parsed.title,
        iterationPath: parsed.iterationPath,
        areaPath: parsed.areaPath,
        resolvedSprintId: sprintId,
        resolvedTeamId: teamId,
        totalSprints: sprints.length,
        totalTeams: teams.length,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        availableSprints: sprints.slice(0, 3).map((s) => ({
          id: s.id,
          name: s.name,
          iterationPath: s.iterationPath,
        })),
        availableTeams: teams.slice(0, 3).map((t) => ({
          id: t.id,
          name: t.name,
          azureAreaPath: t.azureAreaPath,
        })),
      });
    }

    const taskData = {
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      status: parsed.status,
      priority: parsed.priority,
      areaPath: parsed.areaPath,
      iterationPath: parsed.iterationPath,
      tags: parsed.tags,
      storyPoints: parsed.storyPoints,
      assignedToName: parsed.assignedToName,
      assignedToEmail: parsed.assignedToEmail,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      azureCreatedDate: parsed.azureCreatedDate,
      azureChangedDate: parsed.azureChangedDate,
      azurePriority: parsed.azurePriority,
      sprintId: sprintId ?? undefined,
      teamId: teamId ?? undefined,
    };

    // Use pre-loaded map instead of individual DB query
    const existing = existingTaskMap.get(parsed.externalId);

    if (existing) {
      await this.taskRepository.update({ id: existing.id }, taskData);
      result.updated++;
    } else {
      // Create new task
      await this.taskRepository.save({
        ...taskData,
        externalId: parsed.externalId,
        origin: parsed.origin,
        sprintId: sprintId ?? undefined,
        teamId: teamId ?? undefined,
      });
      result.created++;
    }
  }

  /**
   * Normalizes an iteration path for comparison:
   * - Removes leading backslashes
   * - Trims whitespace
   * - Converts to lowercase
   */
  private normalizeIterationPath(path: string): string {
    return normalizeIterationPathUtil(path);
  }

  /**
   * Resolve Task → Sprint: match task's iterationPath with sprint's iterationPath.
   *
   * Rules:
   * 1. Exact match: task.iterationPath === sprint.iterationPath
   * 2. Hierarchical match: task.iterationPath starts with sprint.iterationPath
   *    (task is inside the sprint's iteration)
   *
   * A task with iterationPath "Tribo SEIF" should NOT match a sprint with
   * iterationPath "Tribo SEIF\Sprints\Sprint 18" because the task is at a
   * higher level (not inside the sprint).
   */
  private resolveSprintByIterationPath(
    iterationPath: string | undefined,
    sprints: SprintEntity[],
  ): number | null {
    if (!iterationPath) {
      logger.debug('[resolveSprintByIterationPath] No iterationPath provided');
      return null;
    }

    const normalizedTaskPath = this.normalizeIterationPath(iterationPath);

    // Log available sprints for debugging (only first time)
    if (sprints.length > 0) {
      logger.debug('[resolveSprintByIterationPath] Available sprints:', {
        count: sprints.length,
        sprints: sprints.slice(0, 5).map((s) => ({
          id: s.id,
          name: s.name,
          iterationPath: s.iterationPath,
          normalized: s.iterationPath
            ? this.normalizeIterationPath(s.iterationPath)
            : null,
        })),
      });
    }

    logger.debug('[resolveSprintByIterationPath] Looking for sprint:', {
      taskIterationPath: iterationPath,
      normalizedTaskPath,
    });

    // Delegate to pure utility function
    const result = resolveSprintByIterationPathUtil(iterationPath, sprints);

    if (result !== null) {
      const matched = sprints.find((s) => s.id === result);
      if (matched) {
        logger.info('[resolveSprintByIterationPath] Match found:', {
          sprintId: matched.id,
          sprintName: matched.name,
          sprintIterationPath: matched.iterationPath,
          taskPath: normalizedTaskPath,
        });
      }
    } else {
      const sortedSprints = [...sprints]
        .filter((s) => s.iterationPath)
        .sort(
          (a, b) =>
            (b.iterationPath?.length ?? 0) - (a.iterationPath?.length ?? 0),
        );
      logger.warning(
        '[resolveSprintByIterationPath] Iteration_Path não resolvido — nenhuma sprint local corresponde. sprint_id será null.',
        {
          taskIterationPath: iterationPath,
          normalizedTaskPath,
          availableSprintPaths: sortedSprints
            .slice(0, 5)
            .map((s) => this.normalizeIterationPath(s.iterationPath!)),
        },
      );
    }

    return result;
  }

  /**
   * Resolve Task → Team: match task's areaPath with team's azureAreaPath.
   *
   * Rules:
   * 1. Exact match: task.areaPath === team.azureAreaPath
   * 2. Hierarchical match: task.areaPath starts with team.azureAreaPath
   *    (longest prefix wins — most specific team)
   *
   * If no team matches, returns null and emits a warning log.
   */
  /**
   * Resolve Task → Team: match task's areaPath with team's azureAreaPath.
   *
   * Rules:
   * 1. Exact match: task.areaPath === team.azureAreaPath
   * 2. Hierarchical match: task.areaPath starts with team.azureAreaPath
   *    (longest prefix wins — most specific team)
   *
   * If no team matches, returns null and emits a warning log.
   */
  private resolveTeamByAreaPath(
    areaPath: string | undefined,
    teams: TeamEntity[],
  ): number | null {
    if (!areaPath) {
      logger.debug('[resolveTeamByAreaPath] No areaPath provided');
      return null;
    }

    const normalizedAreaPath = areaPath
      .replace(/^\\+/, '')
      .trim()
      .toLowerCase();

    logger.debug('[resolveTeamByAreaPath] Looking for team:', {
      taskAreaPath: areaPath,
      normalizedAreaPath,
      availableTeams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        azureAreaPath: t.azureAreaPath,
      })),
    });

    // Delegate to pure utility function
    const result = resolveTeamByAreaPathUtil(areaPath, teams);

    if (result !== null) {
      const matched = teams.find((t) => t.id === result);
      if (matched) {
        logger.debug('[resolveTeamByAreaPath] Match found:', {
          teamId: matched.id,
          teamPath: matched.azureAreaPath,
        });
      }
    } else {
      logger.warning(
        '[resolveTeamByAreaPath] Area_Path não resolvido — nenhum time local corresponde. team_id será null.',
        {
          taskAreaPath: areaPath,
          normalizedAreaPath,
        },
      );
    }

    return result;
  }

  /**
   * Link parent-child relationships between tasks based on Azure DevOps relations.
   * This runs after all tasks have been created/updated.
   *
   * Optimized: pre-loads all azure_devops tasks into a Map (1 query)
   * instead of 2 queries per work item.
   */
  private async linkTaskHierarchy(workItems: AzureWorkItem[]): Promise<void> {
    let linkedCount = 0;
    let errorCount = 0;

    // Pre-load all azure_devops tasks into a Map<externalId, id> — 1 query
    const allTasks = await this.taskRepository.find({
      where: { origin: 'azure_devops' as const },
    });
    const taskMap = new Map<string, { id: number; title: string }>();
    for (const task of allTasks) {
      if (task.externalId) {
        taskMap.set(task.externalId, { id: task.id, title: task.title });
      }
    }

    // Collect all updates to batch them
    const updates: Array<{ childId: number; parentId: number }> = [];

    for (const workItem of workItems) {
      if (!workItem.relations || workItem.relations.length === 0) {
        continue;
      }

      const parentRelation = workItem.relations.find(
        (r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse',
      );

      if (!parentRelation) {
        continue;
      }

      try {
        const match = parentRelation.url.match(/workItems\/(\d+)$/);
        if (!match) {
          continue;
        }

        const parentExternalId = match[1];
        const childExternalId = String(workItem.id);

        const childTask = taskMap.get(childExternalId);
        const parentTask = taskMap.get(parentExternalId);

        if (childTask && parentTask) {
          updates.push({ childId: childTask.id, parentId: parentTask.id });
          linkedCount++;

          if (linkedCount <= 5) {
            logger.info('[linkTaskHierarchy] Linked task:', {
              childId: childTask.id,
              childTitle: childTask.title,
              parentId: parentTask.id,
              parentTitle: parentTask.title,
            });
          }
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          logger.error('[linkTaskHierarchy] Error linking task:', {
            workItemId: workItem.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Batch the updates in groups
    const LINK_BATCH = 100;
    for (let i = 0; i < updates.length; i += LINK_BATCH) {
      const batch = updates.slice(i, i + LINK_BATCH);
      await Promise.all(
        batch.map((u) =>
          this.taskRepository.update(
            { id: u.childId },
            { parentId: u.parentId },
          ),
        ),
      );
      // Yield to event loop between batches to keep UI responsive
      await this.yieldToEventLoop();
    }

    logger.info('[linkTaskHierarchy] Summary:', {
      totalWorkItems: workItems.length,
      linkedCount,
      errorCount,
    });
  }
}
