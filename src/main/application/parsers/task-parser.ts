/**
 * Task Parser — maps Azure DevOps Work Items to ParsedTask.
 *
 * Pure functions — no I/O, just data transformation.
 * Preserves the original Azure DevOps state in the 'status' field.
 * Extracts assignedToName and assignedToEmail from System.AssignedTo.
 * Sets origin: 'azure_devops' and externalId as string of the work item ID.
 *
 * NOTE: The 'type' field stores the Azure DevOps work item type directly
 * (Epic, Feature, User Story, Task, Bug, etc.) without any mapping.
 * The 'status' field stores the original Azure DevOps state directly
 * (e.g. "Em Auditoria", "Novo", "Finalizado") without any mapping.
 */

import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../entities/task.entity';
import type { AzureAssignedTo } from './member-parser';

export interface AzureWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
    'System.Tags'?: string;
    'Microsoft.VSTS.Scheduling.StoryPoints'?: number;
    'Microsoft.VSTS.Common.Priority'?: number;
    'Custom.Prioridade'?: string;
    'System.AssignedTo'?: AzureAssignedTo;
    'System.CreatedDate'?: string;
    'System.ChangedDate'?: string;
    'Microsoft.VSTS.Scheduling.StartDate'?: string;
    'Microsoft.VSTS.Scheduling.FinishDate'?: string;
    'Microsoft.VSTS.Scheduling.TargetDate'?: string;
  };
  relations?: Array<{
    rel: string;
    url: string;
    attributes?: Record<string, unknown>;
  }>;
}

export interface ParsedTask {
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus; // Original Azure DevOps state (e.g. "Em Auditoria", "Novo")
  priority: TaskPriority;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  storyPoints?: number;
  assignedToName?: string;
  assignedToEmail?: string;
  startDate?: Date;
  endDate?: Date;
  azureCreatedDate?: Date;
  azureChangedDate?: Date;
  azurePriority?: number;
  externalId: string;
  origin: 'azure_devops';
}

/**
 * Maps Azure DevOps priority to local TaskPriority.
 * Supports both:
 * - Microsoft.VSTS.Common.Priority (number): 1=Baixo, 2=Médio, 3=Alto, 4=Crítica
 * - Custom.Prioridade (string): "1 - Baixo", "2 - Médio", "3 - Alto", "4 - Crítica"
 */
function mapPriority(
  numericPriority?: number,
  customPrioridade?: string,
): TaskPriority {
  // Prefer Custom.Prioridade if available (extract leading number)
  if (customPrioridade) {
    const match = customPrioridade.match(/^(\d)/);
    if (match) {
      const num = parseInt(match[1], 10);
      switch (num) {
        case 4:
          return 'critical';
        case 3:
          return 'high';
        case 2:
          return 'medium';
        case 1:
          return 'low';
      }
    }
  }
  // Fallback to Microsoft.VSTS.Common.Priority
  if (numericPriority != null) {
    switch (numericPriority) {
      case 4:
        return 'critical';
      case 3:
        return 'high';
      case 2:
        return 'medium';
      case 1:
        return 'low';
    }
  }
  return 'low';
}

/**
 * Parses a single Azure DevOps work item into a ParsedTask.
 */
export function parseTask(workItem: AzureWorkItem): ParsedTask {
  const fields = workItem.fields;
  const assignedTo = fields['System.AssignedTo'];

  // Parse dates from Azure DevOps (format: YYYY-MM-DD or ISO string)
  const parseDate = (dateStr?: string): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Try to get start/end dates from various Azure DevOps fields
  const startDate =
    parseDate(fields['Microsoft.VSTS.Scheduling.StartDate']) ||
    parseDate(fields['Microsoft.VSTS.Scheduling.TargetDate']);

  const endDate =
    parseDate(fields['Microsoft.VSTS.Scheduling.FinishDate']) ||
    parseDate(fields['Microsoft.VSTS.Scheduling.TargetDate']);

  const rawPriority = fields['Microsoft.VSTS.Common.Priority'];
  const customPrioridade = fields['Custom.Prioridade'];

  // Extract numeric priority from Custom.Prioridade string (e.g. "3 - Alto" → 3)
  const azurePriorityNum = customPrioridade
    ? parseInt(customPrioridade.match(/^(\d)/)?.[1] ?? '', 10) || rawPriority
    : rawPriority;

  return {
    title: fields['System.Title'],
    description: fields['System.Description'] || undefined,
    type: fields['System.WorkItemType'], // Use Azure DevOps type directly
    status: fields['System.State'] || 'Novo', // Preserve original Azure DevOps state
    priority: mapPriority(rawPriority, customPrioridade),
    areaPath: fields['System.AreaPath'] || undefined,
    iterationPath: fields['System.IterationPath'] || undefined,
    tags: fields['System.Tags'] || undefined,
    storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'],
    assignedToName: assignedTo?.displayName || undefined,
    assignedToEmail: assignedTo?.uniqueName || undefined,
    startDate,
    endDate,
    azureCreatedDate: parseDate(fields['System.CreatedDate']),
    azureChangedDate: parseDate(fields['System.ChangedDate']),
    azurePriority: azurePriorityNum,
    externalId: String(workItem.id),
    origin: 'azure_devops',
  };
}

/**
 * Parses multiple Azure DevOps work items into ParsedTask[].
 */
export function parseTaskMany(workItems: AzureWorkItem[]): ParsedTask[] {
  return workItems.map(parseTask);
}
