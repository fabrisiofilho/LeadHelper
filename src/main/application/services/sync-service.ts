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
  syncedAt: Date;
}

export interface SyncProgress {
  step: 'sprints' | 'teams' | 'work_items' | 'members' | 'tasks' | 'complete';
  message: string;
  current: number;
  total: number;
  percentage: number;
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

    // Step 1: Sync sprints
    this.emitProgress({
      step: 'sprints',
      message: 'Sincronizando sprints...',
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
    try {
      sprintsResult = await this.syncSprints();
      errors.push(...sprintsResult.errors);
    } catch (error) {
      const msg = `Erro ao sincronizar sprints: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
    }

    // Step 2: Sync teams
    this.emitProgress({
      step: 'teams',
      message: 'Sincronizando equipes...',
      current: 20,
      total: 100,
      percentage: 20,
    });

    let teamsResult: SyncStepResult = {
      created: 0,
      updated: 0,
      total: 0,
      errors: [],
    };
    try {
      teamsResult = await this.syncTeams();
      errors.push(...teamsResult.errors);
    } catch (error) {
      const msg = `Erro ao sincronizar equipes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      logger.error(msg);
      errors.push(msg);
    }

    // Step 3: Fetch all work items
    this.emitProgress({
      step: 'work_items',
      message: 'Buscando work items do Azure DevOps...',
      current: 40,
      total: 100,
      percentage: 40,
    });

    let workItems: AzureWorkItem[] = [];
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
    }

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
    }

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
    }

    this.emitProgress({
      step: 'complete',
      message: 'Sincronização concluída!',
      current: 100,
      total: 100,
      percentage: 100,
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

    for (const parsed of parsedSprints) {
      try {
        await this.upsertSprint(parsed, result);
      } catch (error) {
        const msg = `Erro ao upsert sprint "${parsed.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
    }

    result.total = result.created + result.updated;
    return result;
  }

  private async upsertSprint(
    parsed: ParsedSprint,
    result: SyncStepResult,
  ): Promise<void> {
    // Find existing sprint by iterationPath
    const existing = await this.sprintRepository.findAll();
    const match = existing.find(
      (s) => s.iterationPath === parsed.iterationPath,
    );

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

    for (const parsed of parsedTeams) {
      try {
        await this.upsertTeam(parsed, result);
      } catch (error) {
        const msg = `Erro ao upsert equipe "${parsed.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
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

    for (const parsed of parsedMembers) {
      try {
        await this.upsertMember(parsed, result);
      } catch (error) {
        const msg = `Erro ao upsert membro "${parsed.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        logger.error(msg);
        result.errors.push(msg);
      }
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
   * Optimized with batch processing.
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

    // FIRST PASS: Create/update all tasks without parent relationships
    for (let i = 0; i < parsedTasks.length; i += this.BATCH_SIZE) {
      const batch = parsedTasks.slice(i, i + this.BATCH_SIZE);
      const batchPromises = batch.map((parsed) =>
        this.upsertTask(parsed, sprints, teams, result).catch((error) => {
          const msg = `Erro ao upsert tarefa "${parsed.title}" (externalId=${parsed.externalId}): ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
          logger.error(msg);
          result.errors.push(msg);
        }),
      );

      await Promise.all(batchPromises);

      // Emit progress for tasks
      const processed = Math.min(i + this.BATCH_SIZE, totalTasks);
      const percentage = 80 + Math.floor((processed / totalTasks) * 15);
      this.emitProgress({
        step: 'tasks',
        message: `Sincronizando tarefas: ${processed}/${totalTasks}`,
        current: processed,
        total: totalTasks,
        percentage,
      });
    }

    // SECOND PASS: Link parent-child relationships
    this.emitProgress({
      step: 'tasks',
      message: 'Vinculando hierarquia de tarefas...',
      current: totalTasks,
      total: totalTasks,
      percentage: 95,
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

    // Find existing task by externalId + origin='azure_devops'
    const existingTasks = await this.taskRepository.find({
      where: {
        externalId: parsed.externalId,
        origin: 'azure_devops',
      },
    });

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
      sprintId: sprintId, // Pass null explicitly to clear the field
      teamId: teamId, // Pass null explicitly to clear the field
    };

    if (existingTasks.length > 0) {
      // Update existing task
      const existing = existingTasks[0];
      await this.taskRepository.update({ id: existing.id }, taskData);
      result.updated++;
    } else {
      // Create new task
      await this.taskRepository.save({
        ...taskData,
        externalId: parsed.externalId,
        origin: parsed.origin,
        sprintId: sprintId ?? undefined, // For create, undefined is fine
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
    return path.replace(/^\\+/, '').trim().toLowerCase();
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
      logger.info('[resolveSprintByIterationPath] Available sprints:', {
        count: sprints.length,
        sprints: sprints.slice(0, 5).map((s) => ({
          id: s.id,
          name: s.name,
          iterationPath: s.iterationPath,
          normalized: s.iterationPath ? this.normalizeIterationPath(s.iterationPath) : null,
        })),
      });
    }

    logger.debug('[resolveSprintByIterationPath] Looking for sprint:', {
      taskIterationPath: iterationPath,
      normalizedTaskPath,
    });

    // 1. Exact match first
    const exactMatch = sprints.find(
      (s) =>
        s.iterationPath &&
        this.normalizeIterationPath(s.iterationPath) === normalizedTaskPath,
    );
    if (exactMatch) {
      logger.info('[resolveSprintByIterationPath] Exact match found:', {
        sprintId: exactMatch.id,
        sprintName: exactMatch.name,
        sprintIterationPath: exactMatch.iterationPath,
      });
      return exactMatch.id;
    }

    // 2. Hierarchical match: task path starts with sprint path
    // This means the task is inside the sprint's iteration
    // Sort by path length descending to match the most specific sprint first
    const sortedSprints = [...sprints]
      .filter((s) => s.iterationPath)
      .sort((a, b) => (b.iterationPath?.length ?? 0) - (a.iterationPath?.length ?? 0));

    for (const sprint of sortedSprints) {
      const sprintPath = this.normalizeIterationPath(sprint.iterationPath!);

      // Task path must START with sprint path (task is inside sprint)
      // Add backslash to ensure we match complete segments
      const sprintPathWithSeparator = sprintPath + '\\';
      if (normalizedTaskPath.startsWith(sprintPathWithSeparator) || normalizedTaskPath === sprintPath) {
        logger.info('[resolveSprintByIterationPath] Hierarchical match found:', {
          sprintId: sprint.id,
          sprintName: sprint.name,
          sprintPath,
          taskPath: normalizedTaskPath,
        });
        return sprint.id;
      }
    }

    // No match found - task is not inside any sprint
    logger.info('[resolveSprintByIterationPath] No match found for:', {
      taskIterationPath: iterationPath,
      normalizedTaskPath,
      availableSprintPaths: sortedSprints.slice(0, 5).map((s) => this.normalizeIterationPath(s.iterationPath!)),
    });
    return null;
  }

  /**
   * Resolve Task → Team: match task's areaPath with team's azureAreaPath.
   * Supports exact match, hierarchical match, and flexible matching (ignoring intermediate segments like "Area").
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

    // Build entries from teams with azureAreaPath (supports ";" separated paths)
    const entries: { id: number; path: string; segments: string[] }[] = [];
    for (const team of teams) {
      if (!team.azureAreaPath) continue;
      const paths = team.azureAreaPath
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of paths) {
        const normalized = p.replace(/^\\+/, '').trim();
        const segments = normalized.toLowerCase().split('\\').filter(Boolean);
        entries.push({ id: team.id, path: normalized, segments });
      }
    }

    const taskSegments = normalizedAreaPath.split('\\').filter(Boolean);

    // 1. Exact match first
    for (const entry of entries) {
      if (normalizedAreaPath === entry.path.toLowerCase()) {
        logger.debug('[resolveTeamByAreaPath] Exact match found:', {
          teamId: entry.id,
          teamPath: entry.path,
        });
        return entry.id;
      }
    }

    // 2. Hierarchical match — most specific (longest) path first
    const sorted = [...entries].sort((a, b) => b.path.length - a.path.length);
    for (const entry of sorted) {
      const prefix = entry.path.toLowerCase() + '\\';
      if (normalizedAreaPath.startsWith(prefix)) {
        logger.debug('[resolveTeamByAreaPath] Hierarchical match found:', {
          teamId: entry.id,
          teamPath: entry.path,
        });
        return entry.id;
      }
    }

    // 3. Check if task path ends with team's last segment
    const lastTaskSegment = taskSegments[taskSegments.length - 1];
    for (const entry of sorted) {
      const lastTeamSegment = entry.segments[entry.segments.length - 1];
      if (lastTaskSegment === lastTeamSegment && entry.segments.length >= 2) {
        logger.debug('[resolveTeamByAreaPath] Last segment match found:', {
          teamId: entry.id,
          teamPath: entry.path,
          lastSegment: lastTaskSegment,
        });
        return entry.id;
      }
    }

    // 4. Flexible match: compare segments ignoring intermediate differences
    // Example: "\Tribo SEIF\Projetos\Gestão de Terceiros" matches "\Tribo SEIF\Area\Projetos\Gestão de Terceiros"
    for (const entry of sorted) {
      // Check if all team segments exist in task segments in the same order
      let taskIndex = 0;
      let matchCount = 0;

      for (const teamSegment of entry.segments) {
        // Find this team segment in remaining task segments
        while (taskIndex < taskSegments.length) {
          if (taskSegments[taskIndex] === teamSegment) {
            matchCount++;
            taskIndex++;
            break;
          }
          taskIndex++;
        }
      }

      // If all team segments were found in order, it's a match
      if (matchCount === entry.segments.length && entry.segments.length >= 2) {
        logger.debug('[resolveTeamByAreaPath] Flexible match found:', {
          taskAreaPath: areaPath,
          teamAreaPath: entry.path,
          teamId: entry.id,
        });
        return entry.id;
      }
    }

    logger.error('[resolveTeamByAreaPath] No match found for:', {
      taskAreaPath: areaPath,
    });
    return null;
  }

  /**
   * Link parent-child relationships between tasks based on Azure DevOps relations.
   * This runs after all tasks have been created/updated.
   */
  private async linkTaskHierarchy(workItems: AzureWorkItem[]): Promise<void> {
    let linkedCount = 0;
    let errorCount = 0;

    for (const workItem of workItems) {
      if (!workItem.relations || workItem.relations.length === 0) {
        continue;
      }

      // Find parent relation (Child -> Parent)
      const parentRelation = workItem.relations.find(
        (r) => r.rel === 'System.LinkTypes.Hierarchy-Reverse',
      );

      if (!parentRelation) {
        continue;
      }

      try {
        // Extract parent work item ID from URL
        const match = parentRelation.url.match(/workItems\/(\d+)$/);
        if (!match) {
          continue;
        }

        const parentExternalId = match[1];
        const childExternalId = String(workItem.id);

        // Find both tasks in database
        const [childTask] = await this.taskRepository.find({
          where: {
            externalId: childExternalId,
            origin: 'azure_devops',
          },
        });

        const [parentTask] = await this.taskRepository.find({
          where: {
            externalId: parentExternalId,
            origin: 'azure_devops',
          },
        });

        if (childTask && parentTask) {
          // Link child to parent
          await this.taskRepository.update(
            { id: childTask.id },
            { parentId: parentTask.id },
          );
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

    logger.info('[linkTaskHierarchy] Summary:', {
      totalWorkItems: workItems.length,
      linkedCount,
      errorCount,
    });
  }
}
