/**
 * Shared utility for formatting and grouping Sustentação items into a priority list.
 *
 * Used by:
 *  - handleCopyPriorityList (lane copy button)
 *  - CopySelectionModal (selection modal copy + PNG)
 *
 * Output structure:
 *  1. Com prioridade/SLA  — items with any effective deadline (terminus or priorização)
 *  2. Sem prioridade      — no deadline, correctly allocated (role matches status)
 *  3. Aguardando alocação — no deadline, unallocated or wrong-role for the status
 *
 * Blocking (impedimento) does NOT affect position — it's shown inline as a label.
 */

import type { SustentacaoItemWithSLA } from '@shared/interfaces/config/index.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const AZURE_BASE =
  'https://dev.azure.com/senaisc-solucoes-digitais/Tribo%20SEIF/_workitems/edit/';

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildAzureUrl(id: string | number): string {
  return `${AZURE_BASE}${id}/`;
}

export function isGestaoArea(areaPath?: string): boolean {
  return !!areaPath?.includes('Gestão de Terceiros');
}

export function areaTagLabel(areaPath?: string): string {
  return isGestaoArea(areaPath) ? '[Gestão]' : '[Chamada]';
}

/** Effective deadline ms for sort: expirationDate > localPriorityDeadline > localPriorityCreatedAt */
export function effectiveDeadlineMs(item: SustentacaoItemWithSLA): number {
  if (item.expirationDate) return new Date(item.expirationDate).getTime();
  if (item.localPriorityDeadline)
    return new Date(item.localPriorityDeadline).getTime();
  if (item.localPriorityCreatedAt)
    return new Date(item.localPriorityCreatedAt).getTime();
  return Infinity;
}

export function hasPriorityDate(item: SustentacaoItemWithSLA): boolean {
  return effectiveDeadlineMs(item) !== Infinity;
}

/** Is the task unallocated: no assignee, or position doesn't allow the task's status */
export function isUnallocated(
  task: SustentacaoItemWithSLA['task'],
  positionMap: Map<string, string[]>,
): boolean {
  if (!task.assignedToName) return true;
  if (!task.assignedToEmail || !task.status) return false;
  const allowed = positionMap.get(task.assignedToEmail.toLowerCase());
  if (!allowed || allowed.length === 0) return false;
  return !allowed.includes(task.status.toLowerCase());
}

/** Sort weight for unprioritized items: Ticket GT=0, Ticket CT=1, Improvement GT=2, Improvement CT=3 */
export function typeAreaWeight(item: SustentacaoItemWithSLA): number {
  const gt = isGestaoArea(item.task.areaPath);
  const isTicket = item.task.type === 'Ticket';
  if (isTicket && gt) return 0;
  if (isTicket && !gt) return 1;
  if (!isTicket && gt) return 2;
  return 3;
}

// ── Format helpers ─────────────────────────────────────────────────────────────

export function formatDateInfoLine(
  item: SustentacaoItemWithSLA,
  html: boolean,
): string {
  if (item.expirationDate) {
    const d = new Date(item.expirationDate);
    const label = item.slaViolated ? 'Término (vencido)' : 'Término';
    if (html) {
      const color = item.slaViolated ? '#DC2626' : '#0369A1';
      return ` | <span style="color:${color};">${label}: ${d.toLocaleDateString('pt-BR')}</span>`;
    }
    return ` | ${label}: ${d.toLocaleDateString('pt-BR')}`;
  }
  if (item.localPriority > 0) {
    const dateStr = item.localPriorityDeadline ?? item.localPriorityCreatedAt;
    if (dateStr) {
      const d = new Date(dateStr);
      if (html)
        return ` | <span style="color:#7C3AED;">Priorizado para: ${d.toLocaleDateString('pt-BR')}</span>`;
      return ` | Priorizado para: ${d.toLocaleDateString('pt-BR')}`;
    }
  }
  return '';
}

export function formatBlockedInfoLine(
  item: SustentacaoItemWithSLA,
  html: boolean,
): string {
  const t = item.task;
  if (!t.isBlocked) return '';
  const motivo = t.blockedReason ? `: ${t.blockedReason}` : '';
  if (html)
    return ` | <span style="color:#DC2626;font-weight:700;">Impedimento${motivo}</span>`;
  return ` | Impedimento${motivo}`;
}

export function formatLaneWarningLine(
  laneLabel: string,
  html: boolean,
): string {
  if (html)
    return ` | <span style="color:#D97706;font-weight:600;">⚠ ${laneLabel}</span>`;
  return ` | ⚠ ${laneLabel}`;
}

/**
 * Format a single item line for the priority list.
 * @param item        The item to format
 * @param idx         1-based counter
 * @param html        true = HTML output, false = plain text
 * @param laneWarning Optional lane label for cross-lane items (e.g. "Desenvolvimento")
 */
export function formatPriorityLine(
  item: SustentacaoItemWithSLA,
  idx: number,
  html: boolean,
  laneWarning?: string,
): string {
  const t = item.task;
  const id = t.externalId ?? String(t.id);
  const url = buildAzureUrl(id);
  const tag = areaTagLabel(t.areaPath);
  const tagPart = html
    ? ` <span style="color:#64748B;font-size:0.8em;">${tag}</span>`
    : ` ${tag}`;
  const warning = laneWarning ? formatLaneWarningLine(laneWarning, html) : '';

  return (
    `${idx}.${tagPart} ` +
    (html ? `<b><a href="${url}">#${id}</a></b>` : `#${id} (${url})`) +
    ` - ${t.type}` +
    formatDateInfoLine(item, html) +
    formatBlockedInfoLine(item, html) +
    warning
  );
}

// ── Sort ──────────────────────────────────────────────────────────────────────

/** Sort unprioritized items: Ticket GT → Ticket CT → Improvement GT → Improvement CT */
export function sortUnprioritized(
  arr: SustentacaoItemWithSLA[],
): SustentacaoItemWithSLA[] {
  return [...arr].sort((a, b) => typeAreaWeight(a) - typeAreaWeight(b));
}

// ── Output builder ────────────────────────────────────────────────────────────

export interface BuildPriorityListOptions {
  title: string;
  items: SustentacaoItemWithSLA[];
  positionMap: Map<string, string[]>;
  /** Optional map of item key → lane label for cross-lane warnings (CopySelectionModal) */
  laneWarningMap?: Map<string, string>;
  /** Starting counter (default 1) */
  counterStart?: number;
  /** Whether to include the timestamp footer (default true) */
  includeTimestamp?: boolean;
}

export interface BuildPriorityListResult {
  htmlLines: string[];
  textLines: string[];
  finalCounter: number;
}

/**
 * Builds the HTML and plain-text lines for a priority list.
 *
 * Structure:
 *  {title} - Ordem de Prioridade
 *
 *  Com prioridade/SLA (N)
 *  1. [Gestão] #XXXXX - Ticket | Término: dd/mm/aaaa
 *  ...
 *
 *  Sem prioridade (N)
 *  ...
 *
 *  Aguardando alocação (N)
 *  ...
 *
 *  Atualizado: dd/mm/aaaa: HH:MM
 */
export function buildPriorityList({
  title,
  items,
  positionMap,
  laneWarningMap = new Map(),
  counterStart = 1,
  includeTimestamp = true,
}: BuildPriorityListOptions): BuildPriorityListResult {
  const htmlLines: string[] = [];
  const textLines: string[] = [];
  let counter = counterStart;

  htmlLines.push(`<b>${title} - Ordem de Prioridade</b><br/><br/>`);
  textLines.push(`${title} - Ordem de Prioridade`, '');

  if (items.length === 0) {
    htmlLines.push(
      `<span style="color:#64748B;">Nenhuma tarefa encontrada.</span>`,
    );
    textLines.push('Nenhuma tarefa encontrada.');
  } else {
    // Split: priority vs no-priority
    const withPrio = items.filter(hasPriorityDate);
    const withoutPrioAll = items.filter((i) => !hasPriorityDate(i));

    // No-priority: allocated vs unallocated
    const semPrio = sortUnprioritized(
      withoutPrioAll.filter((i) => !isUnallocated(i.task, positionMap)),
    );
    const aguardando = sortUnprioritized(
      withoutPrioAll.filter((i) => isUnallocated(i.task, positionMap)),
    );

    const appendGroup = (
      groupItems: SustentacaoItemWithSLA[],
      label: string,
    ) => {
      if (groupItems.length === 0) return;
      htmlLines.push(`<b>${label} (${groupItems.length})</b><br/>`);
      textLines.push(`${label} (${groupItems.length})`);
      groupItems.forEach((item) => {
        const key = item.task.externalId ?? String(item.task.id);
        const laneWarning = laneWarningMap.get(key);
        htmlLines.push(
          formatPriorityLine(item, counter, true, laneWarning) + '<br/>',
        );
        textLines.push(formatPriorityLine(item, counter, false, laneWarning));
        counter++;
      });
      htmlLines.push('<br/>');
      textLines.push('');
    };

    appendGroup(withPrio, 'Com prioridade/SLA');
    appendGroup(semPrio, 'Sem prioridade');
    appendGroup(aguardando, 'Aguardando alocação');
  }

  if (includeTimestamp) {
    const now = new Date();
    const stamp = `${now.toLocaleDateString('pt-BR')}: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    htmlLines.push(
      `<span style="color:#94A3B8;font-size:0.8em;">Atualizado: ${stamp}</span>`,
    );
    textLines.push(`Atualizado: ${stamp}`);
  }

  return { htmlLines, textLines, finalCounter: counter };
}

/** Writes built lines to the clipboard (HTML + plain text fallback) */
export function copyToClipboard(
  htmlLines: string[],
  textLines: string[],
): void {
  const htmlStr = htmlLines.join('');
  const textStr = textLines.join('\n');

  const blob = new Blob([htmlStr], { type: 'text/html' });
  const textBlob = new Blob([textStr], { type: 'text/plain' });
  const clipItem = new ClipboardItem({
    'text/html': blob,
    'text/plain': textBlob,
  });
  navigator.clipboard.write([clipItem]).catch(() => {
    navigator.clipboard.writeText(textStr).catch(() => {});
  });
}
