import { TeamMemberAllocationRepository } from '../repositories/team-member-allocation-repository';
import { TaskRepository } from '../repositories/task-repository';

export interface GanttItem {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  color: string;
  teamMemberId?: number;
  teamMemberName?: string;
  taskId?: number;
  taskTitle?: string;
  allocationId: number;
  sprintId?: number;
  sprintName?: string;
  notes?: string;
}

export interface GanttData {
  items: GanttItem[];
  startDate: Date;
  endDate: Date;
}

export interface GanttFilters {
  groupBy: 'team_member' | 'task';
  startDate: Date;
  endDate: Date;
  teamMemberIds?: number[];
  taskIds?: number[];
  teamId?: number;
  sprintId?: number;
}

export class GanttService {
  private allocationRepository: TeamMemberAllocationRepository;
  private taskRepository: TaskRepository;

  constructor() {
    this.allocationRepository = new TeamMemberAllocationRepository();
    this.taskRepository = new TaskRepository();
  }

  async getGanttData(filters: GanttFilters): Promise<GanttData> {
    // Buscar alocações com filtros
    const allocations = await this.allocationRepository.findWithFilters({
      teamId: filters.teamId,
      teamMemberId: filters.teamMemberIds?.[0], // Usar apenas o primeiro se houver
      startDate: filters.startDate,
      endDate: filters.endDate,
      isActive: true,
    });

    const items: GanttItem[] = [];

    for (const allocation of allocations) {
      // Buscar tarefas do membro no período
      const tasks = await this.taskRepository.findByAssignedToEmail(
        allocation.teamMember?.email || '',
      );

      // Filtrar tarefas pelo período e sprint se especificado
      const filteredTasks = tasks.filter((task) => {
        if (filters.sprintId && task.sprintId !== filters.sprintId) {
          return false;
        }
        // Incluir tarefas que têm datas dentro do período da alocação
        if (task.startDate && task.endDate) {
          return (
            task.startDate <= allocation.endDate! &&
            task.endDate >= allocation.startDate
          );
        }
        return true;
      });

      if (filters.groupBy === 'team_member') {
        // Agrupar por membro - criar um item por alocação
        items.push({
          id: `allocation-${allocation.id}`,
          name: allocation.team?.name || 'Equipe desconhecida',
          start: allocation.startDate,
          end: allocation.endDate || new Date(),
          progress: 0,
          color: allocation.team?.color || '#2196F3',
          teamMemberId: allocation.teamMemberId,
          teamMemberName: allocation.teamMember?.name,
          allocationId: allocation.id,
          notes: allocation.notes,
        });

        // Adicionar tarefas como sub-itens
        for (const task of filteredTasks) {
          if (task.startDate && task.endDate) {
            items.push({
              id: `task-${task.id}`,
              name: task.title,
              start: task.startDate,
              end: task.endDate,
              progress: task.status === 'completed' ? 100 : 0,
              color: '#4caf50',
              teamMemberId: allocation.teamMemberId,
              teamMemberName: allocation.teamMember?.name,
              taskId: task.id,
              taskTitle: task.title,
              allocationId: allocation.id,
              sprintId: task.sprintId,
              sprintName: task.sprint?.name,
            });
          }
        }
      } else {
        // Agrupar por tarefa
        for (const task of filteredTasks) {
          if (task.startDate && task.endDate) {
            items.push({
              id: `task-${task.id}-member-${allocation.teamMemberId}`,
              name: task.title,
              start: task.startDate,
              end: task.endDate,
              progress: task.status === 'completed' ? 100 : 0,
              color: allocation.team?.color || '#2196F3',
              teamMemberId: allocation.teamMemberId,
              teamMemberName: allocation.teamMember?.name,
              taskId: task.id,
              taskTitle: task.title,
              allocationId: allocation.id,
              sprintId: task.sprintId,
              sprintName: task.sprint?.name,
            });
          }
        }
      }
    }

    return {
      items,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }
}
