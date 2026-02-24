import { BaseRepository } from './base-repository';
import { TaskCommentEntity } from '../entities/task-comment.entity';
import { EntityManager } from 'typeorm';

export class TaskCommentRepository extends BaseRepository<TaskCommentEntity> {
  constructor(manager?: EntityManager) {
    super(TaskCommentEntity, manager);
  }

  async findByTask(taskId: number): Promise<TaskCommentEntity[]> {
    return await this.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
    });
  }
}
