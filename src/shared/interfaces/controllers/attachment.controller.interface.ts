import type {
  Attachment,
  AttachmentUploadResult,
} from '../types/attachment.types';
import type { ApiResponse } from '../types/api.types';

export interface IAttachmentController {
  upload(
    transactionId: number,
    fileData: { buffer: ArrayBuffer; originalName: string; mimeType: string },
  ): Promise<ApiResponse<AttachmentUploadResult>>;
  delete(id: number): Promise<ApiResponse<void>>;
  findByTransaction(transactionId: number): Promise<ApiResponse<Attachment[]>>;
  getFile(
    id: number,
  ): Promise<
    ApiResponse<{ data: ArrayBuffer; mimeType: string; filename: string }>
  >;
}
