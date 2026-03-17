/**
 * Módulo utilitário puro para cálculo de horas úteis.
 *
 * Horário útil: 08:00–12:00 (manhã) e 13:30–17:30 (tarde), segunda a sexta.
 * 1 dia útil = 8 horas (4h manhã + 4h tarde).
 *
 * Sem dependências externas — apenas Date nativo.
 */

// ============================================================
// Constantes
// ============================================================

const MORNING_START = { hour: 8, minute: 0 }; // 08:00
const MORNING_END = { hour: 12, minute: 0 }; // 12:00
const AFTERNOON_START = { hour: 13, minute: 30 }; // 13:30
const AFTERNOON_END = { hour: 17, minute: 30 }; // 17:30
const HOURS_PER_DAY = 8; // 4h manhã + 4h tarde

const MS_PER_HOUR = 3_600_000;

// ============================================================
// Helpers internos
// ============================================================

/** Converte hora e minuto para minutos desde meia-noite. */
function toMinutes(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/** Retorna os minutos desde meia-noite para um Date. */
function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Cria um novo Date no mesmo dia com hora/minuto específicos, segundos e ms zerados. */
function setTime(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Avança um Date para o próximo dia (mantém hora). */
function nextDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

// Limites em minutos desde meia-noite
const MORNING_START_MIN = toMinutes(MORNING_START.hour, MORNING_START.minute);
const MORNING_END_MIN = toMinutes(MORNING_END.hour, MORNING_END.minute);
const AFTERNOON_START_MIN = toMinutes(
  AFTERNOON_START.hour,
  AFTERNOON_START.minute,
);
const AFTERNOON_END_MIN = toMinutes(AFTERNOON_END.hour, AFTERNOON_END.minute);

// ============================================================
// Funções exportadas
// ============================================================

/**
 * Retorna true se a data cai em um dia útil (segunda a sexta).
 * 0 = domingo, 6 = sábado.
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * Retorna true se a data está dentro do horário útil:
 * 08:00–12:00 ou 13:30–17:30 em dia útil.
 *
 * Limites: início inclusivo, fim exclusivo.
 * Ex: 08:00 = true, 12:00 = false, 13:30 = true, 17:30 = false.
 */
export function isBusinessHour(date: Date): boolean {
  if (!isBusinessDay(date)) return false;

  const mins = minutesOfDay(date);

  const inMorning = mins >= MORNING_START_MIN && mins < MORNING_END_MIN;
  const inAfternoon = mins >= AFTERNOON_START_MIN && mins < AFTERNOON_END_MIN;

  return inMorning || inAfternoon;
}

/**
 * Se a data está fora do horário útil, retorna o próximo início de horário útil.
 * Se já está em horário útil, retorna a própria data (com segundos/ms zerados).
 */
export function nextBusinessHourStart(date: Date): Date {
  const d = new Date(date);

  // Avança para o próximo dia útil se for fim de semana
  while (!isBusinessDay(d)) {
    d.setDate(d.getDate() + 1);
    d.setHours(MORNING_START.hour, MORNING_START.minute, 0, 0);
  }

  const mins = minutesOfDay(d);

  // Antes do início da manhã → início da manhã
  if (mins < MORNING_START_MIN) {
    return setTime(d, MORNING_START.hour, MORNING_START.minute);
  }

  // Dentro da manhã → retorna a data (zerando segundos/ms)
  if (mins < MORNING_END_MIN) {
    const result = new Date(d);
    result.setSeconds(0, 0);
    return result;
  }

  // No intervalo de almoço → início da tarde
  if (mins < AFTERNOON_START_MIN) {
    return setTime(d, AFTERNOON_START.hour, AFTERNOON_START.minute);
  }

  // Dentro da tarde → retorna a data (zerando segundos/ms)
  if (mins < AFTERNOON_END_MIN) {
    const result = new Date(d);
    result.setSeconds(0, 0);
    return result;
  }

  // Após o fim da tarde → próximo dia útil, início da manhã
  const next = nextDay(d);
  next.setHours(MORNING_START.hour, MORNING_START.minute, 0, 0);
  while (!isBusinessDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/**
 * Calcula as horas úteis de um único dia entre dois instantes (em minutos desde meia-noite).
 * Retorna horas (fracionárias).
 */
function businessHoursInDay(startMin: number, endMin: number): number {
  if (startMin >= endMin) return 0;

  let hours = 0;

  // Interseção com período da manhã
  const morningStart = Math.max(startMin, MORNING_START_MIN);
  const morningEnd = Math.min(endMin, MORNING_END_MIN);
  if (morningStart < morningEnd) {
    hours += (morningEnd - morningStart) / 60;
  }

  // Interseção com período da tarde
  const afternoonStart = Math.max(startMin, AFTERNOON_START_MIN);
  const afternoonEnd = Math.min(endMin, AFTERNOON_END_MIN);
  if (afternoonStart < afternoonEnd) {
    hours += (afternoonEnd - afternoonStart) / 60;
  }

  return hours;
}

/**
 * Calcula o total de horas úteis entre duas datas.
 * Conta apenas tempo dentro de 08:00–12:00 e 13:30–17:30, segunda a sexta.
 *
 * Se start >= end, retorna 0.
 * Se start está fora do horário útil, a contagem começa do próximo horário útil.
 */
export function calculateBusinessHours(start: Date, end: Date): number {
  if (start >= end) return 0;

  let totalHours = 0;
  let current = new Date(start);
  const endTime = end.getTime();

  while (current.getTime() < endTime) {
    if (isBusinessDay(current)) {
      const startMin = minutesOfDay(current);
      const sameDay =
        current.getFullYear() === end.getFullYear() &&
        current.getMonth() === end.getMonth() &&
        current.getDate() === end.getDate();

      const endMin = sameDay ? minutesOfDay(end) : 24 * 60;
      totalHours += businessHoursInDay(startMin, endMin);
    }

    // Avançar para o início do próximo dia
    current = nextDay(current);
    current.setHours(0, 0, 0, 0);
  }

  return Math.round(totalHours * 1e10) / 1e10; // Evitar erros de ponto flutuante
}

/**
 * Adiciona um número de horas úteis a uma data.
 * Se a data está fora do horário útil, começa do próximo horário útil.
 *
 * @param start Data inicial
 * @param hours Horas úteis a adicionar (deve ser >= 0)
 * @returns Nova data após adicionar as horas úteis
 */
export function addBusinessHours(start: Date, hours: number): Date {
  if (hours <= 0) return new Date(start);

  // Normalizar para o próximo horário útil se necessário
  let current = nextBusinessHourStart(start);
  let remaining = hours;

  while (remaining > 0) {
    const mins = minutesOfDay(current);

    // Determinar em qual período estamos e quanto tempo resta nele
    let periodEndMin: number;
    let nextPeriodStart: Date;

    if (mins >= MORNING_START_MIN && mins < MORNING_END_MIN) {
      // Estamos na manhã
      periodEndMin = MORNING_END_MIN;
      nextPeriodStart = setTime(
        current,
        AFTERNOON_START.hour,
        AFTERNOON_START.minute,
      );
    } else if (mins >= AFTERNOON_START_MIN && mins < AFTERNOON_END_MIN) {
      // Estamos na tarde
      periodEndMin = AFTERNOON_END_MIN;
      // Próximo período = manhã do próximo dia útil
      const nd = nextDay(current);
      nd.setHours(MORNING_START.hour, MORNING_START.minute, 0, 0);
      while (!isBusinessDay(nd)) {
        nd.setDate(nd.getDate() + 1);
      }
      nextPeriodStart = nd;
    } else {
      // Fora do horário — avançar (não deveria acontecer após nextBusinessHourStart)
      current = nextBusinessHourStart(current);
      continue;
    }

    const availableMinutes = periodEndMin - mins;
    const availableHours = availableMinutes / 60;

    if (remaining <= availableHours) {
      // Cabe neste período
      const resultMs = current.getTime() + remaining * MS_PER_HOUR;
      return new Date(resultMs);
    }

    // Consome o período inteiro e avança
    remaining -= availableHours;
    current = nextPeriodStart;
  }

  return current;
}

// ============================================================
// Exportação de constantes (para uso em testes)
// ============================================================

export {
  MORNING_START,
  MORNING_END,
  AFTERNOON_START,
  AFTERNOON_END,
  HOURS_PER_DAY,
};
