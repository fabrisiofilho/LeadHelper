import type { TaskType } from '@shared/interfaces/config/index.types';

export interface TaskTypeOption {
  value: TaskType;
  label: string;
  color: string;
}

export const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  { value: 'task', label: 'Tarefa', color: '#2563EB' },
  { value: 'bug', label: 'Bug', color: '#DC2626' },
  { value: 'feature', label: 'Feature', color: '#16A34A' },
  { value: 'improvement', label: 'Melhoria', color: '#D97706' },
  { value: 'support', label: 'Sustentação', color: '#7C3AED' },
];

export function getTaskTypeOption(type?: string): TaskTypeOption {
  return (
    TASK_TYPE_OPTIONS.find((t) => t.value === type) ?? TASK_TYPE_OPTIONS[0]
  );
}
