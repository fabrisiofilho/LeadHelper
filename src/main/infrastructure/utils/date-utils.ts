/**
 * Utilitários centralizados para tratamento seguro de datas.
 *
 * ## O problema
 * O SQLite armazena datas como strings 'YYYY-MM-DD'. O TypeORM NÃO aplica
 * o column transformer nos valores passados a FindOperators (LessThanOrEqual,
 * MoreThanOrEqual, Between, etc.). Isso faz com que objetos Date sejam
 * serializados como ISO strings completas (ex: '2026-02-24T18:30:00.000Z'),
 * quebrando comparações de string contra valores 'YYYY-MM-DD' no banco.
 *
 * ## A solução
 * Todas as comparações de data em queries devem usar strings 'YYYY-MM-DD'.
 * Este módulo fornece:
 * - `toDateString()` — converte Date para 'YYYY-MM-DD' (uso em queries)
 * - `dateLte()` / `dateGte()` / `dateBetween()` — wrappers TypeORM-safe
 * - Funções utilitárias de parsing e formatação
 *
 * ## Regra de ouro
 * NUNCA passe um objeto `new Date()` diretamente para FindOperators do TypeORM.
 * Use sempre os helpers deste módulo.
 */

import {
  LessThanOrEqual,
  MoreThanOrEqual,
  Between,
  FindOperator,
  IsNull,
  Or,
} from 'typeorm';

// ============================================================
// Query helpers — usar em repositories com find() / where
// ============================================================

/**
 * Converte um Date para string 'YYYY-MM-DD' usando valores locais.
 * Uso principal: parâmetros de query no SQLite.
 *
 * @example
 * const dateStr = toDateString(new Date()); // '2026-02-24'
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a data de hoje como string 'YYYY-MM-DD'.
 */
export function todayString(): string {
  return toDateString(new Date());
}

/**
 * FindOperator: coluna <= date (como string 'YYYY-MM-DD').
 * Substitui `LessThanOrEqual(date)` em queries TypeORM.
 *
 * @example
 * where: { startDate: dateLte(endDate) }
 */
export function dateLte(date: Date): FindOperator<Date> {
  return LessThanOrEqual(toDateString(date) as unknown as Date);
}

/**
 * FindOperator: coluna >= date (como string 'YYYY-MM-DD').
 * Substitui `MoreThanOrEqual(date)` em queries TypeORM.
 *
 * @example
 * where: { endDate: dateGte(startDate) }
 */
export function dateGte(date: Date): FindOperator<Date> {
  return MoreThanOrEqual(toDateString(date) as unknown as Date);
}

/**
 * FindOperator: coluna BETWEEN startDate AND endDate (como strings 'YYYY-MM-DD').
 *
 * @example
 * where: { startDate: dateBetween(from, to) }
 */
export function dateBetween(start: Date, end: Date): FindOperator<Date> {
  return Between(
    toDateString(start) as unknown as Date,
    toDateString(end) as unknown as Date,
  );
}

/**
 * FindOperator: coluna >= date OR coluna IS NULL.
 * Útil para campos de data fim opcionais (alocações indefinidas).
 *
 * @example
 * where: { endDate: dateGteOrNull(referenceDate) }
 */
export function dateGteOrNull(date: Date): FindOperator<Date> {
  return Or(MoreThanOrEqual(toDateString(date) as unknown as Date), IsNull());
}

// ============================================================
// Parsing e formatação — uso geral
// ============================================================

/**
 * Converte uma string de data (YYYY-MM-DD) ou Date para um objeto Date
 * sem problemas de timezone. Datas no formato YYYY-MM-DD são tratadas
 * como datas locais, não UTC.
 */
export function parseDateSafe(
  date: Date | string | null | undefined,
): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return date;
  }

  if (typeof date === 'string') {
    // Formato YYYY-MM-DD (sem hora) - criar como data local
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    // Formato ISO com T - extrair apenas a data
    if (date.includes('T')) {
      const datePart = date.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    // Outros formatos - meio-dia para evitar problema de timezone
    return new Date(`${date}T12:00:00`);
  }

  return null;
}

/**
 * Converte uma Date para string no formato YYYY-MM-DD de forma segura,
 * usando os valores locais (não UTC).
 * Alias de `toDateString` para compatibilidade.
 */
export function formatDateToISO(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? parseDateSafe(date) : date;
  if (!dateObj) return null;

  return toDateString(dateObj);
}

/**
 * Cria uma nova Date a partir de uma data existente, garantindo que seja tratada
 * como data local.
 */
export function ensureLocalDate(
  date: Date | string | null | undefined,
): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  return parseDateSafe(date);
}

/**
 * Compara duas datas ignorando a hora (apenas ano, mês e dia).
 * Retorna: -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export function compareDatesOnly(
  date1: Date | string | null | undefined,
  date2: Date | string | null | undefined,
): number {
  const d1 = parseDateSafe(date1);
  const d2 = parseDateSafe(date2);

  if (!d1 && !d2) return 0;
  if (!d1) return -1;
  if (!d2) return 1;

  const d1Str = formatDateToISO(d1);
  const d2Str = formatDateToISO(d2);

  if (d1Str === d2Str) return 0;
  return d1Str! < d2Str! ? -1 : 1;
}
