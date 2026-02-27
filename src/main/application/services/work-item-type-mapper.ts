import type { TaskStatus, TaskType } from '../entities/task.entity';

const TYPE_MAP: Record<string, TaskType> = {
  feature: 'feature',
  bug: 'bug',
  task: 'task',
  improvement: 'improvement',
  'user story': 'feature',
  'product backlog item': 'task',
};

export function mapWorkItemType(azureType: string): TaskType {
  return TYPE_MAP[azureType.toLowerCase()] ?? 'task';
}

/**
 * Maps an Azure DevOps work item state string to a local TaskStatus.
 */
export function mapWorkItemStateToTaskStatus(state: string): TaskStatus {
  const normalizedState = state.toLowerCase();

  // Completed states
  if (
    normalizedState === 'done' ||
    normalizedState === 'closed' ||
    normalizedState === 'resolved' ||
    normalizedState === 'finalizado'
  ) {
    return 'completed';
  }

  // In-progress states
  if (
    normalizedState === 'active' ||
    normalizedState === 'in progress' ||
    normalizedState === 'committed' ||
    normalizedState === 'em andamento' ||
    normalizedState === 'em desenvolvimento' ||
    normalizedState === 'em auditoria' ||
    normalizedState === 'em homologação' ||
    normalizedState === 'aguardando auditoria' ||
    normalizedState === 'aguardando validação' ||
    normalizedState === 'aguardando implantação' ||
    normalizedState === 'preparando para dev'
  ) {
    return 'in_progress';
  }

  // Cancelled states
  if (
    normalizedState === 'removed' ||
    normalizedState === 'cut' ||
    normalizedState === 'cancelado'
  ) {
    return 'cancelled';
  }

  // Default to pending for Novo, Em levantamento, Backlog comprometido, etc.
  return 'pending';
}
