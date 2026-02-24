export type AccountType = 'checking' | 'savings' | 'credit_card' | 'wallet';

export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'elo'
  | 'amex'
  | 'hipercard'
  | 'diners'
  | 'other';

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
  diners: 'Diners Club',
  other: 'Outra',
};

export const BANK_OPTIONS = [
  'Nubank',
  'Inter',
  'C6 Bank',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa',
  'BTG Pactual',
  'XP',
  'Original',
  'Neon',
  'PicPay',
  'Mercado Pago',
  'PagBank',
  'Outro',
] as const;

export const CARD_COLOR_OPTIONS = [
  { value: '#1a1a2e', label: 'Preto' },
  { value: '#4a148c', label: 'Roxo' },
  { value: '#0d47a1', label: 'Azul' },
  { value: '#00695c', label: 'Verde' },
  { value: '#bf360c', label: 'Laranja' },
  { value: '#b71c1c', label: 'Vermelho' },
  { value: '#f9a825', label: 'Dourado' },
  { value: '#546e7a', label: 'Cinza' },
  { value: '#e91e63', label: 'Rosa' },
  { value: '#00bcd4', label: 'Ciano' },
] as const;

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: number;
  creditLimit?: number;
  closingDay?: number;
  cardColor?: string;
  cardBrand?: CardBrand;
  bankName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  balance?: number;
  creditLimit?: number;
  closingDay?: number;
  cardColor?: string;
  cardBrand?: CardBrand;
  bankName?: string;
}

export interface UpdateAccountInput {
  name?: string;
  creditLimit?: number;
  closingDay?: number;
  cardColor?: string;
  cardBrand?: CardBrand;
  bankName?: string;
}
