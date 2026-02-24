import * as crypto from 'crypto';
import { AzureDevOpsConfigEntity } from '../entities/azure-devops-config.entity';
import { getDataSource } from '@main/infrastructure/database/data-source';
import { Repository } from 'typeorm';
import { TaskRepository } from '../repositories/task-repository';
import { TaskEntity } from '../entities/task.entity';

export interface AzureDevOpsConfig {
  organizationUrl: string;
  projectName: string;
  isConfigured: boolean;
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

    if (!trimmedOrgUrl) {
      throw new Error('Organization URL é obrigatória');
    }

    if (!trimmedProjectName) {
      throw new Error('Project Name é obrigatório');
    }

    if (!trimmedPat) {
      throw new Error('Personal Access Token é obrigatório');
    }

    // Validate URL format
    try {
      new URL(trimmedOrgUrl);
    } catch {
      throw new Error('Organization URL inválida');
    }

    // Encrypt the PAT
    const encryptedPat = encryptPat(trimmedPat);

    const repository = this.getRepository();

    // Check if config already exists
    const existingConfig = await repository.findOne({ where: {} });

    if (existingConfig) {
      // Update existing config
      existingConfig.organizationUrl = trimmedOrgUrl;
      existingConfig.projectName = trimmedProjectName;
      existingConfig.patEncrypted = encryptedPat;
      await repository.save(existingConfig);
    } else {
      // Create new config
      const newConfig = repository.create({
        organizationUrl: trimmedOrgUrl,
        projectName: trimmedProjectName,
        patEncrypted: encryptedPat,
      });
      await repository.save(newConfig);
    }
  }

  async getConfig(): Promise<AzureDevOpsConfig | null> {
    const repository = this.getRepository();
    const config = await repository.findOne({ where: {} });

    if (!config) {
      return null;
    }

    return {
      organizationUrl: config.organizationUrl,
      projectName: config.projectName,
      isConfigured: true,
    };
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
    const baseUrl = config.organizationUrl.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/${encodeURIComponent(config.projectName)}/_apis/projects/${encodeURIComponent(config.projectName)}?api-version=7.0`;

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return true;
      }

      if (response.status === 401) {
        throw new Error('Token de acesso inválido ou expirado');
      }

      if (response.status === 404) {
        throw new Error('Projeto não encontrado');
      }

      const errorText = await response.text();
      throw new Error(
        `Falha na conexão com Azure DevOps: ${response.status} - ${errorText}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known errors
        if (
          error.message.includes('Token de acesso') ||
          error.message.includes('Projeto não encontrado') ||
          error.message.includes('Falha na conexão')
        ) {
          throw error;
        }
        // Network or other errors
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

      // Get work item IDs (limit to 200 to avoid API limits)
      const workItemIds = wiqlResult.workItems.slice(0, 200).map((wi) => wi.id);

      // Fetch full work item details
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
   * Fetch detailed information for specific work items
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

    const idsParam = workItemIds.join(',');
    const fields =
      'System.Id,System.Title,System.WorkItemType,System.State,System.Description,System.AssignedTo,System.CreatedDate,System.ChangedDate';
    const detailsUrl = `${baseUrl}/${encodeURIComponent(projectName)}/_apis/wit/workitems?ids=${idsParam}&fields=${fields}&api-version=7.0`;

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
      value: Array<{ id: number; fields: Record<string, unknown> }>;
    };

    return result.value.map((wi) => ({
      id: wi.id,
      title: (wi.fields['System.Title'] as string) || '',
      type: (wi.fields['System.WorkItemType'] as string) || '',
      state: (wi.fields['System.State'] as string) || '',
      description: wi.fields['System.Description'] as string | undefined,
      assignedTo: (wi.fields['System.AssignedTo'] as { displayName?: string })
        ?.displayName,
      createdDate: new Date(wi.fields['System.CreatedDate'] as string),
      changedDate: new Date(wi.fields['System.ChangedDate'] as string),
    }));
  }

  /**
   * Import work items from Azure DevOps as local Tasks
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
    const createdTasks: TaskEntity[] = [];

    for (const workItem of workItems) {
      // Check if work item was already imported
      const existingTasks = await taskRepository.find({
        where: {
          externalId: String(workItem.id),
          externalSource: 'azure_devops',
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

      // Create new task using save method (which creates and saves)
      const savedTask = await taskRepository.save({
        title: workItem.title,
        description: workItem.description || undefined,
        startDate: startDate,
        endDate: endDate >= startDate ? endDate : startDate,
        status: this.mapWorkItemStateToTaskStatus(workItem.state),
        origin: 'azure_devops',
        externalId: String(workItem.id),
        externalSource: 'azure_devops',
      });

      createdTasks.push(savedTask);
    }

    return createdTasks;
  }

  /**
   * Map Azure DevOps work item state to local Task status
   */
  private mapWorkItemStateToTaskStatus(
    state: string,
  ): 'pending' | 'in_progress' | 'completed' | 'cancelled' {
    const normalizedState = state.toLowerCase();

    if (
      normalizedState === 'done' ||
      normalizedState === 'closed' ||
      normalizedState === 'resolved'
    ) {
      return 'completed';
    }

    if (
      normalizedState === 'active' ||
      normalizedState === 'in progress' ||
      normalizedState === 'committed'
    ) {
      return 'in_progress';
    }

    if (normalizedState === 'removed' || normalizedState === 'cut') {
      return 'cancelled';
    }

    // Default to pending for New, To Do, etc.
    return 'pending';
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
    task.status = this.mapWorkItemStateToTaskStatus(workItem.state);

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
}
