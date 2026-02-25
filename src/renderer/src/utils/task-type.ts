import type { TaskType } from '@shared/interfaces/config/index.types';

export interface TaskTypeOption {
  value: TaskType;
  label: string;
  color: string;
}

export const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  { value: 'task', label: 'Tarefa', color: '#1976d2' },
  { value: 'bug', label: 'Bug', color: '#f44336' },
  { value: 'feature', label: 'Feature', color: '#4caf50' },
  { value: 'improvement', label: 'Melhoria', color: '#ff9800' },
  { value: 'support', label: 'Sustentação', color: '#9c27b0' },
];

export function getTaskTypeOption(type?: string): TaskTypeOption {
  return (
    TASK_TYPE_OPTIONS.find((t) => t.value === type) ?? TASK_TYPE_OPTIONS[0]
  );
}
