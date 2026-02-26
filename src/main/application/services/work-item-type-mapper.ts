import type { TaskType } from '../entities/task.entity';

const TYPE_MAP: Record<string, TaskType> = {
  'feature': 'feature',
  'bug': 'bug',
  'task': 'task',
  'improvement': 'improvement',
  'user story': 'feature',
  'product backlog item': 'task',
};

export function mapWorkItemType(azureType: string): TaskType {
  return TYPE_MAP[azureType.toLowerCase()] ?? 'task';
}
