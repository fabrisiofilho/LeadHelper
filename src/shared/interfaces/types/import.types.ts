export type FieldType =
  | 'date'
  | 'description'
  | 'amount'
  | 'type'
  | 'category'
  | 'account'
  | 'ignore';

export type NumberFormat = 'brazilian' | 'international' | 'auto';

export interface ColumnMapping {
  columnIndex: number;
  columnName: string;
  fieldType: FieldType;
  sampleValues: string[];
}

export interface ImportConfig {
  hasHeader: boolean;
  delimiter: string;
  dateFormat: string;
  numberFormat: NumberFormat;
  columnMappings: ColumnMapping[];
  defaultAccountId?: number;
  incomeKeywords: string[];
  expenseKeywords: string[];
}

export interface CSVPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
  detectedDelimiter: string;
  detectedHasHeader: boolean;
}

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  account?: string;
  rawRow: string[];
}

export interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
  };
  categoriesToCreate: string[];
  sampleTransactions: ParsedTransaction[];
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  categoriesCreated: number;
  transactionsCreated: number;
  errors: string[];
}

export const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/AAAA (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/AAAA (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'AAAA-MM-DD (2024-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-AAAA (31-12-2024)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.AAAA (31.12.2024)' },
] as const;

export const NUMBER_FORMAT_OPTIONS = [
  { value: 'auto', label: 'Detectar Automaticamente' },
  { value: 'brazilian', label: 'Brasileiro (1.234,56)' },
  { value: 'international', label: 'Internacional (1,234.56)' },
] as const;

export const FIELD_TYPE_OPTIONS = [
  { value: 'date', label: 'Data' },
  { value: 'description', label: 'Descrição' },
  { value: 'amount', label: 'Valor' },
  { value: 'type', label: 'Tipo (Receita/Despesa)' },
  { value: 'category', label: 'Categoria' },
  { value: 'account', label: 'Conta' },
  { value: 'ignore', label: 'Ignorar' },
] as const;
