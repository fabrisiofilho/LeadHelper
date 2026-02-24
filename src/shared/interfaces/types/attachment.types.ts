export interface Attachment {
  id: number;
  transactionId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  thumbnailPath?: string;
  createdAt: Date;
}

export interface CreateAttachmentInput {
  transactionId: number;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  };
}

export interface AttachmentUploadResult {
  success: boolean;
  attachment?: Attachment;
  errorMessage?: string;
}

export type AllowedMimeTypes =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'
  | 'text/plain'
  | 'text/csv';

export const ALLOWED_MIME_TYPES: AllowedMimeTypes[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
