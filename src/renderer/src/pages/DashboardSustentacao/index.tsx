import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  Refresh as RefreshIcon,
  TimerOff as TimerOffIcon,
  Timer as TimerIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  ContentCopy as CopyIcon,
  CopyAll as CopyAllIcon,
  WarningAmber as WarningIcon,
  PictureAsPdf as PdfIcon,
  ConfirmationNumber as TicketIcon,
  Build as ImprovementIcon,
  ErrorOutline as ViolatedIcon,
  PersonOff as UnassignedIcon,
  AccessTime as AvgTimeIcon,
  CheckCircleOutline as ClosedIcon,
  HourglassTop as OldestIcon,
  InfoOutlined as InfoIcon,
  FormatListNumbered as SlaOrderIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';
import { SlaOrderModal } from '@renderer/components/SlaOrderModal';
import { useSyncRefresh } from '@renderer/hooks/useSyncRefresh';
import type {
  SustentacaoItemWithSLA,
  SustentacaoMetrics,
} from '@shared/interfaces/config/index.types';
import type { Task } from '@shared/interfaces/config/index.types';

// ── constants ──

const PRIO_LABEL: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};
const PRIO_COLOR: Record<string, string> = {
  critical: '#9333EA',
  high: '#DC2626',
  medium: '#2563EB',
  low: '#64748B',
};
const PRIO_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const AREA_GESTAO = 'Tribo SEIF\\Sustentação\\Gestão de Terceiros';

/** Statuses that belong to the "Desenvolvimento" lane */
const DEV_STATUSES = new Set([
  'Em Desenvolvimento',
  'Em desenvolvimento',
  'Preparando para Dev',
  'Preparando para dev',
]);

/** Statuses that belong to the "Auditoria" lane */
const AUDIT_STATUSES = new Set([
  'Aguardando Auditoria',
  'Aguardando auditoria',
  'Em Auditoria',
  'Em auditoria',
]);

/** Statuses that belong to the "Análise" lane (pre-development) */
const ANALYSIS_STATUSES = new Set([
  'Em classificação',
  'Em Classificação',
  'Backlog Comprometido',
  'Backlog comprometido',
  'Em levantamento',
  'Em Levantamento',
  'Aguardando validação',
  'Aguardando Validação',
  'Em validação',
  'Em Validação',
]);

// ── helpers ──

function isGestao(areaPath?: string): boolean {
  return areaPath?.startsWith(AREA_GESTAO) ?? false;
}
function areaLabel(areaPath?: string): string {
  return isGestao(areaPath) ? 'Gestão de Terceiros' : 'Chamada Tecnológica';
}

/** Sort weight: Ticket GT=0, Improvement GT=1, Ticket CT=2, Improvement CT=3 */
function typeAreaWeight(item: SustentacaoItemWithSLA): number {
  const gt = isGestao(item.task.areaPath);
  const isTicket = item.task.type === 'Ticket';
  if (gt && isTicket) return 0;
  if (gt && !isTicket) return 1;
  if (!gt && isTicket) return 2;
  return 3;
}

function dashboardSort(
  a: SustentacaoItemWithSLA,
  b: SustentacaoItemWithSLA,
): number {
  const aIsTicket = a.task.type === 'Ticket';
  const bIsTicket = b.task.type === 'Ticket';
  const aHasActiveSla = aIsTicket && !a.slaExcluded;
  const bHasActiveSla = bIsTicket && !b.slaExcluded;

  // 1. Tickets with active SLA go to the very top, sorted by remaining hours ASC
  if (aHasActiveSla && !bHasActiveSla) return -1;
  if (!aHasActiveSla && bHasActiveSla) return 1;
  if (aHasActiveSla && bHasActiveSla) {
    return a.businessHoursRemaining - b.businessHoursRemaining;
  }

  // 2. For items without active SLA: original rule
  //    GT Ticket(0) > GT Improvement(1) > CT Ticket(2) > CT Improvement(3)
  //    then by priority, then by remaining hours
  const wa = typeAreaWeight(a);
  const wb = typeAreaWeight(b);
  if (wa !== wb) return wa - wb;
  const pa = PRIO_ORDER[a.task.priority] ?? 99;
  const pb = PRIO_ORDER[b.task.priority] ?? 99;
  if (pa !== pb) return pa - pb;
  return 0;
}

function formatSlaRemaining(hours: number): string {
  if (hours <= 0) return 'Estourado';
  const d = Math.floor(hours / 8);
  const h = Math.round(hours % 8);
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function formatSlaDelay(hours: number): string {
  const overdue = Math.abs(hours);
  const d = Math.floor(overdue / 8);
  const h = Math.round(overdue % 8);
  if (d > 0 && h > 0) return `${d}d ${h}h atraso`;
  if (d > 0) return `${d}d atraso`;
  return `${h}h atraso`;
}

function slaChipColor(
  item: SustentacaoItemWithSLA,
): 'error' | 'warning' | 'info' | 'default' {
  if (item.slaExcluded) return 'default';
  if (item.slaViolated) return 'error';
  if (item.slaWarning) return 'warning';
  if (
    !item.slaViolated &&
    item.businessHoursRemaining <= 8 &&
    item.businessHoursRemaining > 0
  )
    return 'warning';
  return 'info';
}

// ── PDF export (captures rendered HTML table) ──

async function exportToPdf(
  items: SustentacaoItemWithSLA[],
  title: string,
  showHidden: boolean,
  positionMap: Map<string, string[]>,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const visible = showHidden ? items : items.filter((i) => !i.isHidden);
  if (visible.length === 0) return;

  // Group by area
  const gestaoItems = visible.filter((i) => isGestao(i.task.areaPath));
  const ctItems = visible.filter((i) => !isGestao(i.task.areaPath));

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // ── Build row HTML for a single item ──
  const buildRow = (item: SustentacaoItemWithSLA, idx: number) => {
    const t = item.task;
    // Priority always in Portuguese
    const prio = PRIO_LABEL[t.priority] ?? t.priority;
    const prioColor = PRIO_COLOR[t.priority] ?? '#64748B';
    const isTicket = t.type === 'Ticket';

    // Check if assignee has wrong position for this status
    const isWrongPosition = (() => {
      if (!t.assignedToName || !t.assignedToEmail || !t.status) return false;
      const allowed = positionMap.get(t.assignedToEmail.toLowerCase());
      if (!allowed || allowed.length === 0) return false;
      return !allowed.includes(t.status.toLowerCase());
    })();
    const noAssignee = !t.assignedToName || isWrongPosition;

    let slaHtml = '<span style="color:#94A3B8;">—</span>';
    if (isTicket) {
      if (item.slaExcluded) {
        slaHtml = '<span style="color:#94A3B8;font-size:9px;">Excluído</span>';
      } else if (item.slaViolated) {
        slaHtml = `<span style="color:#DC2626;font-weight:700;font-size:10px;">${formatSlaDelay(item.businessHoursRemaining)}</span>`;
        if (item.expirationDate) {
          const d = new Date(item.expirationDate);
          slaHtml += `<br/><span style="font-size:8px;color:#DC2626;">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
        }
      } else {
        const slaColor = item.slaWarning ? '#D97706' : '#16A34A';
        slaHtml = `<span style="color:${slaColor};font-weight:600;font-size:10px;">${formatSlaRemaining(item.businessHoursRemaining)}</span>`;
        if (item.expirationDate) {
          const d = new Date(item.expirationDate);
          slaHtml += `<br/><span style="font-size:8px;color:${slaColor};">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
        }
      }
    }

    const typeColor = isTicket ? '#16A34A' : '#7C3AED';
    const bgColor = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';

    return `<tr style="background:${bgColor};">
      <td style="padding:8px 12px;vertical-align:middle;text-align:center;font-weight:700;color:#94A3B8;font-size:10px;width:32px;">${idx + 1}</td>
      <td style="padding:8px 10px;vertical-align:middle;width:70px;">
        <span style="color:#0F172A;font-weight:700;font-size:11px;">#${t.externalId ?? t.id}</span>
      </td>
      <td style="padding:8px 10px;vertical-align:middle;text-align:center;width:90px;">
        <span style="display:inline-block;padding:3px 10px;background:${typeColor};color:#fff;border-radius:10px;font-size:9px;font-weight:700;letter-spacing:0.3px;line-height:14px;">${t.type}</span>
      </td>
      <td style="padding:8px 10px;vertical-align:middle;text-align:center;width:70px;">
        <span style="display:inline-block;padding:3px 10px;background:${prioColor};color:#fff;border-radius:10px;font-size:9px;font-weight:700;line-height:14px;">${prio}</span>
      </td>
      <td style="padding:8px 10px;vertical-align:middle;">
        <span style="font-size:10px;color:#1E293B;line-height:1.4;">${t.title}</span>
      </td>
      <td style="padding:8px 10px;vertical-align:middle;text-align:center;width:120px;">
        <span style="display:inline-block;padding:3px 10px;background:#F1F5F9;border-radius:10px;font-size:9px;color:#334155;font-weight:600;line-height:14px;">${t.status}</span>
      </td>
      <td style="padding:8px 10px;vertical-align:middle;width:140px;${noAssignee ? 'color:#D97706;font-weight:700;' : 'color:#334155;'}font-size:10px;">
        ${noAssignee ? 'Sem responsável' : t.assignedToName}
      </td>
      <td style="padding:8px 10px;vertical-align:middle;width:90px;text-align:center;">${slaHtml}</td>
    </tr>`;
  };

  // ── Build section HTML for an area group ──
  const buildSection = (
    sectionTitle: string,
    sectionItems: SustentacaoItemWithSLA[],
    accentColor: string,
    bgTint: string,
    startIdx: number,
  ) => {
    if (sectionItems.length === 0) return '';

    const ticketCount = sectionItems.filter(
      (i) => i.task.type === 'Ticket',
    ).length;
    const improvementCount = sectionItems.length - ticketCount;
    const violatedCount = sectionItems.filter(
      (i) => i.task.type === 'Ticket' && !i.slaExcluded && i.slaViolated,
    ).length;

    return `
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px 16px;background:${bgTint};border-left:4px solid ${accentColor};border-radius:0 8px 8px 0;">
          <span style="font-size:13px;font-weight:700;color:${accentColor};">${sectionTitle}</span>
          <span style="font-size:10px;color:#64748B;font-weight:600;">${sectionItems.length} itens</span>
          <span style="font-size:9px;padding:3px 10px;background:#16A34A;color:#fff;border-radius:10px;font-weight:600;">${ticketCount} Tickets</span>
          <span style="font-size:9px;padding:3px 10px;background:#7C3AED;color:#fff;border-radius:10px;font-weight:600;">${improvementCount} Improvements</span>
          ${violatedCount > 0 ? `<span style="font-size:9px;padding:3px 10px;background:#DC2626;color:#fff;border-radius:10px;font-weight:700;">${violatedCount} SLA estourado</span>` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;font-family:Montserrat,Roboto,Arial,sans-serif;">
          <thead>
            <tr>
              <th style="padding:8px 12px;text-align:center;font-size:8px;color:#94A3B8;font-weight:700;width:32px;text-transform:uppercase;letter-spacing:0.5px;">#</th>
              <th style="padding:8px 10px;text-align:left;font-size:8px;color:#94A3B8;font-weight:700;width:70px;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
              <th style="padding:8px 10px;text-align:center;font-size:8px;color:#94A3B8;font-weight:700;width:90px;text-transform:uppercase;letter-spacing:0.5px;">Tipo</th>
              <th style="padding:8px 10px;text-align:center;font-size:8px;color:#94A3B8;font-weight:700;width:70px;text-transform:uppercase;letter-spacing:0.5px;">Prioridade</th>
              <th style="padding:8px 10px;text-align:left;font-size:8px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Título</th>
              <th style="padding:8px 10px;text-align:center;font-size:8px;color:#94A3B8;font-weight:700;width:120px;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
              <th style="padding:8px 10px;text-align:left;font-size:8px;color:#94A3B8;font-weight:700;width:140px;text-transform:uppercase;letter-spacing:0.5px;">Responsável</th>
              <th style="padding:8px 10px;text-align:center;font-size:8px;color:#94A3B8;font-weight:700;width:90px;text-transform:uppercase;letter-spacing:0.5px;">SLA</th>
            </tr>
          </thead>
          <tbody>
            ${sectionItems.map((item, idx) => buildRow(item, startIdx + idx)).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  // ── Assemble full document ──
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1120px;background:#fff;padding:0;font-family:Montserrat,Roboto,Arial,sans-serif;';

  const totalTickets = visible.filter((i) => i.task.type === 'Ticket').length;
  const totalImprovements = visible.length - totalTickets;
  const totalViolated = visible.filter(
    (i) => i.task.type === 'Ticket' && !i.slaExcluded && i.slaViolated,
  ).length;
  const totalWarning = visible.filter(
    (i) =>
      i.task.type === 'Ticket' &&
      !i.slaExcluded &&
      !i.slaViolated &&
      i.slaWarning,
  ).length;

  container.innerHTML = `
    <div style="padding:12px 16px 8px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;">
        <div>
          <div style="font-size:20px;font-weight:800;color:#0F172A;letter-spacing:-0.3px;">${title}</div>
          <div style="font-size:10px;color:#94A3B8;margin-top:4px;">Gerado em ${dateStr} às ${timeStr} — Ordem de prioridade</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="text-align:center;padding:8px 16px;background:#F8FAFC;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#0F172A;">${visible.length}</div>
            <div style="font-size:7px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Total</div>
          </div>
          <div style="text-align:center;padding:8px 16px;background:#F0FDF4;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#16A34A;">${totalTickets}</div>
            <div style="font-size:7px;color:#16A34A;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Tickets</div>
          </div>
          <div style="text-align:center;padding:8px 16px;background:#F5F3FF;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#7C3AED;">${totalImprovements}</div>
            <div style="font-size:7px;color:#7C3AED;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Improvements</div>
          </div>
          ${
            totalViolated > 0
              ? `<div style="text-align:center;padding:8px 16px;background:#FEF2F2;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#DC2626;">${totalViolated}</div>
            <div style="font-size:7px;color:#DC2626;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Estourados</div>
          </div>`
              : ''
          }
          ${
            totalWarning > 0
              ? `<div style="text-align:center;padding:8px 16px;background:#FFFBEB;border-radius:10px;">
            <div style="font-size:18px;font-weight:800;color:#D97706;">${totalWarning}</div>
            <div style="font-size:7px;color:#D97706;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Atenção</div>
          </div>`
              : ''
          }
        </div>
      </div>

      <!-- Sections by area -->
      ${buildSection('Gestão de Terceiros', gestaoItems, '#2563EB', '#EFF6FF', 0)}
      ${buildSection('Chamada Tecnológica', ctItems, '#DC2626', '#FEF2F2', gestaoItems.length)}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
    });
    const imgData = canvas.toDataURL('image/png');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 2;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= usableHeight) {
      doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas
      const pageCanvasHeight = (usableHeight / imgHeight) * canvas.height;
      let srcY = 0;
      let page = 0;

      while (srcY < canvas.height) {
        if (page > 0) doc.addPage();

        const sliceHeight = Math.min(pageCanvasHeight, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            srcY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight,
          );
        }

        const sliceData = sliceCanvas.toDataURL('image/png');
        const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
        doc.addImage(
          sliceData,
          'PNG',
          margin,
          margin,
          imgWidth,
          sliceImgHeight,
        );

        srcY += pageCanvasHeight;
        page++;
      }
    }

    doc.save(
      `${title.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`,
    );
  } finally {
    document.body.removeChild(container);
  }
}

// ── ItemRow (memo) ──

interface ItemRowProps {
  item: SustentacaoItemWithSLA;
  showAreaColumn: boolean;
  onToggleSla: (externalId: string, excluded: boolean) => void;
  onToggleHidden: (externalId: string, hidden: boolean) => void;
  onCopyLink: (externalId: string) => void;
  onRowClick: (task: Task) => void;
  positionMap: Map<string, string[]>;
  isBusy: boolean;
}

const ItemRow = memo(function ItemRow({
  item,
  showAreaColumn,
  onToggleSla,
  onToggleHidden,
  onCopyLink,
  onRowClick,
  positionMap,
  isBusy,
}: ItemRowProps) {
  const t = item.task;
  const prio = t.priority ?? 'medium';
  const prioLabel = PRIO_LABEL[prio] ?? prio;
  const prioColor = PRIO_COLOR[prio] ?? '#64748B';
  const isTicket = t.type === 'Ticket';
  const noAssignee = !t.assignedToName;

  // Check if item was created in the last 24 hours
  const isNew = useMemo(() => {
    const created = t.azureCreatedDate ?? t.createdAt;
    if (!created) return false;
    const createdMs = new Date(created).getTime();
    return Date.now() - createdMs < 24 * 60 * 60 * 1000;
  }, [t.azureCreatedDate, t.createdAt]);

  // Check if assignee's position allows this status
  const wrongPosition = useMemo(() => {
    if (noAssignee || !t.assignedToEmail || !t.status) return false;
    const allowed = positionMap.get(t.assignedToEmail.toLowerCase());
    if (!allowed || allowed.length === 0) return false; // no config = no alert
    return !allowed.includes(t.status.toLowerCase());
  }, [noAssignee, t.assignedToEmail, t.status, positionMap]);

  return (
    <TableRow
      sx={{
        opacity: item.isHidden ? 0.45 : 1,
        bgcolor: noAssignee
          ? 'rgba(255,152,0,0.06)'
          : wrongPosition
            ? 'rgba(255,152,0,0.06)'
            : undefined,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => onRowClick(t)}
    >
      {/* Item: ID + Tipo + Área + Prio empilhados verticalmente */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1 }}>
        <Stack spacing={0.4} alignItems="flex-start">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              #{t.externalId ?? t.id}
            </Typography>
            {isNew && (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  color: 'primary.main',
                  lineHeight: 1,
                }}
              >
                NOVO
              </Typography>
            )}
          </Stack>
          <WorkItemTypeChip type={t.type} />
          {showAreaColumn && (
            <Chip
              label={areaLabel(t.areaPath)}
              size="small"
              variant="filled"
              sx={{
                bgcolor: isGestao(t.areaPath) ? 'info.light' : 'error.light',
                color: isGestao(t.areaPath) ? 'info.dark' : 'error.dark',
              }}
            />
          )}
          <Tooltip title={`Azure Priority: ${t.azurePriority ?? '?'}`}>
            <Chip
              label={prioLabel}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: prioColor,
                color: '#fff',
              }}
            />
          </Tooltip>
        </Stack>
      </TableCell>

      {/* Título */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1 }}>
        <Typography
          variant="body2"
          sx={{ wordBreak: 'break-word', lineHeight: 1.4 }}
        >
          {t.title}
        </Typography>
      </TableCell>

      {/* Status */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1, whiteSpace: 'nowrap' }}>
        <Chip label={t.status} size="small" variant="outlined" />
      </TableCell>

      {/* Responsável */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          {noAssignee && (
            <Tooltip title="Sem responsável atribuído">
              <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            </Tooltip>
          )}
          {wrongPosition && (
            <Tooltip title="Responsável com cargo inadequado para este status">
              <WarningIcon sx={{ fontSize: 16, color: 'error.main' }} />
            </Tooltip>
          )}
          <Typography
            variant="body2"
            sx={{
              wordBreak: 'break-word',
              color: noAssignee || wrongPosition ? 'warning.main' : undefined,
              fontWeight: noAssignee || wrongPosition ? 700 : undefined,
            }}
          >
            {noAssignee || wrongPosition ? 'Sem responsável' : t.assignedToName}
          </Typography>
        </Stack>
      </TableCell>

      {/* SLA */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1, whiteSpace: 'nowrap' }}>
        {isTicket ? (
          item.slaExcluded ? (
            <Chip label="Excluído" size="small" variant="outlined" />
          ) : (
            <Stack spacing={0.3}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Chip
                  icon={item.slaViolated ? <TimerOffIcon /> : <TimerIcon />}
                  label={
                    item.slaViolated
                      ? formatSlaDelay(item.businessHoursRemaining)
                      : formatSlaRemaining(item.businessHoursRemaining)
                  }
                  size="small"
                  color={slaChipColor(item)}
                  variant={item.slaViolated ? 'filled' : 'outlined'}
                />
                {!item.slaViolated &&
                  item.businessHoursRemaining > 0 &&
                  item.businessHoursRemaining <= 8 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'warning.dark',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        lineHeight: 1,
                      }}
                    >
                      ⚠ Urgente
                    </Typography>
                  )}
              </Stack>
              {item.expirationDate && (
                <Typography
                  variant="caption"
                  sx={{
                    color: item.slaViolated
                      ? 'error.main'
                      : item.slaWarning
                        ? 'warning.main'
                        : 'text.secondary',
                    fontWeight: item.slaViolated ? 700 : 400,
                    fontSize: '0.7rem',
                  }}
                >
                  {item.slaViolated ? 'Limite: ' : ''}
                  {new Date(item.expirationDate).toLocaleDateString(
                    'pt-BR',
                  )}{' '}
                  {new Date(item.expirationDate).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              )}
            </Stack>
          )
        ) : (
          <Typography variant="caption" color="text.disabled">
            —
          </Typography>
        )}
      </TableCell>

      {/* Ações */}
      <TableCell
        sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle', py: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {isBusy ? (
          <CircularProgress size={20} sx={{ mx: 1 }} />
        ) : (
          <>
            {isTicket && (
              <Tooltip
                title={item.slaExcluded ? 'Restaurar SLA' : 'Excluir SLA'}
              >
                <IconButton
                  size="small"
                  onClick={() => onToggleSla(t.externalId!, item.slaExcluded!)}
                >
                  {item.slaExcluded ? (
                    <TimerIcon fontSize="small" />
                  ) : (
                    <TimerOffIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={item.isHidden ? 'Mostrar item' : 'Ocultar item'}>
              <IconButton
                size="small"
                onClick={() => onToggleHidden(t.externalId!, item.isHidden!)}
              >
                {item.isHidden ? (
                  <ShowIcon fontSize="small" />
                ) : (
                  <HideIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copiar link Azure">
              <IconButton
                size="small"
                onClick={() => onCopyLink(t.externalId!)}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </TableCell>
    </TableRow>
  );
});

// ── ItemTable (memo) ──

interface ItemTableProps {
  items: SustentacaoItemWithSLA[];
  showAreaColumn: boolean;
  showHidden: boolean;
  onToggleSla: (externalId: string, excluded: boolean) => void;
  onToggleHidden: (externalId: string, hidden: boolean) => void;
  onCopyLink: (externalId: string) => void;
  onRowClick: (task: Task) => void;
  positionMap: Map<string, string[]>;
  busyItems: Set<string>;
}

const INITIAL_RENDER_COUNT = 30;

const ItemTable = memo(function ItemTable({
  items,
  showAreaColumn,
  showHidden,
  onToggleSla,
  onToggleHidden,
  onCopyLink,
  onRowClick,
  positionMap,
  busyItems,
}: ItemTableProps) {
  const visible = showHidden ? items : items.filter((i) => !i.isHidden);
  const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);

  // Reset render count when items change
  useEffect(() => {
    setRenderCount(INITIAL_RENDER_COUNT);
  }, [visible.length]);

  // Progressively render remaining items
  useEffect(() => {
    if (renderCount >= visible.length) return;
    const timer = requestAnimationFrame(() => {
      setRenderCount((prev) => Math.min(prev + 30, visible.length));
    });
    return () => cancelAnimationFrame(timer);
  }, [renderCount, visible.length]);

  if (visible.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ py: 2, textAlign: 'center' }}
      >
        Nenhum item encontrado.
      </Typography>
    );
  }

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ maxHeight: 600 }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            <TableCell>Título</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Responsável</TableCell>
            <TableCell>SLA</TableCell>
            <TableCell>Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.slice(0, renderCount).map((item) => (
            <ItemRow
              key={item.task.externalId ?? item.task.id}
              item={item}
              showAreaColumn={showAreaColumn}
              onToggleSla={onToggleSla}
              onToggleHidden={onToggleHidden}
              onCopyLink={onCopyLink}
              onRowClick={onRowClick}
              positionMap={positionMap}
              isBusy={busyItems.has(item.task.externalId ?? '')}
            />
          ))}
          {renderCount < visible.length && (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: 'center', py: 1.5 }}>
                <CircularProgress size={20} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ── Metric Card ──

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  bgColor?: string;
  tooltip?: string;
}

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  color = '#2563EB',
  bgColor,
  tooltip,
}: MetricCardProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        minWidth: 0,
        height: '100%',
        bgcolor: bgColor,
        position: 'relative',
        borderRadius: 2,
      }}
    >
      {tooltip && (
        <Tooltip title={tooltip} arrow placement="top">
          <InfoIcon
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              fontSize: 15,
              color: 'text.disabled',
              cursor: 'help',
              '&:hover': { color: 'text.secondary' },
            }}
          />
        </Tooltip>
      )}
      <Box
        sx={{
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          width: 38,
          height: 38,
          borderRadius: '50%',
          bgcolor: `${color}14`,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, pr: 2 }}>
        <Typography variant="h6" fontWeight={700} lineHeight={1.2} noWrap>
          {value}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.3, display: 'block', wordBreak: 'break-word' }}
        >
          {label}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            display="block"
            color="text.disabled"
            sx={{
              lineHeight: 1.3,
              wordBreak: 'break-word',
              fontSize: '0.68rem',
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

function formatBusinessHours(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  const d = Math.floor(hours / 8);
  const h = Math.round(hours % 8);
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

// ── Main Component ──

export function DashboardSustentacaoPage() {
  const [items, setItems] = useState<SustentacaoItemWithSLA[]>([]);
  const [metrics, setMetrics] = useState<SustentacaoMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [includeAnalysis, setIncludeAnalysis] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [positionMap, setPositionMap] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [busyItems, setBusyItems] = useState<Set<string>>(new Set());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [slaOrderModal, setSlaOrderModal] = useState<{
    open: boolean;
    title: string;
    items: SustentacaoItemWithSLA[];
  }>({
    open: false,
    title: '',
    items: [],
  });

  const api = (
    window as unknown as {
      electronAPI: import('@shared/interfaces/config/index.types').CustomElectronAPI;
    }
  ).electronAPI;

  // ── fetch helpers ──

  /** Build the statuses array for metrics based on current includeAnalysis */
  const getMetricsStatuses = useCallback(
    (withAnalysis: boolean) => [
      ...DEV_STATUSES,
      ...AUDIT_STATUSES,
      ...(withAnalysis ? ANALYSIS_STATUSES : []),
    ],
    [],
  );

  /** Full initial load — shows full-screen spinner */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, membersRes, metricsRes] = await Promise.all([
        api.dashboard.getSustentacaoItems(),
        api.teamMember.findAll(),
        api.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(includeAnalysis),
        ),
      ]);
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error ?? 'Erro ao carregar itens');
      }
      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (membersRes.success && membersRes.data) {
        const map = new Map<string, string[]>();
        for (const m of membersRes.data) {
          if (m.email && (m.position as any)?.allowedStatuses) {
            const statuses = ((m.position as any).allowedStatuses as string)
              .split(',')
              .map((s: string) => s.trim().toLowerCase())
              .filter(Boolean);
            map.set(m.email.toLowerCase(), statuses);
          }
        }
        setPositionMap(map);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Background refresh — no full-screen spinner, silently updates data */
  const refreshData = useCallback(async () => {
    try {
      const [res, metricsRes] = await Promise.all([
        api.dashboard.getSustentacaoItems(),
        api.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(includeAnalysis),
        ),
      ]);
      if (res.success && res.data) setItems(res.data);
      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    } catch {
      /* silent */
    }
  }, [includeAnalysis, getMetricsStatuses]);

  /** Metrics-only refresh — shows loading only on cards */
  const refreshMetrics = useCallback(
    async (withAnalysis: boolean) => {
      setMetricsLoading(true);
      try {
        const res = await api.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(withAnalysis),
        );
        if (res.success && res.data) setMetrics(res.data);
      } catch {
        /* silent */
      } finally {
        setMetricsLoading(false);
      }
    },
    [getMetricsStatuses],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data automatically when sync completes
  useSyncRefresh(refreshData);

  // When includeAnalysis changes, only reload metrics (not the whole page)
  const isFirstRender = useMemo(() => ({ current: true }), []);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    refreshMetrics(includeAnalysis);
  }, [includeAnalysis, refreshMetrics]);

  // ── actions ──
  const handleToggleSla = useCallback(
    async (externalId: string, excluded: boolean) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.task.externalId === externalId
            ? { ...i, slaExcluded: !excluded }
            : i,
        ),
      );
      setBusyItems((prev) => new Set(prev).add(externalId));
      try {
        if (excluded) {
          await api.dashboard.restoreSla(externalId);
        } else {
          await api.dashboard.excludeSla(externalId);
        }
        await refreshData();
      } catch {
        // Revert on error
        setItems((prev) =>
          prev.map((i) =>
            i.task.externalId === externalId
              ? { ...i, slaExcluded: excluded }
              : i,
          ),
        );
      } finally {
        setBusyItems((prev) => {
          const next = new Set(prev);
          next.delete(externalId);
          return next;
        });
      }
    },
    [refreshData],
  );

  const handleToggleHidden = useCallback(
    async (externalId: string, hidden: boolean) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.task.externalId === externalId ? { ...i, isHidden: !hidden } : i,
        ),
      );
      setBusyItems((prev) => new Set(prev).add(externalId));
      try {
        if (hidden) {
          await api.dashboard.unhideItem(externalId);
        } else {
          await api.dashboard.hideItem(externalId);
        }
        await refreshData();
      } catch {
        // Revert on error
        setItems((prev) =>
          prev.map((i) =>
            i.task.externalId === externalId ? { ...i, isHidden: hidden } : i,
          ),
        );
      } finally {
        setBusyItems((prev) => {
          const next = new Set(prev);
          next.delete(externalId);
          return next;
        });
      }
    },
    [refreshData],
  );

  const handleCopyLink = useCallback((externalId: string) => {
    const url = `https://dev.azure.com/senaisc-solucoes-digitais/Tribo%20SEIF/_workitems/edit/${externalId}/`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, []);

  const handleCopyPriorityList = useCallback(
    (sectionItems: SustentacaoItemWithSLA[], sectionTitle: string) => {
      const visible = showHidden
        ? sectionItems
        : sectionItems.filter((i) => !i.isHidden);

      if (visible.length === 0) {
        const html = `<b>${sectionTitle}</b><br/><br/><span style="color:#64748B;">Nenhuma tarefa encontrada nesta etapa.</span>`;
        const text = `${sectionTitle}\n\nNenhuma tarefa encontrada nesta etapa.`;
        const blob = new Blob([html], { type: 'text/html' });
        const textBlob = new Blob([text], { type: 'text/plain' });
        const emptyItem = new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        });
        navigator.clipboard.write([emptyItem]).catch(() => {
          navigator.clipboard.writeText(text).catch(() => {});
        });
        return;
      }

      const buildUrl = (id: string | number) =>
        `https://dev.azure.com/senaisc-solucoes-digitais/Tribo%20SEIF/_workitems/edit/${id}/`;

      const gestaoItems = visible.filter((i) => isGestao(i.task.areaPath));
      const ctItems = visible.filter((i) => !isGestao(i.task.areaPath));

      const isWrongPosition = (t: Task) => {
        if (!t.assignedToName || !t.assignedToEmail || !t.status) return false;
        const allowed = positionMap.get(t.assignedToEmail.toLowerCase());
        if (!allowed || allowed.length === 0) return false;
        return !allowed.includes(t.status.toLowerCase());
      };

      const formatItemHtml = (item: SustentacaoItemWithSLA, idx: number) => {
        const t = item.task;
        const id = t.externalId ?? String(t.id);
        const url = buildUrl(id);
        const prio = PRIO_LABEL[t.priority] ?? t.priority;
        const responsavel =
          !t.assignedToName || isWrongPosition(t)
            ? 'Sem responsável'
            : t.assignedToName;

        let sla = '';
        if (t.type === 'Ticket' && !item.slaExcluded) {
          if (item.slaViolated) {
            sla = ` | SLA: ${formatSlaDelay(item.businessHoursRemaining)}`;
          } else {
            sla = ` | SLA: ${formatSlaRemaining(item.businessHoursRemaining)} restante`;
          }
        }

        return `${idx + 1}. <b><a href="${url}">#${id}</a></b> - ${t.type} | ${prio} | ${responsavel}${sla}`;
      };

      const formatItemText = (item: SustentacaoItemWithSLA, idx: number) => {
        const t = item.task;
        const id = t.externalId ?? String(t.id);
        const url = buildUrl(id);
        const prio = PRIO_LABEL[t.priority] ?? t.priority;
        const responsavel =
          !t.assignedToName || isWrongPosition(t)
            ? 'Sem responsável'
            : t.assignedToName;

        let sla = '';
        if (t.type === 'Ticket' && !item.slaExcluded) {
          if (item.slaViolated) {
            sla = ` | SLA: ${formatSlaDelay(item.businessHoursRemaining)}`;
          } else {
            sla = ` | SLA: ${formatSlaRemaining(item.businessHoursRemaining)} restante`;
          }
        }

        return `${idx + 1}. #${id} (${url}) - ${t.type} | ${prio} | ${responsavel}${sla}`;
      };

      const htmlLines: string[] = [];
      const textLines: string[] = [];

      htmlLines.push(`<b>${sectionTitle} - Ordem de Prioridade</b><br/><br/>`);
      textLines.push(`${sectionTitle} - Ordem de Prioridade`, '');

      let counter = 0;

      if (gestaoItems.length > 0) {
        htmlLines.push(
          `<b>Gestão de Terceiros (${gestaoItems.length})</b><br/>`,
        );
        textLines.push(`Gestão de Terceiros (${gestaoItems.length})`);
        gestaoItems.forEach((item) => {
          htmlLines.push(formatItemHtml(item, counter) + '<br/>');
          textLines.push(formatItemText(item, counter));
          counter++;
        });
        htmlLines.push('<br/>');
        textLines.push('');
      }

      if (ctItems.length > 0) {
        htmlLines.push(`<b>Chamada Tecnológica (${ctItems.length})</b><br/>`);
        textLines.push(`Chamada Tecnológica (${ctItems.length})`);
        ctItems.forEach((item) => {
          htmlLines.push(formatItemHtml(item, counter) + '<br/>');
          textLines.push(formatItemText(item, counter));
          counter++;
        });
      }

      const html = htmlLines.join('');
      const text = textLines.join('\n');

      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([text], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blob,
        'text/plain': textBlob,
      });
      navigator.clipboard.write([item]).catch(() => {
        // Fallback: copia só texto puro
        navigator.clipboard.writeText(text).catch(() => {});
      });
    },
    [showHidden, positionMap],
  );

  const handleRowClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  // ── derived data ──

  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    const term = searchText.trim().toLowerCase();
    return items.filter((item) => {
      const id = (item.task.externalId ?? String(item.task.id)).toLowerCase();
      const title = (item.task.title ?? '').toLowerCase();
      return id.includes(term) || title.includes(term);
    });
  }, [items, searchText]);

  const { devItems, auditItems, analysisItems } = useMemo(() => {
    const dev: SustentacaoItemWithSLA[] = [];
    const audit: SustentacaoItemWithSLA[] = [];
    const analysis: SustentacaoItemWithSLA[] = [];
    for (const item of filteredItems) {
      const s = item.task.status;
      if (DEV_STATUSES.has(s)) dev.push(item);
      else if (AUDIT_STATUSES.has(s)) audit.push(item);
      else if (ANALYSIS_STATUSES.has(s)) analysis.push(item);
    }
    dev.sort(dashboardSort);
    audit.sort(dashboardSort);
    analysis.sort(dashboardSort);
    return { devItems: dev, auditItems: audit, analysisItems: analysis };
  }, [filteredItems]);

  // Count items with wrong position (assignee's cargo doesn't match the status lane)
  const wrongPositionCount = useMemo(() => {
    let count = 0;
    for (const item of items) {
      if (item.isHidden) continue;
      const t = item.task;
      if (!t.assignedToName || !t.assignedToEmail || !t.status) continue;
      const allowed = positionMap.get(t.assignedToEmail.toLowerCase());
      if (!allowed || allowed.length === 0) continue;
      if (!allowed.includes(t.status.toLowerCase())) count++;
    }
    return count;
  }, [items, positionMap]);

  // ── loading / error states ──
  if (loading) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Carregando itens de sustentação...
          </Typography>
        </Stack>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <Stack alignItems="center" justifyContent="center" minHeight="60vh">
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Dashboard Sustentação</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={includeAnalysis}
                onChange={(_, v) => setIncludeAnalysis(v)}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Incluir Análise nas métricas
              </Typography>
            }
            sx={{ mr: 1 }}
          />
          <Tooltip
            title={showHidden ? 'Ocultar desativados' : 'Mostrar desativados'}
          >
            <IconButton size="small" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? <ShowIcon /> : <HideIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Atualizar">
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Search Filter */}
      <TextField
        fullWidth
        size="small"
        placeholder="Buscar por código ou descrição da tarefa..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />

      {/* Metric Cards */}
      {metrics && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
            gap: 1.5,
            mb: 3,
            position: 'relative',
            opacity: metricsLoading ? 0.5 : 1,
            transition: 'opacity 0.2s',
            pointerEvents: metricsLoading ? 'none' : 'auto',
          }}
        >
          {/* Linha 1: Visão geral + alertas */}
          <MetricCard
            icon={<TicketIcon fontSize="inherit" />}
            label="Tickets abertos"
            value={metrics.openTickets}
            color="#16A34A"
            tooltip="Tickets em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ImprovementIcon fontSize="inherit" />}
            label="Melhorias abertas"
            value={metrics.openImprovements}
            color="#DB2777"
            tooltip="Improvements em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ViolatedIcon fontSize="inherit" />}
            label="SLA estourado"
            value={metrics.slaViolatedCount}
            subtitle={`${metrics.slaViolatedPercent}% dos tickets`}
            color="#DC2626"
            bgColor={
              metrics.slaViolatedCount > 0 ? 'rgba(220,38,38,0.06)' : undefined
            }
            tooltip="Tickets cujo tempo de SLA já foi ultrapassado. Limites por prioridade: Crítica 4h, Alta 8h, Média 24h, Baixa 40h úteis."
          />
          <MetricCard
            icon={<WarningIcon fontSize="inherit" />}
            label="SLA urgente (≤8h)"
            value={metrics.slaUrgentCount}
            color="#D97706"
            bgColor={
              metrics.slaUrgentCount > 0 ? 'rgba(217,119,6,0.06)' : undefined
            }
            tooltip="Tickets com 8 horas úteis ou menos para estourar o SLA (1 dia útil). Requer atenção imediata."
          />
          {/* Linha 2: Indicadores operacionais */}
          <MetricCard
            icon={<UnassignedIcon fontSize="inherit" />}
            label="Sem responsável / cargo incorreto"
            value={metrics.unassignedCount + wrongPositionCount}
            subtitle={
              wrongPositionCount > 0
                ? `${metrics.unassignedCount} sem resp. · ${wrongPositionCount} cargo incorreto`
                : undefined
            }
            color="#7C3AED"
            bgColor={
              metrics.unassignedCount + wrongPositionCount > 0
                ? 'rgba(124,58,237,0.06)'
                : undefined
            }
            tooltip="Itens sem responsável atribuído ou com responsável cujo cargo não corresponde ao status atual (ex: tarefa em Auditoria sem auditor alocado). Baseado nos cargos configurados em Cargos > Status Permitidos."
          />
          <MetricCard
            icon={<ClosedIcon fontSize="inherit" />}
            label="Fechados (30 dias)"
            value={metrics.closedTicketsLast30Days}
            subtitle={
              metrics.avgCloseTimeBusinessHours !== null
                ? `Média: ${formatBusinessHours(metrics.avgCloseTimeBusinessHours)}`
                : undefined
            }
            color="#15803D"
            tooltip="Tickets de Sustentação fechados nos últimos 30 dias e tempo médio entre criação e fechamento."
          />
          <MetricCard
            icon={<AvgTimeIcon fontSize="inherit" />}
            label="Idade média (Tickets)"
            value={formatBusinessHours(metrics.avgAgeBusinessHours)}
            color="#0891B2"
            tooltip="Média de horas úteis desde a criação dos Tickets abertos com SLA ativo. 1d = 8h úteis."
          />
          <MetricCard
            icon={<OldestIcon fontSize="inherit" />}
            label="Ticket mais antigo (SLA)"
            value={formatBusinessHours(metrics.oldestOpenTicketHours)}
            subtitle={
              metrics.oldestOpenTicketExternalId
                ? `#${metrics.oldestOpenTicketExternalId}`
                : undefined
            }
            color="#EA580C"
            bgColor={
              metrics.oldestOpenTicketHours !== null &&
              metrics.oldestOpenTicketHours > 40
                ? 'rgba(234,88,12,0.06)'
                : undefined
            }
            tooltip="Horas úteis de SLA acumuladas desde a criação do Ticket aberto mais antigo com SLA ativo. Considera apenas horário útil (08:00–12:00, 13:30–17:30). Limites: Crítica 4h, Alta 8h (1d), Média 24h (3d), Baixa 40h (5d)."
          />
        </Box>
      )}

      {/* Tabs */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ minHeight: 40 }}
          >
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Desenvolvimento</span>
                  <Chip
                    label={
                      devItems.filter((i) => showHidden || !i.isHidden).length
                    }
                    size="small"
                    color="primary"
                    variant={activeTab === 0 ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>
              }
              sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Auditoria</span>
                  <Chip
                    label={
                      auditItems.filter((i) => showHidden || !i.isHidden).length
                    }
                    size="small"
                    color="primary"
                    variant={activeTab === 1 ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>
              }
              sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Análise</span>
                  <Chip
                    label={
                      analysisItems.filter((i) => showHidden || !i.isHidden)
                        .length
                    }
                    size="small"
                    color="primary"
                    variant={activeTab === 2 ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>
              }
              sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Tooltip title="Ordem de prioridade SLA">
              <IconButton
                size="small"
                onClick={() => {
                  const titles = [
                    'Desenvolvimento',
                    'Auditoria',
                    'Análise',
                  ];
                  const itemSets = [devItems, auditItems, analysisItems];
                  setSlaOrderModal({
                    open: true,
                    title: titles[activeTab],
                    items: itemSets[activeTab],
                  });
                }}
              >
                <SlaOrderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exportar PDF">
              <IconButton
                size="small"
                onClick={() => {
                  const titles = [
                    'Desenvolvimento - Sustentação',
                    'Auditoria - Sustentação',
                    'Análise - Sustentação',
                  ];
                  const itemSets = [devItems, auditItems, analysisItems];
                  exportToPdf(
                    itemSets[activeTab],
                    titles[activeTab],
                    showHidden,
                    positionMap,
                  );
                }}
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copiar lista de prioridade">
              <IconButton
                size="small"
                onClick={() => {
                  const titles = [
                    'Desenvolvimento',
                    'Auditoria',
                    'Análise',
                  ];
                  const itemSets = [devItems, auditItems, analysisItems];
                  handleCopyPriorityList(
                    itemSets[activeTab],
                    titles[activeTab],
                  );
                }}
              >
                <CopyAllIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {[devItems, auditItems, analysisItems].map((tabItems, idx) => (
          <Box
            key={idx}
            sx={{ display: activeTab === idx ? 'block' : 'none' }}
          >
            <ItemTable
              items={tabItems}
              showAreaColumn
              showHidden={showHidden}
              onToggleSla={handleToggleSla}
              onToggleHidden={handleToggleHidden}
              onCopyLink={handleCopyLink}
              onRowClick={handleRowClick}
              positionMap={positionMap}
              busyItems={busyItems}
            />
          </Box>
        ))}
      </Box>

      <SlaOrderModal
        open={slaOrderModal.open}
        title={slaOrderModal.title}
        items={slaOrderModal.items}
        showHidden={showHidden}
        onClose={() => setSlaOrderModal({ open: false, title: '', items: [] })}
        onRowClick={handleRowClick}
      />

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </PageLayout>
  );
}
