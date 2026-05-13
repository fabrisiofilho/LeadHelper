import { NoteCardEntity } from '../entities/note-card.entity';
import { NoteLinkEntityType } from '../entities/note-link.entity';
import { NoteCardRepository } from '../repositories/note-card-repository';
import { NoteLinkRepository } from '../repositories/note-link-repository';
import { TeamMemberRepository } from '../repositories/team-member-repository';
import { TeamRepository } from '../repositories/team-repository';
import { PositionRepository } from '../repositories/position-repository';
import { TaskRepository } from '../repositories/task-repository';
import { TaskLocalPriorityRepository } from '../repositories/task-local-priority-repository';
import { logger } from '@main/infrastructure/log/logger';
import type {
  NoteCard,
  NoteLink,
  CreateNoteCardInput,
  UpdateNoteCardInput,
} from '@shared/interfaces/config/index.types';

/** Prefix used to identify prioritization notes created from the Dashboard Sustentação */
const PRIO_NOTE_PREFIX = 'Priorização #';

export class NoteCardService {
  private noteCardRepository: NoteCardRepository;
  private noteLinkRepository: NoteLinkRepository;
  private teamMemberRepository: TeamMemberRepository;
  private teamRepository: TeamRepository;
  private positionRepository: PositionRepository;
  private taskRepository: TaskRepository;
  private taskLocalPriorityRepository: TaskLocalPriorityRepository;

  constructor(
    noteCardRepository?: NoteCardRepository,
    noteLinkRepository?: NoteLinkRepository,
  ) {
    this.noteCardRepository = noteCardRepository ?? new NoteCardRepository();
    this.noteLinkRepository = noteLinkRepository ?? new NoteLinkRepository();
    this.teamMemberRepository = new TeamMemberRepository();
    this.teamRepository = new TeamRepository();
    this.positionRepository = new PositionRepository();
    this.taskRepository = new TaskRepository();
    this.taskLocalPriorityRepository = new TaskLocalPriorityRepository();
  }

  async create(input: CreateNoteCardInput): Promise<NoteCard> {
    logger.info('Creating note card', { title: input.title });

    this.validateTitle(input.title);
    this.validateBody(input.body);

    const entity = await this.noteCardRepository.save({
      title: input.title.trim(),
      body: input.body,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    } as Partial<NoteCardEntity>);

    if (input.links && input.links.length > 0) {
      await this.noteLinkRepository.createLinks(
        input.links.map((link) => ({
          noteCardId: entity.id,
          entityType: link.entityType as NoteLinkEntityType,
          entityId: link.entityId,
        })),
      );
    }

    const created = await this.noteCardRepository.findByIdWithLinks(entity.id);
    return this.mapToDto(created!);
  }

  async update(id: number, input: UpdateNoteCardInput): Promise<NoteCard> {
    logger.info('Updating note card', { id });

    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) {
      throw new Error('Nota não encontrada');
    }

    if (input.title !== undefined) {
      this.validateTitle(input.title);
      entity.title = input.title.trim();
    }

    if (input.body !== undefined) {
      this.validateBody(input.body);
      entity.body = input.body;
    }

    if (input.deadline !== undefined) {
      entity.deadline = input.deadline ? new Date(input.deadline) : undefined;
    }

    await this.noteCardRepository.save(entity);

    if (input.links !== undefined) {
      await this.noteLinkRepository.deleteByNoteCardId(id);
      if (input.links.length > 0) {
        await this.noteLinkRepository.createLinks(
          input.links.map((link) => ({
            noteCardId: id,
            entityType: link.entityType as NoteLinkEntityType,
            entityId: link.entityId,
          })),
        );
      }
    }

    const updated = await this.noteCardRepository.findByIdWithLinks(id);
    return this.mapToDto(updated!);
  }

  async complete(id: number): Promise<NoteCard> {
    logger.info('Completing note card', { id });

    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) {
      throw new Error('Nota não encontrada');
    }

    if (entity.completedAt) {
      throw new Error('Nota já está concluída');
    }

    entity.completedAt = new Date();
    await this.noteCardRepository.save(entity);

    // If this is a prioritization note, remove the local priority from the linked task
    await this.removePriorityIfPrioritizationNote(entity);

    const completed = await this.noteCardRepository.findByIdWithLinks(id);
    return this.mapToDto(completed!);
  }

  async reactivate(id: number): Promise<NoteCard> {
    logger.info('Reactivating note card', { id });

    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) {
      throw new Error('Nota não encontrada');
    }

    if (!entity.completedAt) {
      throw new Error('Nota já está ativa');
    }

    entity.completedAt = null as unknown as Date | undefined;
    await this.noteCardRepository.save(entity);

    const reactivated = await this.noteCardRepository.findByIdWithLinks(id);
    return this.mapToDto(reactivated!);
  }

  async delete(id: number): Promise<void> {
    logger.info('Deleting note card', { id });

    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) {
      throw new Error('Nota não encontrada');
    }

    // If this is a prioritization note, remove the local priority from the linked task
    await this.removePriorityIfPrioritizationNote(entity);

    await this.noteLinkRepository.deleteByNoteCardId(id);
    await this.noteCardRepository.delete({ id } as any);
  }

  async findAllActive(): Promise<NoteCard[]> {
    const entities = await this.noteCardRepository.findAllActive();
    return Promise.all(entities.map((e) => this.mapToDto(e)));
  }

  async findAllCompleted(): Promise<NoteCard[]> {
    const entities = await this.noteCardRepository.findAllCompleted();
    return Promise.all(entities.map((e) => this.mapToDto(e)));
  }

  async findById(id: number): Promise<NoteCard | null> {
    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) return null;
    return this.mapToDto(entity);
  }

  // ── Priority cleanup for prioritization notes ───────────────

  /**
   * If the note is a prioritization note (title starts with "Priorização #"),
   * find the linked task and remove its local priority.
   * This ensures that completing or deleting a prioritization note from the
   * Notes Board also clears the priority from the Dashboard Sustentação.
   */
  private async removePriorityIfPrioritizationNote(
    entity: NoteCardEntity,
  ): Promise<void> {
    if (!entity.title.startsWith(PRIO_NOTE_PREFIX)) return;

    const links = entity.links ?? [];
    const taskLinks = links.filter((l) => l.entityType === 'task');

    for (const link of taskLinks) {
      try {
        const task = await this.taskRepository.findOne({
          where: { id: link.entityId },
        });
        if (task?.externalId) {
          logger.info(
            `Removing local priority for task ${task.externalId} (prioritization note ${entity.id} completed/deleted)`,
          );
          await this.taskLocalPriorityRepository.deleteByExternalId(
            task.externalId,
          );
        }
      } catch (error) {
        logger.warning(
          `Failed to remove local priority for task link ${link.entityId}`,
          error,
        );
      }
    }
  }

  // ── Validation ──────────────────────────────────────────────

  private validateTitle(title: string): void {
    if (!title || !title.trim()) {
      throw new Error('Título é obrigatório');
    }
  }

  private validateBody(body: string): void {
    if (!body || !body.trim()) {
      throw new Error('Corpo é obrigatório');
    }

    const textContent = this.stripHtmlTags(body).trim();
    if (!textContent) {
      throw new Error('Corpo é obrigatório');
    }
  }

  /**
   * Strips HTML tags from a string and returns the remaining text content.
   * Used to validate that the body has actual textual content beyond empty tags.
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '') // remove <br> / <br/>
      .replace(/<[^>]*>/g, '') // remove all HTML tags
      .replace(/&nbsp;/gi, ' '); // replace &nbsp; with space
  }

  // ── Entity name resolution ─────────────────────────────────

  private async resolveEntityName(
    entityType: NoteLinkEntityType,
    entityId: number,
  ): Promise<string | undefined> {
    try {
      switch (entityType) {
        case 'team_member': {
          const member = await this.teamMemberRepository.findOneBy({
            id: entityId,
          } as any);
          return member?.name ?? undefined;
        }
        case 'team': {
          const team = await this.teamRepository.findById(entityId);
          return team?.name ?? undefined;
        }
        case 'position': {
          const position = await this.positionRepository.findById(entityId);
          return position?.name ?? undefined;
        }
        case 'task': {
          const task = await this.taskRepository.findOne({
            where: { id: entityId },
          });
          return task?.title ?? undefined;
        }
        default:
          return undefined;
      }
    } catch (error) {
      logger.warning(
        `Failed to resolve entity name for ${entityType}:${entityId}`,
        error,
      );
      return undefined;
    }
  }

  // ── Mapping ────────────────────────────────────────────────

  private async mapToDto(entity: NoteCardEntity): Promise<NoteCard> {
    const links: NoteLink[] = [];

    if (entity.links && entity.links.length > 0) {
      for (const link of entity.links) {
        const entityName = await this.resolveEntityName(
          link.entityType,
          link.entityId,
        );
        links.push({
          id: link.id,
          noteCardId: link.noteCardId,
          entityType: link.entityType,
          entityId: link.entityId,
          entityName,
        });
      }
    }

    return {
      id: entity.id,
      title: entity.title,
      body: entity.body,
      deadline: entity.deadline ? entity.deadline.toISOString() : null,
      completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
      createdAt: entity.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() ?? new Date().toISOString(),
      links,
    };
  }
}
