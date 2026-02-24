/**
 * Utilitários para formatação de valores monetários
 */

/**
 * Formata um número para o padrão monetário brasileiro (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata um número para o padrão monetário brasileiro sem o símbolo (1.234,56)
 */
export function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte string formatada para número
 * Ex: "R$ 1.234,56" -> 1234.56
 */
export function parseCurrencyToNumber(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '');
  const normalized = cleaned.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata valor durante digitação (padrão banco: digita da direita para esquerda)
 * Ex: digitar "12345" resulta em { formatted: "R$ 123,45", numeric: 123.45 }
 */
export function formatCurrencyInput(rawValue: string): {
  formatted: string;
  numeric: number;
} {
  const digits = rawValue.replace(/\D/g, '');

  if (!digits) {
    return { formatted: 'R$ 0,00', numeric: 0 };
  }

  const cents = parseInt(digits, 10);
  const reais = cents / 100;

  return {
    formatted: formatCurrency(reais),
    numeric: reais,
  };
}
