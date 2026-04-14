import * as crypto from 'crypto';
import { AzureDevOpsConfigEntity } from '../entities/azure-devops-config.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';
import { Repository } from 'typeorm';
import { TaskRepository } from '../repositories/task-repository';
import { TaskEntity } from '../entities/task.entity';
import { TeamRepository } from '../repositories/team-repository';
import { logger } from '@main/infrastructure/log/logger';
import { AzureAreaNode } from '../parsers/team-parser';
import { AzureWorkItem } from '../parsers/task-parser';
import { AzureIterationNode } from '../parsers/sprint-parser';
import {
  DashboardMetrics,
  IterationNode,
  ReportData,
  ReportItem,
  ReportPeriod,
  WorkItemUpdate,
} from '@shared/interfaces/config/index.types';

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
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// Secret key derived from machine ID or app secret
// In production, this should be derived from a more secure source
const getEncryptionKey = (): Buffer => {
  const machineId =
    process.env.MACHINE_ID || 'team-management-system-default-key';
  // Derive a 32-byte key using SHA-256
  return crypto.createHash('sha256').update(machineId).digest();
};

const encryptPat = (pat: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(pat, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decryptPat = (encryptedData: string): string => {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

export class AzureDevOpsService {
  private getRepository(): Repository<AzureDevOpsConfigEntity> {
    const dataSource = getDataSource();
    return dataSource.getRepository(AzureDevOpsConfigEntity);
  }

  async saveConfig(input: AzureDevOpsConfigInput): Promise<void> {
    const trimmedOrgUrl = input.organizationUrl?.trim();
    const trimmedProjectName = input.projectName?.trim();
    const trimmedPat = input.pat?.trim();
    const trimmedSustentacaoAreaPath =
      input.sustentacaoAreaPath?.trim() || undefined;
    const trimmedProjetosAreaPath = input.projetosAreaPath?.trim() || undefined;

    if (!trimmedOrgUrl) {
      throw new Error('Organization URL é obrigatória');
    }

    if (!trimmedProjectName) {
      throw new Error('Project Name é obrigatório');
    }

    // Validate URL format
    try {
      new URL(trimmedOrgUrl);
    } catch {
      throw new Error('Organization URL inválida');
    }

    const repository = this.getRepository();

    // Check if config already exists
    const existingConfig = await repository.findOne({ where: {} });

    if (existingConfig) {
      // Update existing config
      existingConfig.organizationUrl = trimmedOrgUrl;
      existingConfig.projectName = trimmedProjectName;
      // Only update PAT if a new one was provided
      if (trimmedPat) {
        existingConfig.patEncrypted = encryptPat(trimmedPat);
      }
      // Update Area Paths
      existingConfig.sustentacaoAreaPath = trimmedSustentacaoAreaPath;
      existingConfig.projetosAreaPath = trimmedProjetosAreaPath;
      await repository.save(existingConfig);
    } else {
      // New config requires PAT
      if (!trimmedPat) {
        throw new Error('Personal Access Token é obrigatório');
      }
      const encryptedPat = encryptPat(trimmedPat);
      const newConfig = repository.create({
        organizationUrl: trimmedOrgUrl,
        projectName: trimmedProjectName,
        patEncrypted: encryptedPat,
        sustentacaoAreaPath: trimmedSustentacaoAreaPath,
        projetosAreaPath: trimmedProjetosAreaPath,
      });
      await repository.save(newConfig);
    }
  }

  async getConfig(includePat = false): Promise<AzureDevOpsConfig | null> {
    const repository = this.getRepository();
    const config = await repository.findOne({ where: {} });

    if (!config) {
      return null;
    }

    const result: AzureDevOpsConfig = {
      organizationUrl: config.organizationUrl,
      projectName: config.projectName,
      isConfigured: true,
      // Return configured Area Paths or default values (Property 25)
      sustentacaoAreaPath:
        config.sustentacaoAreaPath || DEFAULT_SUSTENTACAO_AREA_PATH,
      projetosAreaPath: config.projetosAreaPath || DEFAULT_PROJETOS_AREA_PATH,
    };

    // Optionally include decrypted PAT for display purposes
    if (includePat) {
      try {
        result.pat = decryptPat(config.patEncrypted);
      } catch (error) {
        logger.error('Error decrypting PAT:', error);
        // Don't include PAT if decryption fails
      }
    }

    return result;
  }

  async testConnection(): Promise<boolean> {
    const repository = this.getRepository();
    const config = await repository.findOne({ where: {} });

    if (!config) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    // Decrypt the PAT
    const pat = decryptPat(config.patEncrypted);

    // Build the API URL to get project info
    // Correct endpoint: {org}/_apis/projects/{project}
    const baseUrl = config.organizationUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/_apis/projects/${encodeURIComponent(config.projectName)}?api-version=7.0`;

    logger.info('Testing Azure DevOps connection...');
    logger.debug('API URL:', apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        logger.info('Azure DevOps connection successful');
        return true;
      }

      if (response.status === 401) {
        logger.error('Azure DevOps auth failed: 401 Unauthorized');
        throw new Error('Token de acesso inválido ou expirado');
      }

      if (response.status === 404) {
        logger.error('Azure DevOps project not found: 404');
        throw new Error(
          `Projeto "${config.projectName}" não encontrado. Verifique o nome do projeto.`,
        );
      }

      const errorText = await response.text();
      logger.error(
        `Azure DevOps connection failed: ${response.status}`,
        errorText,
      );
      throw new Error(
        `Falha na conexão com Azure DevOps: ${response.status} - ${errorText}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known errors
        if (
          error.message.includes('Token de acesso') ||
          error.message.includes('Projeto') ||
          error.message.includes('Falha na conexão')
        ) {
          throw error;
        }
        // Network or other errors
        logger.error('Azure DevOps connection error:', error.message);
        throw new Error(`Falha na conexão com Azure DevOps: ${error.message}`);
      }
      throw new Error('Falha na conexão com Azure DevOps');
    }
  }

  // Internal method to get decrypted PAT for other service methods
  async getDecryptedPat(): Promise<string> {
    const repository = this.getRepository();
    const config = await repository.findOne({ where: {} });

    if (!config) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    return decryptPat(config.patEncrypted);
  }

  // Internal method to get full config with decrypted PAT for API calls
  async getFullConfig(): Promise<{
    organizationUrl: string;
    projectName: string;
    pat: string;
  } | null> {
    const repository = this.getRepository();
    const config = await repository.findOne({ where: {} });

    if (!config) {
      return null;
    }

    return {
      organizationUrl: config.organizationUrl,
      projectName: config.projectName,
      pat: decryptPat(config.patEncrypted),
    };
  }

  /**
   * Fetch work items from Azure DevOps using WIQL (Work Item Query Language)
   * @param filters Optional filters for work item type and state
   * @returns List of work items matching the filters
   */
  async fetchWorkItems(filters?: WorkItemFilters): Promise<WorkItem[]> {
    const fullConfig = await this.getFullConfig();

    if (!fullConfig) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Build WIQL query
    let whereClause = `[System.TeamProject] = '${projectName}'`;

    if (filters?.types && filters.types.length > 0) {
      const typesCondition = filters.types.map((t) => `'${t}'`).join(', ');
      whereClause += ` AND [System.WorkItemType] IN (${typesCondition})`;
    }

    if (filters?.states && filters.states.length > 0) {
      const statesCondition = filters.states.map((s) => `'${s}'`).join(', ');
      whereClause += ` AND [System.State] IN (${statesCondition})`;
    }

    if (filters?.query) {
      whereClause += ` AND [System.Title] CONTAINS '${filters.query}'`;
    }

    if (filters?.iterationPath) {
      // Azure DevOps classification paths must not start with a backslash.
      // The classification nodes API returns paths like "\Project\Iteration\Sprint-01",
      // but WIQL expects "Project\Iteration\Sprint-01".
      const sanitizedPath = filters.iterationPath.replace(/^\\+/, '');
      whereClause += ` AND [System.IterationPath] UNDER '${sanitizedPath}'`;
    }

    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE ${whereClause} ORDER BY [System.ChangedDate] DESC`;

    // Execute WIQL query to get work item IDs
    const wiqlUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`;

    try {
      const wiqlResponse = await fetch(wiqlUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: wiqlQuery }),
      });

      if (!wiqlResponse.ok) {
        if (wiqlResponse.status === 401) {
          throw new Error('Token de acesso inválido ou expirado');
        }
        const errorText = await wiqlResponse.text();
        throw new Error(
          `Erro ao buscar work items: ${wiqlResponse.status} - ${errorText}`,
        );
      }

      const wiqlResult = (await wiqlResponse.json()) as {
        workItems: Array<{ id: number }>;
      };

      if (!wiqlResult.workItems || wiqlResult.workItems.length === 0) {
        return [];
      }

      // Get all work item IDs
      const workItemIds = wiqlResult.workItems.map((wi) => wi.id);

      // Fetch full work item details (batched internally)
      return await this.fetchWorkItemDetails(
        workItemIds,
        baseUrl,
        projectName,
        authHeader,
      );
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('Token de acesso') ||
          error.message.includes('Erro ao buscar')
        ) {
          throw error;
        }
        throw new Error(`Erro ao buscar work items: ${error.message}`);
      }
      throw new Error('Erro ao buscar work items');
    }
  }

  /**
   * Fetch detailed information for specific work items including relations
   */
  private async fetchWorkItemDetails(
    workItemIds: number[],
    baseUrl: string,
    projectName: string,
    authHeader: string,
  ): Promise<WorkItem[]> {
    if (workItemIds.length === 0) {
      return [];
    }

    const fields =
      'System.Id,System.Title,System.WorkItemType,System.State,System.Description,System.AssignedTo,System.CreatedDate,System.ChangedDate,System.AreaPath,System.IterationPath,System.Tags,Microsoft.VSTS.Scheduling.StoryPoints,Microsoft.VSTS.Common.Priority';

    // Azure DevOps API accepts max 200 IDs per request — batch accordingly
    const BATCH_SIZE = 200;
    const allResults: WorkItem[] = [];

    for (let i = 0; i < workItemIds.length; i += BATCH_SIZE) {
      const batch = workItemIds.slice(i, i + BATCH_SIZE);
      const idsParam = batch.join(',');
      // Include $expand=relations to get parent/child relationships
      const detailsUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitems?ids=${idsParam}&fields=${fields}&$expand=relations&api-version=7.0`;

      const response = await fetch(detailsUrl, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Erro ao buscar detalhes dos work items: ${response.status} - ${errorText}`,
        );
      }

      const result = (await response.json()) as {
        value: Array<{
          id: number;
          fields: Record<string, unknown>;
          relations?: Array<{
            rel: string;
            url: string;
            attributes?: Record<string, unknown>;
          }>;
        }>;
      };

      const mapped = result.value.map((wi) => ({
        id: wi.id,
        title: (wi.fields['System.Title'] as string) || '',
        type: (wi.fields['System.WorkItemType'] as string) || '',
        state: (wi.fields['System.State'] as string) || '',
        description: wi.fields['System.Description'] as string | undefined,
        assignedTo: (wi.fields['System.AssignedTo'] as { displayName?: string })
          ?.displayName,
        createdDate: new Date(wi.fields['System.CreatedDate'] as string),
        changedDate: new Date(wi.fields['System.ChangedDate'] as string),
        projectName: projectName,
        areaPath: (wi.fields['System.AreaPath'] as string) ?? null,
        iterationPath: (wi.fields['System.IterationPath'] as string) ?? null,
        tags: (wi.fields['System.Tags'] as string) ?? null,
        storyPoints:
          (wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'] as number) ??
          null,
        priority:
          (wi.fields['Microsoft.VSTS.Common.Priority'] as number) ?? null,
        relations: wi.relations,
      }));

      allResults.push(...mapped);
    }

    return allResults;
  }

  /**
   * Import work items from Azure DevOps as local Tasks
   * @deprecated Substituído por `SyncService.fullSync()`, que realiza sincronização completa de todos os work items.
   * @param workItemIds Array of work item IDs to import
   * @returns Array of created Task entities
   */
  async importWorkItems(workItemIds: number[]): Promise<TaskEntity[]> {
    if (!workItemIds || workItemIds.length === 0) {
      return [];
    }

    const fullConfig = await this.getFullConfig();

    if (!fullConfig) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Fetch work item details
    const workItems = await this.fetchWorkItemDetails(
      workItemIds,
      baseUrl,
      projectName,
      authHeader,
    );

    if (workItems.length === 0) {
      throw new Error('Nenhum work item encontrado com os IDs fornecidos');
    }

    // Create tasks from work items
    const taskRepository = new TaskRepository();
    const teamRepository = new TeamRepository();
    const createdTasks: TaskEntity[] = [];

    // Pre-load teams with Azure Area Path configured for matching
    const teamsWithAreaPath = await teamRepository.findAllWithAreaPath();

    for (const workItem of workItems) {
      // Check if work item was already imported
      const existingTasks = await taskRepository.find({
        where: {
          externalId: String(workItem.id),
          origin: 'azure_devops',
        },
      });

      if (existingTasks.length > 0) {
        // Skip already imported work items
        createdTasks.push(existingTasks[0]);
        continue;
      }

      // Map work item dates - use createdDate/changedDate or current date
      const startDate = workItem.createdDate || new Date();
      const endDate = workItem.changedDate || new Date();

      // Resolve team by matching Area Path
      const resolvedTeamId = this.resolveTeamByAreaPath(
        workItem.areaPath,
        teamsWithAreaPath,
      );

      // Extract parent ID from relations if exists
      let parentExternalId: string | undefined;
      if (workItem.relations) {
        const parentRelation = workItem.relations.find(
          (r) =>
            r.rel === 'System.LinkTypes.Hierarchy-Reverse' || // Child -> Parent
            r.rel === 'System.LinkTypes.Hierarchy-Forward', // Parent -> Child (we want reverse)
        );
        if (parentRelation && parentRelation.url) {
          // Extract work item ID from URL (e.g., "https://dev.azure.com/org/project/_apis/wit/workItems/123")
          const match = parentRelation.url.match(/workItems\/(\d+)$/);
          if (match) {
            parentExternalId = match[1];
          }
        }
      }

      // Serialize relations as JSON for storage
      const workItemRelations = workItem.relations
        ? JSON.stringify(workItem.relations)
        : undefined;

      // Create new task using save method (which creates and saves)
      const savedTask = await taskRepository.save({
        title: workItem.title,
        description: workItem.description || undefined,
        startDate: startDate,
        endDate: endDate >= startDate ? endDate : startDate,
        status: workItem.state, // Preserve original Azure DevOps state
        type: workItem.type, // Use Azure DevOps type directly
        origin: 'azure_devops',
        externalId: String(workItem.id),
        areaPath: workItem.areaPath ?? undefined,
        iterationPath: workItem.iterationPath ?? undefined,
        tags: workItem.tags ?? undefined,
        storyPoints: workItem.storyPoints ?? undefined,
        teamId: resolvedTeamId ?? undefined,
        workItemRelations: workItemRelations,
      });

      createdTasks.push(savedTask);
    }

    // Second pass: Link parent-child relationships
    for (const task of createdTasks) {
      if (task.workItemRelations) {
        try {
          const relations = JSON.parse(task.workItemRelations);
          const parentRelation = relations.find(
            (r: any) => r.rel === 'System.LinkTypes.Hierarchy-Reverse',
          );
          if (parentRelation && parentRelation.url) {
            const match = parentRelation.url.match(/workItems\/(\d+)$/);
            if (match) {
              const parentExternalId = match[1];
              const parentTask = await taskRepository.findOne({
                where: {
                  externalId: parentExternalId,
                  origin: 'azure_devops',
                },
              });
              if (parentTask) {
                task.parentId = parentTask.id;
                await taskRepository.save(task);
              }
            }
          }
        } catch (error) {
          logger.error('Error parsing work item relations:', error);
        }
      }
    }

    return createdTasks;
  }

  /**
   * Resolve team ID by matching work item Area Path against teams with configured azureAreaPath.
   * Each team can have multiple paths separated by ";".
   * Supports exact match and hierarchical match (e.g., team path "Project\TeamA" matches work item "Project\TeamA\SubArea").
   */
  private resolveTeamByAreaPath(
    areaPath: string | undefined | null,
    teamsWithAreaPath: { id: number; azureAreaPath?: string }[],
  ): number | null {
    if (!areaPath || teamsWithAreaPath.length === 0) {
      return null;
    }

    const normalizedAreaPath = areaPath
      .replace(/^\\+/, '')
      .trim()
      .toLowerCase();

    // Expand teams: each team may have multiple paths separated by ";"
    const entries: { id: number; path: string }[] = [];
    for (const team of teamsWithAreaPath) {
      if (!team.azureAreaPath) continue;
      const paths = team.azureAreaPath
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of paths) {
        entries.push({ id: team.id, path: p.replace(/^\\+/, '').trim() });
      }
    }

    // First try exact match
    for (const entry of entries) {
      if (normalizedAreaPath === entry.path.toLowerCase()) {
        return entry.id;
      }
    }

    // Then try hierarchical match — most specific (longest) path first
    const sorted = [...entries].sort((a, b) => b.path.length - a.path.length);

    for (const entry of sorted) {
      const prefix = entry.path.toLowerCase() + '\\';
      if (normalizedAreaPath.startsWith(prefix)) {
        return entry.id;
      }
    }

    return null;
  }

  /**
   * Sync a single imported task with Azure DevOps
   * @param taskId The ID of the local task to sync
   * @returns The updated task entity
   */
  async syncTask(taskId: number): Promise<TaskEntity> {
    const taskRepository = new TaskRepository();

    // Find the task by ID
    const task = await taskRepository.findOneBy({ id: taskId });

    if (!task) {
      throw new Error('Tarefa não encontrada');
    }

    // Verify it's an imported task from Azure DevOps
    if (task.origin !== 'azure_devops') {
      throw new Error(
        'Apenas tarefas importadas do Azure DevOps podem ser sincronizadas',
      );
    }

    if (!task.externalId) {
      throw new Error('Tarefa não possui ID externo do Azure DevOps');
    }

    // Get Azure DevOps configuration
    const fullConfig = await this.getFullConfig();

    if (!fullConfig) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Fetch the work item from Azure DevOps
    const workItems = await this.fetchWorkItemDetails(
      [parseInt(task.externalId, 10)],
      baseUrl,
      projectName,
      authHeader,
    );

    if (workItems.length === 0) {
      throw new Error('Work item não encontrado no Azure DevOps');
    }

    const workItem = workItems[0];

    // Update the task with new data from Azure DevOps
    task.title = workItem.title;
    task.description = workItem.description || undefined;
    task.status = workItem.state; // Preserve original Azure DevOps state
    task.type = workItem.type; // Use Azure DevOps type directly

    // Update enriched fields with current values from Azure DevOps API
    task.areaPath = workItem.areaPath ?? undefined;
    task.iterationPath = workItem.iterationPath ?? undefined;
    task.tags = workItem.tags ?? undefined;
    task.storyPoints = workItem.storyPoints ?? undefined;

    // Resolve team by Area Path if not already assigned
    if (!task.teamId && workItem.areaPath) {
      const teamRepository = new TeamRepository();
      const teamsWithAreaPath = await teamRepository.findAllWithAreaPath();
      const resolvedTeamId = this.resolveTeamByAreaPath(
        workItem.areaPath,
        teamsWithAreaPath,
      );
      if (resolvedTeamId) {
        task.teamId = resolvedTeamId;
      }
    }

    // Save the updated task
    const updatedTask = await taskRepository.save(task);

    return updatedTask;
  }

  /**
   * Sync all imported tasks from Azure DevOps
   * @returns SyncResult with counts and any errors
   */
  async syncAllImportedTasks(): Promise<SyncResult> {
    const taskRepository = new TaskRepository();

    // Find all tasks with origin = 'azure_devops'
    const importedTasks = await taskRepository.findByOrigin('azure_devops');

    const result: SyncResult = {
      synced: 0,
      failed: 0,
      errors: [],
    };

    if (importedTasks.length === 0) {
      return result;
    }

    // Sync each task individually
    for (const task of importedTasks) {
      try {
        await this.syncTask(task.id);
        result.synced++;
      } catch (error) {
        result.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(
          `Tarefa ${task.id} (${task.title}): ${errorMessage}`,
        );
      }
    }

    return result;
  }

  /**
   * Fetch iteration tree from Azure DevOps classification nodes API.
   * Returns the children of the root Iterations node, mapped recursively.
   * On error, returns an empty array and logs the error.
   */
  async fetchIterations(): Promise<IterationNode[]> {
    try {
      const fullConfig = await this.getFullConfig();

      if (!fullConfig) {
        logger.info(
          'Configuração do Azure DevOps não encontrada ao buscar iterations',
        );
        return [];
      }

      const { organizationUrl, projectName, pat } = fullConfig;
      const baseUrl = organizationUrl.replace(/\/$/, '');
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

      const url = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Erro ao buscar iterations: ${response.status} - ${errorText}`,
        );
        return [];
      }

      const data = (await response.json()) as {
        id: number;
        name: string;
        path: string;
        children?: Array<Record<string, unknown>>;
      };

      return this.mapIterationNodes(data.children ?? []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao buscar iterations: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Recursively maps raw API classification node objects to IterationNode[].
   */
  private mapIterationNodes(
    nodes: Array<Record<string, unknown>>,
  ): IterationNode[] {
    return nodes.map((node) => ({
      id: node.id as number,
      name: node.name as string,
      path: node.path as string,
      children: this.mapIterationNodes(
        (node.children as Array<Record<string, unknown>>) ?? [],
      ),
    }));
  }

  /**
   * Fetch iteration nodes from Azure DevOps Classification Nodes API,
   * preserving attributes (startDate, finishDate) needed by the SprintParser.
   * Returns AzureIterationNode[] with full attribute data.
   */
  async fetchIterationNodes(): Promise<AzureIterationNode[]> {
    try {
      const fullConfig = await this.getFullConfig();

      if (!fullConfig) {
        logger.info(
          'Configuração do Azure DevOps não encontrada ao buscar iteration nodes',
        );
        return [];
      }

      const { organizationUrl, projectName, pat } = fullConfig;
      const baseUrl = organizationUrl.replace(/\/$/, '');
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

      const url = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/classificationnodes/Iterations?$depth=10&api-version=7.0`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Erro ao buscar iteration nodes: ${response.status} - ${errorText}`,
        );
        return [];
      }

      const data = (await response.json()) as Record<string, unknown>;

      return this.mapToAzureIterationNodes(
        (data.children as Array<Record<string, unknown>>) ?? [],
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao buscar iteration nodes: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Recursively maps raw API classification node objects to AzureIterationNode[],
   * preserving attributes (startDate, finishDate).
   */
  private mapToAzureIterationNodes(
    nodes: Array<Record<string, unknown>>,
  ): AzureIterationNode[] {
    return nodes.map((node) => {
      const attributes = node.attributes as Record<string, unknown> | undefined;

      // The classification nodes API returns path as "\Project\Iteration\..."
      // but work items use "Project\..." (without the "Iteration" segment).
      // Strip the leading backslash and the "Iteration\" segment so the
      // stored iterationPath matches System.IterationPath on work items.
      let rawPath = node.path as string;
      rawPath = rawPath.replace(/^\\/, '');
      rawPath = rawPath.replace(/\\Iteration\\/i, '\\');
      rawPath = rawPath.replace(/\\Iteration$/i, '');

      const result: AzureIterationNode = {
        id: node.id as number,
        name: node.name as string,
        path: rawPath,
      };

      if (attributes) {
        result.attributes = {
          startDate: attributes.startDate as string | undefined,
          finishDate: attributes.finishDate as string | undefined,
        };
      }

      const children = node.children as
        | Array<Record<string, unknown>>
        | undefined;
      if (children && children.length > 0) {
        result.children = this.mapToAzureIterationNodes(children);
      }

      return result;
    });
  }

  /**
   * Fetch area paths from Azure DevOps Classification Nodes API.
   * GET {org}/{project}/_apis/wit/classificationnodes/Areas?$depth=10&api-version=7.0
   * @returns AzureAreaNode[] — flat children of the root area node
   */
  async fetchAreaPaths(): Promise<AzureAreaNode[]> {
    try {
      const fullConfig = await this.getFullConfig();

      if (!fullConfig) {
        logger.info(
          'Configuração do Azure DevOps não encontrada ao buscar area paths',
        );
        return [];
      }

      const { organizationUrl, projectName, pat } = fullConfig;
      const baseUrl = organizationUrl.replace(/\/$/, '');
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

      const url = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/classificationnodes/Areas?$depth=10&api-version=7.0`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Erro ao buscar area paths: ${response.status} - ${errorText}`,
        );
        return [];
      }

      const data = (await response.json()) as {
        id: number;
        name: string;
        path: string;
        children?: Array<Record<string, unknown>>;
      };

      return this.mapAreaNodes(data.children ?? []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao buscar area paths: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Recursively maps raw API classification node objects to AzureAreaNode[].
   */
  private mapAreaNodes(nodes: Array<Record<string, unknown>>): AzureAreaNode[] {
    return nodes.map((node) => ({
      id: node.id as number,
      name: node.name as string,
      path: node.path as string,
      children: this.mapAreaNodes(
        (node.children as Array<Record<string, unknown>>) ?? [],
      ),
    }));
  }

  /**
   * Fetch ALL work items from the Azure DevOps project via WIQL.
   * Executes a WIQL query without specific ID filters to get every work item,
   * then fetches details in batches of 200 IDs.
   * @returns AzureWorkItem[] — all work items with full field details
   */
  async fetchAllWorkItems(): Promise<AzureWorkItem[]> {
    const fullConfig = await this.getFullConfig();

    if (!fullConfig) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${projectName}'`;
    const wiqlUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`;

    try {
      const wiqlResponse = await fetch(wiqlUrl, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: wiqlQuery }),
      });

      if (!wiqlResponse.ok) {
        if (wiqlResponse.status === 401) {
          throw new Error('Token de acesso inválido ou expirado');
        }
        const errorText = await wiqlResponse.text();
        throw new Error(
          `Erro ao buscar work items: ${wiqlResponse.status} - ${errorText}`,
        );
      }

      const wiqlResult = (await wiqlResponse.json()) as {
        workItems: Array<{ id: number }>;
      };

      if (!wiqlResult.workItems || wiqlResult.workItems.length === 0) {
        logger.info('[fetchAllWorkItems] No work items found');
        return [];
      }

      const workItemIds = wiqlResult.workItems.map((wi) => wi.id);
      logger.info(
        `[fetchAllWorkItems] Found ${workItemIds.length} work item IDs`,
      );

      const BATCH_SIZE = 200;
      // When using $expand=relations, we cannot use the fields parameter
      // So we fetch all fields and filter later

      const allResults: AzureWorkItem[] = [];

      for (let i = 0; i < workItemIds.length; i += BATCH_SIZE) {
        const batch = workItemIds.slice(i, i + BATCH_SIZE);
        const idsParam = batch.join(',');
        // Include $expand=relations to get parent/child relationships
        // Note: Cannot use fields parameter with $expand
        const detailsUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitems?ids=${idsParam}&$expand=relations&api-version=7.0`;

        const response = await fetch(detailsUrl, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Erro ao buscar detalhes dos work items: ${response.status} - ${errorText}`,
          );
        }

        const result = (await response.json()) as {
          value: Array<{
            id: number;
            fields: Record<string, unknown>;
            relations?: Array<{
              rel: string;
              url: string;
              attributes?: Record<string, unknown>;
            }>;
          }>;
        };

        const mapped: AzureWorkItem[] = [];
        for (const wi of result.value) {
          // Log priority-related fields for the first work item of the first batch
          if (i === 0 && mapped.length === 0) {
            const prioFields = Object.entries(wi.fields)
              .filter(
                ([key]) =>
                  key.toLowerCase().includes('prio') ||
                  key.toLowerCase().includes('sever'),
              )
              .map(([key, val]) => `${key}=${val}`);
            logger.info(
              `[fetchAllWorkItems] Priority/Severity fields for WI#${wi.id}: ${prioFields.join(', ') || 'none'}`,
            );
            // Also log all custom fields (non-System, non-Microsoft)
            const customFields = Object.entries(wi.fields)
              .filter(
                ([key]) =>
                  !key.startsWith('System.') && !key.startsWith('Microsoft.'),
              )
              .map(
                ([key, val]) =>
                  `${key}=${typeof val === 'object' ? JSON.stringify(val) : val}`,
              );
            if (customFields.length > 0) {
              logger.info(
                `[fetchAllWorkItems] Custom fields for WI#${wi.id}: ${customFields.join(', ')}`,
              );
            }
          }

          // Dynamically find the priority field — could be Microsoft.VSTS.Common.Priority
          // or a custom field like Custom.Prioridade
          let priorityValue: number | undefined = wi.fields[
            'Microsoft.VSTS.Common.Priority'
          ] as number | undefined;
          if (priorityValue == null) {
            // Search for any field containing 'prio' in the key name
            for (const [key, val] of Object.entries(wi.fields)) {
              if (
                key.toLowerCase().includes('prio') &&
                typeof val === 'number'
              ) {
                priorityValue = val;
                break;
              }
            }
          }

          const customPrioridade = wi.fields['Custom.Prioridade'] as
            | string
            | undefined;

          mapped.push({
            id: wi.id,
            fields: {
              'System.Title': (wi.fields['System.Title'] as string) || '',
              'System.Description': wi.fields['System.Description'] as
                | string
                | undefined,
              'System.WorkItemType':
                (wi.fields['System.WorkItemType'] as string) || '',
              'System.State': (wi.fields['System.State'] as string) || '',
              'System.AreaPath': wi.fields['System.AreaPath'] as
                | string
                | undefined,
              'System.IterationPath': wi.fields['System.IterationPath'] as
                | string
                | undefined,
              'System.Tags': wi.fields['System.Tags'] as string | undefined,
              'Microsoft.VSTS.Scheduling.StoryPoints': wi.fields[
                'Microsoft.VSTS.Scheduling.StoryPoints'
              ] as number | undefined,
              'Microsoft.VSTS.Common.Priority': priorityValue,
              'Custom.Prioridade': customPrioridade,
              'System.AssignedTo': wi.fields['System.AssignedTo'] as
                | {
                    displayName: string;
                    uniqueName: string;
                    id?: string;
                  }
                | undefined,
              'System.CreatedDate': wi.fields['System.CreatedDate'] as
                | string
                | undefined,
              'System.ChangedDate': wi.fields['System.ChangedDate'] as
                | string
                | undefined,
            },
            relations: wi.relations,
          });
        }

        allResults.push(...mapped);
      }

      logger.info(
        `[fetchAllWorkItems] Returning ${allResults.length} work items`,
      );
      return allResults;
    } catch (error) {
      logger.error('[fetchAllWorkItems] Error:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('Token de acesso') ||
          error.message.includes('Erro ao buscar')
        ) {
          throw error;
        }
        throw new Error(`Erro ao buscar work items: ${error.message}`);
      }
      throw new Error('Erro ao buscar work items');
    }
  }

  /**
   * Get report data by fetching work items directly from the Azure DevOps API
   * within a given period. Aggregates by type, status, assignee, and project.
   * @deprecated Substituído por `DashboardService` que utiliza dados do Banco_Local após sincronização, sem buscar diretamente da API.
   * @param period The date range to filter work items by creation date
   * @returns ReportData with totals, aggregations, and item list
   */
  async getReportData(period: ReportPeriod): Promise<ReportData> {
    const fullConfig = await this.getFullConfig();

    if (!fullConfig) {
      throw new Error('Configuração do Azure DevOps não encontrada');
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    // Format dates for WIQL
    const startStr = period.startDate.toISOString().split('T')[0];
    const endStr = period.endDate.toISOString().split('T')[0];

    const wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${projectName}' AND [System.CreatedDate] >= '${startStr}' AND [System.CreatedDate] <= '${endStr}' ORDER BY [System.CreatedDate] DESC`;

    const wiqlUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/wiql?api-version=7.0`;

    const wiqlResponse = await fetch(wiqlUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: wiqlQuery }),
    });

    if (!wiqlResponse.ok) {
      const errorText = await wiqlResponse.text();
      throw new Error(
        `Erro ao buscar work items para relatório: ${wiqlResponse.status} - ${errorText}`,
      );
    }

    const wiqlResult = (await wiqlResponse.json()) as {
      workItems: Array<{ id: number }>;
    };

    if (!wiqlResult.workItems || wiqlResult.workItems.length === 0) {
      return {
        totalItems: 0,
        byType: [],
        byStatus: [],
        byAssignee: [],
        byProject: [],
        items: [],
      };
    }

    // Fetch details (batched internally, no limit)
    const workItemIds = wiqlResult.workItems.map((wi) => wi.id);
    const workItems = await this.fetchWorkItemDetails(
      workItemIds,
      baseUrl,
      projectName,
      authHeader,
    );

    // Build aggregation maps
    const typeMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const assigneeMap = new Map<string, number>();
    const projectMap = new Map<string, number>();

    const items: ReportItem[] = workItems.map((wi) => {
      const assignee = wi.assignedTo || 'Não atribuído';
      const project = wi.areaPath
        ? wi.areaPath.split('\\')[0] || 'Sem projeto'
        : 'Sem projeto';

      typeMap.set(wi.type, (typeMap.get(wi.type) ?? 0) + 1);
      statusMap.set(wi.state, (statusMap.get(wi.state) ?? 0) + 1);
      assigneeMap.set(assignee, (assigneeMap.get(assignee) ?? 0) + 1);
      projectMap.set(project, (projectMap.get(project) ?? 0) + 1);

      return {
        id: wi.id,
        title: wi.title,
        type: wi.type,
        status: wi.state,
        assignee,
        project,
        areaPath: wi.areaPath,
        iterationPath: wi.iterationPath,
        tags: wi.tags,
        storyPoints: wi.storyPoints,
        createdAt: wi.createdDate,
        updatedAt: wi.changedDate,
      };
    });

    return {
      totalItems: workItems.length,
      byType: Array.from(typeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      byStatus: Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      byAssignee: Array.from(assigneeMap.entries()).map(
        ([assignee, count]) => ({ assignee, count }),
      ),
      byProject: Array.from(projectMap.entries()).map(([project, count]) => ({
        project,
        count,
      })),
      items,
    };
  }

  /**
   * @deprecated Substituído pelo `DashboardService` expandido com dashboards por contexto (Alocação, Tarefas, Sprints).
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const taskRepository = new TaskRepository();

    // Query all tasks imported from Azure DevOps
    const tasks = await taskRepository.find({
      where: { origin: 'azure_devops' },
    });

    const totalImported = tasks.length;

    // Find the most recent updatedAt as lastSyncDate
    let lastSyncDate: Date | undefined;
    if (tasks.length > 0) {
      lastSyncDate = tasks.reduce((latest, task) => {
        const taskDate = task.updatedAt
          ? new Date(task.updatedAt)
          : new Date(0);
        return taskDate > latest ? taskDate : latest;
      }, new Date(0));
    }

    // pendingSync: Since we don't store changedDate from Azure DevOps locally,
    // we cannot compare it with updatedAt. Set to 0 as per design guidance.
    const pendingSync = 0;

    // Build status distribution
    const statusMap = new Map<string, number>();
    for (const task of tasks) {
      const status = task.status || 'pending';
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    }

    const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      totalImported,
      lastSyncDate,
      pendingSync,
      byStatus,
    };
  }
  /**
   * Fetches the update history for a specific work item from the Azure DevOps Updates API.
   * Returns an array of WorkItemUpdate objects with field changes per revision.
   * On failure, logs the error and returns an empty array.
   */
  async fetchWorkItemUpdates(workItemId: number): Promise<WorkItemUpdate[]> {
    try {
      const fullConfig = await this.getFullConfig();

      if (!fullConfig) {
        logger.info(
          'Configuração do Azure DevOps não encontrada ao buscar updates do work item',
        );
        return [];
      }

      const { organizationUrl, projectName, pat } = fullConfig;
      const baseUrl = organizationUrl.replace(/\/$/, '');
      const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

      const url = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitems/${workItemId}/updates?api-version=7.0`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Erro ao buscar updates do work item ${workItemId}: ${response.status} - ${errorText}`,
        );
        return [];
      }

      const data = (await response.json()) as {
        value: Array<{
          rev: number;
          revisedBy?: { displayName?: string };
          revisedDate?: string;
          fields?: Record<string, { oldValue?: unknown; newValue?: unknown }>;
        }>;
      };

      const updates: WorkItemUpdate[] = (data.value ?? [])
        .filter(
          (update) => update.fields && Object.keys(update.fields).length > 0,
        )
        .map((update) => {
          const fields = Object.entries(update.fields!).map(
            ([fieldName, change]) => ({
              fieldName,
              oldValue:
                change.oldValue != null ? String(change.oldValue) : undefined,
              newValue:
                change.newValue != null ? String(change.newValue) : undefined,
            }),
          );

          return {
            revision: update.rev,
            changedDate: new Date(
              update.revisedDate ?? new Date().toISOString(),
            ),
            changedBy: update.revisedBy?.displayName,
            fields,
          };
        });

      return updates;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(
        `Erro ao buscar updates do work item ${workItemId}: ${errorMessage}`,
      );
      return [];
    }
  }
  /**
   * Fetches revision history for ALL work items in the project using the
   * Reporting Work Item Revisions endpoint.  This is a single paginated
   * stream — no per-item requests needed.
   *
   * Returns a Map<workItemId, WorkItemUpdate[]> so callers can look up
   * updates by work item ID without any extra HTTP calls.
   *
   * READ-ONLY — never sends data back to Azure DevOps.
   */
  async fetchAllWorkItemUpdates(): Promise<Map<number, WorkItemUpdate[]>> {
    const result = new Map<number, WorkItemUpdate[]>();

    const fullConfig = await this.getFullConfig();
    if (!fullConfig) {
      logger.info(
        'Configuração do Azure DevOps não encontrada ao buscar bulk updates',
      );
      return result;
    }

    const { organizationUrl, projectName, pat } = fullConfig;
    const baseUrl = organizationUrl.replace(/\/$/, '');
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

    let continuationToken: string | undefined;

    try {
      do {
        const url = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/reporting/workitemrevisions?api-version=7.0${
          continuationToken ? `&continuationToken=${continuationToken}` : ''
        }`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { Authorization: authHeader },
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(
            `Erro ao buscar bulk revisions: ${response.status} - ${errorText}`,
          );
          break;
        }

        const data = (await response.json()) as {
          values: Array<{
            id: number;
            rev: number;
            fields: Record<string, unknown>;
          }>;
          continuationToken?: string;
          isLastBatch?: boolean;
        };

        for (const revision of data.values ?? []) {
          const workItemId = revision.id;
          const changedBy =
            (revision.fields?.['System.ChangedBy'] as string) ??
            (revision.fields?.['System.AuthorizedAs'] as string);
          const changedDate = revision.fields?.['System.ChangedDate']
            ? new Date(revision.fields['System.ChangedDate'] as string)
            : new Date();

          const fields: {
            fieldName: string;
            oldValue?: string;
            newValue?: string;
          }[] = [];
          for (const [fieldName, value] of Object.entries(
            revision.fields ?? {},
          )) {
            if (
              fieldName === 'System.ChangedBy' ||
              fieldName === 'System.ChangedDate' ||
              fieldName === 'System.AuthorizedAs'
            )
              continue;
            fields.push({
              fieldName,
              newValue: value != null ? String(value) : undefined,
            });
          }

          if (fields.length > 0) {
            const updates = result.get(workItemId) ?? [];
            updates.push({
              revision: revision.rev,
              changedDate,
              changedBy,
              fields,
            });
            result.set(workItemId, updates);
          }
        }

        continuationToken = data.isLastBatch
          ? undefined
          : data.continuationToken;
      } while (continuationToken);

      logger.info(
        `[fetchAllWorkItemUpdates] Fetched revisions for ${result.size} work items`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`[fetchAllWorkItemUpdates] Erro: ${msg}`);
    }

    return result;
  }

  /**
   * Proxy an external image URL through the main process, adding Azure DevOps
   * authentication when the URL belongs to the configured organization.
   * Returns a base64 data-URI string that can be used directly in <img src>.
   */
  async proxyImage(imageUrl: string): Promise<string> {
    const authHeader = await this.buildAuthHeaderForUrl(imageUrl);
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Follow redirects manually to preserve auth header across hops
    let currentUrl = imageUrl;
    const MAX_REDIRECTS = 5;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers,
        redirect: 'manual',
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(
            `Redirect without Location header: ${response.status}`,
          );
        }
        // Resolve relative redirects
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    }

    throw new Error('Too many redirects');
  }

  private async buildAuthHeaderForUrl(url: string): Promise<string | null> {
    const fullConfig = await this.getFullConfig();
    if (!fullConfig) return null;

    try {
      const orgHost = new URL(fullConfig.organizationUrl).host.toLowerCase();
      const imgHost = new URL(url).host.toLowerCase();
      if (imgHost === orgHost || imgHost.endsWith(`.${orgHost}`)) {
        return `Basic ${Buffer.from(`:${fullConfig.pat}`).toString('base64')}`;
      }
    } catch {
      // invalid URL
    }
    return null;
  }
}
