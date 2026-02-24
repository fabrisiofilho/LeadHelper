import { ValueTransformer } from 'typeorm';

/**
 * Transformer para colunas de data no TypeORM/SQLite.
 *
 * Problema: O SQLite armazena datas como strings 'YYYY-MM-DD'. Quando o TypeORM
 * lê essa string e cria um `new Date('YYYY-MM-DD')`, o JavaScript interpreta
 * como UTC meia-noite. Ao converter para o fuso local (ex: Brasil, UTC-3),
 * a data "volta" para o dia anterior (23:00 do dia anterior).
 *
 * Solução: Este transformer garante que:
 * - Ao salvar: converte Date para string 'YYYY-MM-DD' usando valores locais
 * - Ao ler: cria Date usando new Date(year, month-1, day) que é local
 */
export const DateTransformer: ValueTransformer = {
  /**
   * Converte Date para string ao salvar no banco
   */
  to(value: Date | string | null | undefined): string | null {
    if (!value) return null;

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    if (typeof value === 'string') {
      // Se já é string no formato correto, retorna
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // Se tem T, extrai apenas a data
      if (value.includes('T')) {
        return value.split('T')[0];
      }
    }

    return null;
  },

  /**
   * Converte string do banco para Date ao ler
   */
  from(value: string | Date | null | undefined): Date | null {
    if (!value) return null;

    // Se já é Date, garantir que está como data local
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'string') {
      // Formato YYYY-MM-DD - criar como data local
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
      }

      // Formato ISO com T - extrair apenas a data
      if (value.includes('T')) {
        const datePart = value.split('T')[0];
        const [year, month, day] = datePart.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
    }

    return null;
  },
};
