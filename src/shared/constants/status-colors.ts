/**
 * Centralized status color mapping for all Azure DevOps / local task statuses.
 *
 * Colors follow the development lifecycle progression:
 *
 *   🔵 Planejamento (blues)        — Novo, Em classificação, Backlog Comprometido, Em levantamento
 *   🟡 Preparação (amber/yellow)   — Preparando para Dev, Aguardando validação, Em validação
 *   🟠 Desenvolvimento (orange)    — Em desenvolvimento, Em andamento
 *   🟣 Qualidade (purples)         — Aguardando auditoria, Em auditoria
 *   💜 Homologação (deep purple)   — Aguardando homologação, Em homologação
 *   🩵 Implantação (teal)          — Aguardando implantação, Em implantação
 *   🟢 Concluído (green)           — Finalizado, Done, Closed, Resolved
 *   🔴 Cancelado (red)             — Cancelado, Removed, Cut
 */

// ── Per-status hex colors ──────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  // ── Planejamento (blues) ──
  'Novo':                    '#42A5F5', // blue 400
  'New':                     '#42A5F5',
  'Em classificação':        '#5C6BC0', // indigo 400
  'Backlog Comprometido':    '#1E88E5', // blue 600
  'Em levantamento':         '#29B6F6', // light blue 400

  // ── Preparação (amber / yellow) ──
  'Preparando para Dev':     '#FFA726', // orange 400
  'Aguardando validação':    '#FFCA28', // amber 400
  'Em validação':            '#FFB300', // amber 600

  // ── Desenvolvimento (deep orange) ──
  'Em desenvolvimento':      '#FF7043', // deep orange 400
  'Em andamento':            '#FF7043',
  'Em Andamento':            '#FF7043',
  'Active':                  '#FF7043',
  'In Progress':             '#FF7043',
  'Committed':               '#FF7043',

  // ── Qualidade / Auditoria (purple) ──
  'Aguardando auditoria':    '#CE93D8', // purple 200
  'Aguardando Auditoria':    '#CE93D8',
  'Em auditoria':            '#AB47BC', // purple 400
  'Em Auditoria':            '#AB47BC',

  // ── Homologação (deep purple) ──
  'Aguardando homologação':  '#9575CD', // deep purple 300
  'Aguardando Homologação':  '#9575CD',
  'Em homologação':          '#7E57C2', // deep purple 400
  'Em Homologação':          '#7E57C2',

  // ── Implantação (teal) ──
  'Aguardando implantação':  '#4DB6AC', // teal 300
  'Aguardando Implantação':  '#4DB6AC',
  'Em implantação':          '#26A69A', // teal 400
  'Em Implantação':          '#26A69A',

  // ── Concluído (green) ──
  'Finalizado':              '#66BB6A', // green 400
  'Done':                    '#66BB6A',
  'Closed':                  '#66BB6A',
  'Resolved':                '#66BB6A',
  'completed':               '#66BB6A',

  // ── Cancelado (red) ──
  'Cancelado':               '#EF5350', // red 400
  'Removed':                 '#EF5350',
  'Cut':                     '#EF5350',
  'cancelled':               '#EF5350',

  // ── Legacy internal statuses ──
  'pending':                 '#42A5F5',
  'in_progress':             '#FF7043',
};

export const DEFAULT_STATUS_COLOR = '#78909C'; // blue-grey 400

/**
 * Get the color for a given status string.
 * Tries exact match first, then case-insensitive match.
 */
export function getStatusColor(status: string): string {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status];

  // Case-insensitive fallback
  const lower = status.toLowerCase();
  for (const [key, color] of Object.entries(STATUS_COLORS)) {
    if (key.toLowerCase() === lower) return color;
  }

  return DEFAULT_STATUS_COLOR;
}
