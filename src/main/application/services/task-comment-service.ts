import { TaskCommentRepository } from '../repositories/task-comment-repository';
import { TaskCommentEntity } from '../entities/task-comment.entity';
import { logger } from '@main/infrastructure/log/logger';

export interface TaskCommentDto {
  id: number;
  content: string;
  author?: string;
  taskId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTaskCommentInput {
  content: string;
  author?: string;
  taskId: number;
}

export interface UpdateTaskCommentInput {
  content?: string;
}

export class TaskCommentService {
  private repository: TaskCommentRepository;

  constructor() {
    this.repository = new TaskCommentRepository();
  }

  private toDto(entity: TaskCommentEntity): TaskCommentDto {
    return {
      id: entity.id,
      content: entity.content,
      author: entity.author,
      taskId: entity.taskId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async findByTask(taskId: number): Promise<TaskCommentDto[]> {
    const entities = await this.repository.findByTask(taskId);
    return entities.map((e) => this.toDto(e));
  }

  async create(data: CreateTaskCommentInput): Promise<TaskCommentDto> {
    const entity = new TaskCommentEntity();
    entity.content = data.content;
    entity.author = data.author;
    entity.taskId = data.taskId;

    const saved = await this.repository.save(entity);
    logger.info(`Task comment created: ${saved.id} for task ${data.taskId}`);
    return this.toDto(saved);
  }

  async update(
    id: number,
    data: UpdateTaskCommentInput,
  ): Promise<TaskCommentDto> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) {
      throw new Error(`Comentário com ID ${id} não encontrado`);
    }

    if (data.content !== undefined) entity.content = data.content;

    const saved = await this.repository.save(entity);
    return this.toDto(saved);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) {
      throw new Error(`Comentário com ID ${id} não encontrado`);
    }
    await this.repository.delete({ id } as any);
    logger.info(`Task comment deleted: ${id}`);
  }
}
