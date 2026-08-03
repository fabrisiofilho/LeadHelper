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
    if (input.body) this.validateBody(input.body);

    const entity = await this.noteCardRepository.save({
      title: input.title.trim(),
      body: input.body ?? '',
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      allDay: input.allDay !== undefined ? input.allDay : true,
      dateMode: input.dateMode ?? 'none',
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
      if (input.body) this.validateBody(input.body);
      entity.body = input.body;
    }

    if (input.startDate !== undefined) {
      entity.startDate = input.startDate ? new Date(input.startDate) : null;
    }

    if (input.deadline !== undefined) {
      entity.deadline = input.deadline ? new Date(input.deadline) : null;
    }

    if (input.allDay !== undefined) {
      entity.allDay = input.allDay;
    }

    if (input.dateMode !== undefined) {
      entity.dateMode = input.dateMode;
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
    await this.noteCardRepository.delete({ id } as Record<string, unknown>);
  }

  async findAllActive(): Promise<NoteCard[]> {
    const entities = await this.noteCardRepository.findAllActive();
    return this.mapManyToDto(entities);
  }

  async findAllCompleted(): Promise<NoteCard[]> {
    const entities = await this.noteCardRepository.findAllCompleted();
    return this.mapManyToDto(entities);
  }

  async findById(id: number): Promise<NoteCard | null> {
    const entity = await this.noteCardRepository.findByIdWithLinks(id);
    if (!entity) return null;
    return this.mapToDto(entity);
  }

  /**
   * Returns notes with a period in the given date range, projected as Gantt items.
   * Notes with member links generate one item per member.
   * Notes without member links generate one item in the "no member" row.
   */
  async findForGantt(
    filters: import('@shared/interfaces/config/index.types').NoteGanttFilters,
  ): Promise<import('@shared/interfaces/config/index.types').NoteGanttItem[]> {
    const entities = await this.noteCardRepository.findInDateRange(
      filters.startDate,
      filters.endDate,
      filters.includeCompleted ?? false,
    );

    // Batch-resolve all entity names in one round-trip per entity type
    const noteDtos = await this.mapManyToDto(entities);
    const items: import('@shared/interfaces/config/index.types').NoteGanttItem[] =
      [];

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const noteCard = noteDtos[i];

      // Apply optional search filter
      if (
        filters.search &&
        !noteCard.title.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        continue;
      }

      const memberLinks = noteCard.links.filter(
        (l) => l.entityType === 'team_member',
      );

      // Apply member filter
      if (
        filters.memberIds &&
        filters.memberIds.length > 0 &&
        !memberLinks.some((l) => filters.memberIds!.includes(l.entityId))
      ) {
        continue;
      }

      const start = entity.startDate!;
      const end = entity.deadline ?? entity.startDate!;
      const color = this.resolveNoteColor(noteCard);
      // Strip HTML tags for a plain-text body preview
      const plainBody = noteCard.body
        ? noteCard.body
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 300)
        : undefined;
      const dateMode =
        (entity.dateMode as 'none' | 'single' | 'period') ?? 'none';

      if (memberLinks.length === 0) {
        // No members — single item in the "no member" row
        items.push({
          noteId: entity.id,
          noteTitle: noteCard.title,
          noteBody: plainBody,
          dateMode,
          memberId: null,
          memberName: null,
          start,
          end,
          allDay: entity.allDay,
          color,
          completedAt: noteCard.completedAt ?? null,
          links: noteCard.links,
        });
      } else {
        // One item per member
        for (const link of memberLinks) {
          items.push({
            noteId: entity.id,
            noteTitle: noteCard.title,
            noteBody: plainBody,
            dateMode,
            memberId: link.entityId,
            memberName: link.entityName ?? null,
            start,
            end,
            allDay: entity.allDay,
            color,
            completedAt: noteCard.completedAt ?? null,
            links: noteCard.links,
          });
        }
      }
    }

    return items;
  }

  /**
   * Determines a color for a note based on its dominant link type.
   * team_member → primary blue, team → secondary purple,
   * position → success green, task → warning orange, none → default grey.
   */
  private resolveNoteColor(note: NoteCard): string {
    if (note.links.length === 0) return '#64748B'; // grey
    const types = note.links.map((l) => l.entityType);
    if (types.includes('team_member')) return '#1976D2'; // blue
    if (types.includes('task')) return '#ED6C02'; // orange
    if (types.includes('team')) return '#9C27B0'; // purple
    if (types.includes('position')) return '#2E7D32'; // green
    return '#64748B';
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
    if (!body) return; // body is now optional
    const textContent = this.stripHtmlTags(body).trim();
    // Only validate if body has HTML content at all
    if (body.trim() && !textContent) {
      throw new Error('Corpo não pode conter apenas formatação vazia');
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

  /**
   * Batch-resolves entity names for a list of note card entities.
   * Groups links by entity type → at most 4 IN queries total (1 per type).
   * Returns Map with key `entityType:entityId` → name.
   * Eliminates the per-link N+1 DB query pattern.
   */
  private async resolveEntityNamesBatch(
    entities: NoteCardEntity[],
  ): Promise<Map<string, string | undefined>> {
    const nameMap = new Map<string, string | undefined>();
    const allLinks = entities.flatMap((e) => e.links ?? []);
    if (allLinks.length === 0) return nameMap;

    // Collect unique IDs per entity type
    const memberIds = [
      ...new Set(
        allLinks
          .filter((l) => l.entityType === 'team_member')
          .map((l) => l.entityId),
      ),
    ];
    const teamIds = [
      ...new Set(
        allLinks.filter((l) => l.entityType === 'team').map((l) => l.entityId),
      ),
    ];
    const posIds = [
      ...new Set(
        allLinks
          .filter((l) => l.entityType === 'position')
          .map((l) => l.entityId),
      ),
    ];
    const taskIds = [
      ...new Set(
        allLinks.filter((l) => l.entityType === 'task').map((l) => l.entityId),
      ),
    ];

    await this.fillMemberNames(memberIds, nameMap);
    await this.fillTeamNames(teamIds, nameMap);
    await this.fillPositionNames(posIds, nameMap);
    await this.fillTaskNames(taskIds, nameMap);

    return nameMap;
  }

  private async fillMemberNames(
    ids: number[],
    map: Map<string, string | undefined>,
  ): Promise<void> {
    if (ids.length === 0) return;
    try {
      const rows = await this.teamMemberRepository.repository
        .createQueryBuilder('m')
        .select(['m.id', 'm.name'])
        .where('m.id IN (:...ids)', { ids })
        .getMany();
      for (const r of rows) map.set(`team_member:${r.id}`, r.name);
    } catch {
      /* non-critical */
    }
  }

  private async fillTeamNames(
    ids: number[],
    map: Map<string, string | undefined>,
  ): Promise<void> {
    if (ids.length === 0) return;
    try {
      const allTeams = await this.teamRepository.findAll();
      const idSet = new Set(ids);
      for (const t of allTeams) {
        if (idSet.has(t.id)) map.set(`team:${t.id}`, t.name);
      }
    } catch {
      /* non-critical */
    }
  }

  private async fillPositionNames(
    ids: number[],
    map: Map<string, string | undefined>,
  ): Promise<void> {
    if (ids.length === 0) return;
    try {
      const allPositions = await this.positionRepository.findAll();
      const idSet = new Set(ids);
      for (const p of allPositions) {
        if (idSet.has(p.id)) map.set(`position:${p.id}`, p.name);
      }
    } catch {
      /* non-critical */
    }
  }

  private async fillTaskNames(
    ids: number[],
    map: Map<string, string | undefined>,
  ): Promise<void> {
    if (ids.length === 0) return;
    try {
      const rows = await this.taskRepository.repository
        .createQueryBuilder('t')
        .select(['t.id', 't.title'])
        .where('t.id IN (:...ids)', { ids })
        .getMany();
      for (const r of rows) map.set(`task:${r.id}`, r.title);
    } catch {
      /* non-critical */
    }
  }

  /**
   * Converts a single entity to DTO using a pre-built name map.
   * Call mapManyToDto for bulk operations.
   */
  private mapToDtoSync(
    entity: NoteCardEntity,
    nameMap: Map<string, string | undefined>,
  ): NoteCard {
    const links: NoteLink[] = (entity.links ?? []).map((link) => ({
      id: link.id,
      noteCardId: link.noteCardId,
      entityType: link.entityType,
      entityId: link.entityId,
      entityName: nameMap.get(`${link.entityType}:${link.entityId}`),
    }));

    return {
      id: entity.id,
      title: entity.title,
      body: entity.body,
      dateMode: (entity.dateMode as 'none' | 'single' | 'period') ?? 'none',
      startDate: entity.startDate ? entity.startDate.toISOString() : null,
      deadline: entity.deadline ? entity.deadline.toISOString() : null,
      allDay: entity.allDay ?? true,
      completedAt: entity.completedAt ? entity.completedAt.toISOString() : null,
      createdAt: entity.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() ?? new Date().toISOString(),
      links,
    };
  }

  /**
   * Efficiently maps multiple entities to DTOs using batch entity name resolution.
   * Replaces the per-entity mapToDto calls that caused N+1 queries.
   */
  private async mapManyToDto(entities: NoteCardEntity[]): Promise<NoteCard[]> {
    if (entities.length === 0) return [];
    const nameMap = await this.resolveEntityNamesBatch(entities);
    return entities.map((e) => this.mapToDtoSync(e, nameMap));
  }

  // ── Mapping (single entity — kept for backward compat) ─────

  private async mapToDto(entity: NoteCardEntity): Promise<NoteCard> {
    const nameMap = await this.resolveEntityNamesBatch([entity]);
    return this.mapToDtoSync(entity, nameMap);
  }
}
