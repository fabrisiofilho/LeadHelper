import { ValueTransformer } from 'typeorm';

/**
 * Transformer para colunas DATETIME no TypeORM/SQLite.
 *
 * Diferente do DateTransformer (que trunca para YYYY-MM-DD),
 * este preserva horas e minutos: 'YYYY-MM-DD HH:mm:ss'.
 *
 * Usado em colunas como azure_created_date e azure_changed_date
 * onde o horário é importante para cálculos de SLA.
 */
export const DateTimeTransformer: ValueTransformer = {
  /**
   * Converte Date para string 'YYYY-MM-DD HH:mm:ss' ao salvar no banco
   */
  to(value: Date | string | null | undefined): string | null {
    if (!value) return null;

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      const seconds = String(value.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    if (typeof value === 'string') {
      // Se já é string com hora, retorna como está
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
        return value;
      }
      // Se é ISO com T, converte para formato SQLite
      if (value.includes('T')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
      }
      // Se é só data, adiciona 00:00:00
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return `${value} 00:00:00`;
      }
    }

    return null;
  },

  /**
   * Converte string do banco para Date ao ler
   */
  from(value: string | Date | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string') {
      // Formato 'YYYY-MM-DD HH:mm:ss' ou 'YYYY-MM-DD HH:mm:ss.SSS'
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hours, minutes, seconds] = match.map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
      }

      // Formato ISO com T
      if (value.includes('T')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) return d;
      }

      // Formato YYYY-MM-DD (sem hora)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
    }

    return null;
  },
};
