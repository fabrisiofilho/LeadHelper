import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

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

    // Formato ISO com T (ex: 2025-11-01T00:00:00) - extrair apenas a data
    if (date.includes('T')) {
      const datePart = date.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    // Outros formatos - tentar criar com offset para evitar problema de timezone
    return new Date(`${date}T12:00:00`);
  }

  return null;
}

/**
 * Converte uma Date para string no formato YYYY-MM-DD de forma segura,
 * usando os valores locais (não UTC).
 */
export function formatDateToISO(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? parseDateSafe(date) : date;
  if (!dateObj) return null;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatDateToShow(date: Date | string): string {
  if (!date) return '';

  let dateObj: Date;

  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      dateObj = new Date(year, month - 1, day);
    } else if (date.includes('T')) {
      dateObj = parseISO(date);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  return format(dateObj, 'dd/MM/yyyy');
}

export function formatTimeToShow(date: Date | string): string {
  if (!date) return '';

  const dateWithTimezone = toZonedTime(new Date(date), TIMEZONE);

  return format(dateWithTimezone, 'HH:mm:ss');
}

export function formatMonthYear(year: number, month: number): string {
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return `${monthNames[month - 1]}/${year}`;
}

export function formatMonthYearShort(year: number, month: number): string {
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  return `${monthNames[month - 1]}/${year}`;
}
