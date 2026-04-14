import { ipcMain } from 'electron';
import { NoteCardService } from '../services/note-card-service';
import { ApiResponse } from '@shared/interfaces/types/common.types';
import { logger } from '@main/infrastructure/log/logger';
import { tryCatch } from '@main/infrastructure/utils/try-catch';
import type {
  CreateNoteCardInput,
  UpdateNoteCardInput,
} from '@shared/interfaces/config/index.types';

const noteCardService = new NoteCardService();

export function registerNoteCardController(): void {
  ipcMain.handle(
    'note-card:create',
    async (
      _event,
      data: CreateNoteCardInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCard = await noteCardService.create(data);
        return noteCard;
      }, 'Erro ao criar nota');
    },
  );

  ipcMain.handle(
    'note-card:update',
    async (
      _event,
      id: number,
      data: UpdateNoteCardInput,
    ): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCard = await noteCardService.update(id, data);
        return noteCard;
      }, 'Erro ao atualizar nota');
    },
  );

  ipcMain.handle(
    'note-card:delete',
    async (_event, id: number): Promise<ApiResponse<void>> => {
      return tryCatch(async () => {
        await noteCardService.delete(id);
      }, 'Erro ao excluir nota');
    },
  );

  ipcMain.handle(
    'note-card:complete',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCard = await noteCardService.complete(id);
        return noteCard;
      }, 'Erro ao concluir nota');
    },
  );

  ipcMain.handle(
    'note-card:reactivate',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCard = await noteCardService.reactivate(id);
        return noteCard;
      }, 'Erro ao reativar nota');
    },
  );

  ipcMain.handle(
    'note-card:findById',
    async (_event, id: number): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCard = await noteCardService.findById(id);
        return noteCard;
      }, 'Erro ao buscar nota');
    },
  );

  ipcMain.handle(
    'note-card:findAllActive',
    async (): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCards = await noteCardService.findAllActive();
        return noteCards;
      }, 'Erro ao listar notas ativas');
    },
  );

  ipcMain.handle(
    'note-card:findAllCompleted',
    async (): Promise<ApiResponse<unknown>> => {
      return tryCatch(async () => {
        const noteCards = await noteCardService.findAllCompleted();
        return noteCards;
      }, 'Erro ao listar notas concluídas');
    },
  );

  logger.info('NoteCard controller registered');
}
