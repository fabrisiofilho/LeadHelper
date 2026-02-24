export type BankCode =
  | 'santander'
  | 'bradesco'
  | 'itau'
  | 'bb'
  | 'caixa'
  | 'nubank'
  | 'inter'
  | 'other';
export type ImportFileType = 'ofx' | 'csv' | 'xlsx';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ImportTransactionStatus =
  | 'pending'
  | 'matched'
  | 'imported'
  | 'ignored'
  | 'duplicate';

export interface BankImport {
  id: number;
  userId: number;
  accountId: number;
  accountName?: string;
  bankCode: BankCode;
  filename: string;
  fileType: ImportFileType;
  importDate: Date;
  startDate?: Date;
  endDate?: Date;
  totalTransactions: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  status: ImportStatus;
  errorMessage?: string;
  createdAt: Date;
}

export interface BankImportTransaction {
  id: number;
  importId: number;
  externalId?: string;
  description: string;
  amount: number;
  transactionDate: Date;
  type: 'income' | 'expense';
  rawData?: string;
  status: ImportTransactionStatus;
  matchedTransactionId?: number;
  suggestedCategoryId?: number;
  suggestedCategoryName?: string;
  confidenceScore?: number;
  createdAt: Date;
}

export interface CreateBankImportInput {
  accountId: number;
  bankCode: BankCode;
  file: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
  };
}

export interface ImportTransactionAction {
  importTransactionId: number;
  action: 'import' | 'match' | 'ignore';
  categoryId?: number;
  matchedTransactionId?: number;
  description?: string;
}

export interface ProcessImportInput {
  importId: number;
  actions: ImportTransactionAction[];
}

export interface BankImportResult {
  importId: number;
  status: ImportStatus;
  totalProcessed: number;
  imported: number;
  matched: number;
  ignored: number;
  errors: { transactionId: number; error: string }[];
}

export interface ReconciliationSuggestion {
  importTransaction: BankImportTransaction;
  possibleMatches: {
    transactionId: number;
    description: string;
    amount: number;
    date: Date;
    confidence: number;
  }[];
}

// Santander-specific parsing
export interface SantanderTransaction {
  date: string;
  description: string;
  value: number;
  balance?: number;
  documentNumber?: string;
}

export interface SantanderOFXData {
  bankId: string;
  accountId: string;
  accountType: string;
  startDate: Date;
  endDate: Date;
  transactions: SantanderTransaction[];
}
