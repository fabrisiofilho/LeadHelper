/**
 * Task Parser — maps Azure DevOps Work Items to ParsedTask.
 *
 * Pure functions — no I/O, just data transformation.
 * Uses mapWorkItemStateToTaskStatus() from work-item-type-mapper.
 * Extracts assignedToName and assignedToEmail from System.AssignedTo.
 * Sets origin: 'azure_devops' and externalId as string of the work item ID.
 * 
 * NOTE: The 'type' field now stores the Azure DevOps work item type directly
 * (Epic, Feature, User Story, Task, Bug, etc.) without any mapping.
 */

import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../entities/task.entity';
import { mapWorkItemStateToTaskStatus } from '../services/work-item-type-mapper';
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
    'System.AssignedTo'?: AzureAssignedTo;
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
  type: TaskType; // Azure DevOps work item type (Epic, Feature, User Story, Task, Bug, etc.)
  status: TaskStatus;
  priority: TaskPriority;
  areaPath?: string;
  iterationPath?: string;
  tags?: string;
  storyPoints?: number;
  assignedToName?: string;
  assignedToEmail?: string;
  startDate?: Date;
  endDate?: Date;
  externalId: string;
  origin: 'azure_devops';
}

/**
 * Maps Azure DevOps priority number to local TaskPriority.
 * 1 → critical, 2 → high, 3 → medium, 4 (or default) → low
 */
function mapPriority(priority?: number): TaskPriority {
  switch (priority) {
    case 1:
      return 'critical';
    case 2:
      return 'high';
    case 3:
      return 'medium';
    default:
      return 'low';
  }
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

  return {
    title: fields['System.Title'],
    description: fields['System.Description'] || undefined,
    type: fields['System.WorkItemType'], // Use Azure DevOps type directly
    status: mapWorkItemStateToTaskStatus(fields['System.State']),
    priority: mapPriority(fields['Microsoft.VSTS.Common.Priority']),
    areaPath: fields['System.AreaPath'] || undefined,
    iterationPath: fields['System.IterationPath'] || undefined,
    tags: fields['System.Tags'] || undefined,
    storyPoints: fields['Microsoft.VSTS.Scheduling.StoryPoints'],
    assignedToName: assignedTo?.displayName || undefined,
    assignedToEmail: assignedTo?.uniqueName || undefined,
    startDate,
    endDate,
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
