import type { ApiResponse } from '../types/common.types';
import type {
  ImportResult,
  ImportPreview,
  ImportConfig,
  CSVPreviewData,
  ParsedTransaction,
} from '../types/import.types';

export interface IImportController {
  getCSVPreview(csvContent: string): Promise<ApiResponse<CSVPreviewData>>;
  previewImport(
    csvContent: string,
    config: ImportConfig,
  ): Promise<ApiResponse<ImportPreview>>;
  importCSV(
    csvContent: string,
    config: ImportConfig,
    transactions: ParsedTransaction[],
  ): Promise<ApiResponse<ImportResult>>;
}
