import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
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
  Tabs,
  Tab,
  Skeleton,
} from '@mui/material';
import { DebouncedSearchInput } from '@renderer/components/DebouncedSearchInput';
import { ProjectSelector } from '@renderer/components/ProjectSelector';
import { useAzureProjects } from '@renderer/providers/AzureProjectsProvider';
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
  PriorityHigh as PriorityHighIcon,
  PlaylistAddCheck as SelectCopyIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import { WorkItemTypeChip } from '@renderer/components/WorkItemTypeChip';
import { SlaOrderModal } from '@renderer/components/SlaOrderModal';
import { PrioritizeItemModal } from '@renderer/components/PrioritizeItemModal';
import { CopySelectionModal } from './components/CopySelectionModal';
import { buildPriorityList, copyToClipboard } from './utils/copyPriorityList';
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
  'Aguardando desenvolvimento',
  'Aguardando Desenvolvimento',
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

/** Sort weight: Ticket GT=0, Ticket CT=1, Improvement GT=2, Improvement CT=3 */
function typeAreaWeight(item: SustentacaoItemWithSLA): number {
  const gt = isGestao(item.task.areaPath);
  const isTicket = item.task.type === 'Ticket';
  if (isTicket && gt) return 0;
  if (isTicket && !gt) return 1;
  if (!isTicket && gt) return 2;
  return 3;
}

function dashboardSort(
  a: SustentacaoItemWithSLA,
  b: SustentacaoItemWithSLA,
): number {
  const effectiveDeadlineMs = (i: SustentacaoItemWithSLA): number => {
    if (i.expirationDate) return new Date(i.expirationDate).getTime();
    if (i.localPriorityDeadline)
      return new Date(i.localPriorityDeadline).getTime();
    if (i.localPriorityCreatedAt)
      return new Date(i.localPriorityCreatedAt).getTime();
    return Infinity;
  };

  // 1. Violated SLA top, most overdue first
  const aViolated = a.slaViolated ? 1 : 0;
  const bViolated = b.slaViolated ? 1 : 0;
  if (aViolated !== bViolated) return bViolated - aViolated;
  if (aViolated && bViolated)
    return a.businessHoursRemaining - b.businessHoursRemaining;

  // 2. Effective deadline ASC (expirationDate OR localPriority deadline)
  const aDeadline = effectiveDeadlineMs(a);
  const bDeadline = effectiveDeadlineMs(b);
  const aHasDeadline = aDeadline !== Infinity ? 1 : 0;
  const bHasDeadline = bDeadline !== Infinity ? 1 : 0;
  if (aHasDeadline !== bHasDeadline) return bHasDeadline - aHasDeadline;
  if (aHasDeadline && bHasDeadline) {
    const diff = aDeadline - bDeadline;
    if (diff !== 0) return diff;
  }

  // 3. Type × Area weight: Ticket GT=0, Improvement GT=1, Ticket CT=2, Improvement CT=3
  const wa = typeAreaWeight(a);
  const wb = typeAreaWeight(b);
  if (wa !== wb) return wa - wb;

  // 4. Azure priority tiebreak
  const pa = PRIO_ORDER[a.task.priority] ?? 99;
  const pb = PRIO_ORDER[b.task.priority] ?? 99;
  return pa - pb;
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

function formatLocalPrioRemaining(hours: number): string {
  if (hours <= 0) {
    const overdue = Math.abs(hours);
    const d = Math.floor(overdue / 8);
    const h = Math.round(overdue % 8);
    if (d > 0 && h > 0) return `${d}d ${h}h atraso`;
    if (d > 0) return `${d}d atraso`;
    return `${h}h atraso`;
  }
  const d = Math.floor(hours / 8);
  const h = Math.round(hours % 8);
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

function slaChipColor(
  item: SustentacaoItemWithSLA,
): 'error' | 'warning' | 'info' | 'default' {
  if (item.slaExcluded) return 'default';
  if (!item.expirationDate) return 'default';
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
      } else if (!item.expirationDate) {
        slaHtml = '<span style="color:#94A3B8;font-size:9px;">Sem SLA</span>';
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

// Module-level constant: computed once when the module loads, not during render
const MODULE_LOAD_TIME = Date.now();

interface ItemRowProps {
  item: SustentacaoItemWithSLA;
  showAreaColumn: boolean;
  onToggleSla: (externalId: string, excluded: boolean) => void;
  onToggleHidden: (externalId: string, hidden: boolean) => void;
  onCopyLink: (externalId: string) => void;
  onPrioritize: (item: SustentacaoItemWithSLA) => void;
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
  onPrioritize,
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

  // Check if item was created in the last 24 hours using module-load time as reference
  const isNew = useMemo(() => {
    const created = t.azureCreatedDate ?? t.createdAt;
    if (!created) return false;
    const createdMs = new Date(created).getTime();
    return MODULE_LOAD_TIME - createdMs < 24 * 60 * 60 * 1000;
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
        <Stack spacing={0.4}>
          <Typography
            variant="body2"
            sx={{ wordBreak: 'break-word', lineHeight: 1.4 }}
          >
            {t.title}
          </Typography>
          {t.isBlocked && (
            <Tooltip
              title={
                t.blockedReason ?? 'Item com impedimento — não pode avançar'
              }
            >
              <Chip
                label="⚠ Impedimento"
                size="small"
                color="error"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  height: 20,
                  width: 'fit-content',
                }}
              />
            </Tooltip>
          )}
        </Stack>
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

      {/* SLA / Priorização */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1, whiteSpace: 'nowrap' }}>
        <Stack spacing={0.5}>
          {/* SLA row (Tickets only) */}
          {isTicket ? (
            item.slaExcluded ? (
              <Chip label="SLA Excluído" size="small" variant="outlined" />
            ) : !item.expirationDate ? (
              <Chip
                label="Sem SLA"
                size="small"
                variant="outlined"
                sx={{ color: 'text.disabled', borderColor: 'divider' }}
              />
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

          {/* Local priority row */}
          {item.localPriority > 0 && (
            <Stack spacing={0.3}>
              <Chip
                icon={
                  <PriorityHighIcon
                    sx={{ fontSize: 14, color: '#fff !important' }}
                  />
                }
                label={
                  item.localPriorityHoursRemaining != null
                    ? item.localPriorityExpired
                      ? formatLocalPrioRemaining(
                          item.localPriorityHoursRemaining,
                        )
                      : formatLocalPrioRemaining(
                          item.localPriorityHoursRemaining,
                        )
                    : `Prioridade ${item.localPriority}`
                }
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: item.localPriorityExpired ? '#DC2626' : '#F59E0B',
                  color: '#fff',
                  fontSize: '0.7rem',
                  '& .MuiChip-icon': { color: '#fff' },
                }}
                variant="filled"
              />
              {item.localPriorityDeadline && (
                <Typography
                  variant="caption"
                  sx={{
                    color: item.localPriorityExpired ? 'error.main' : '#B45309',
                    fontWeight: item.localPriorityExpired ? 700 : 400,
                    fontSize: '0.7rem',
                  }}
                >
                  {item.localPriorityExpired ? 'Prazo: ' : ''}
                  {new Date(item.localPriorityDeadline).toLocaleDateString(
                    'pt-BR',
                  )}{' '}
                  {new Date(item.localPriorityDeadline).toLocaleTimeString(
                    'pt-BR',
                    { hour: '2-digit', minute: '2-digit' },
                  )}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </TableCell>

      {/* Ações */}
      <TableCell
        sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle', py: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {isBusy ? (
          <CircularProgress size={20} sx={{ mx: 1 }} />
        ) : (
          <Stack direction="row" spacing={0.5} alignItems="center">
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
            <Tooltip
              title={
                item.localPriority > 0
                  ? 'Alterar prioridade local'
                  : 'Priorizar item'
              }
            >
              <IconButton
                size="small"
                onClick={() => onPrioritize(item)}
                sx={{
                  color: item.localPriority > 0 ? '#F59E0B' : undefined,
                }}
              >
                <PriorityHighIcon fontSize="small" />
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
          </Stack>
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
  onPrioritize: (item: SustentacaoItemWithSLA) => void;
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
  onPrioritize,
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
            <TableCell>SLA / Priorização</TableCell>
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
              onPrioritize={onPrioritize}
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

const dashboardApi = (
  window as unknown as {
    electronAPI: import('@shared/interfaces/config/index.types').CustomElectronAPI;
  }
).electronAPI;

export function DashboardSustentacaoPage() {
  const { projects } = useAzureProjects();

  // Project selection — persisted in localStorage
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(
    () => {
      const stored = localStorage.getItem('dashboard-sustentacao-project-id');
      return stored ? Number(stored) : null;
    },
  );

  // Resolve selectedConfigId: fall back to first active project if stored one is gone
  const resolvedConfigId = useMemo(() => {
    if (projects.length === 0) return undefined;
    if (projects.length === 1) return projects[0].id;
    if (selectedConfigId && projects.some((p) => p.id === selectedConfigId))
      return selectedConfigId;
    return projects[0]?.id;
  }, [projects, selectedConfigId]);

  const handleProjectChange = (id: number) => {
    setSelectedConfigId(id);
    localStorage.setItem('dashboard-sustentacao-project-id', String(id));
  };

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
  const [areaFilter, setAreaFilter] = useState<'all' | 'gestao' | 'chamada'>(
    'all',
  );
  const [activeTab, setActiveTab] = useState(0);
  const [copySelectionOpen, setCopySelectionOpen] = useState(false);
  const [slaOrderModal, setSlaOrderModal] = useState<{
    open: boolean;
    title: string;
    items: SustentacaoItemWithSLA[];
  }>({
    open: false,
    title: '',
    items: [],
  });
  const [prioritizeItem, setPrioritizeItem] =
    useState<SustentacaoItemWithSLA | null>(null);

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
        dashboardApi.dashboard.getSustentacaoItems(undefined, resolvedConfigId),
        dashboardApi.teamMember.findAll(),
        dashboardApi.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(includeAnalysis),
          resolvedConfigId,
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
          const position = m.position as
            | { allowedStatuses?: string }
            | undefined;
          if (m.email && position?.allowedStatuses) {
            const statuses = position.allowedStatuses
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
  }, [getMetricsStatuses, includeAnalysis, resolvedConfigId]);

  /** Background refresh — no full-screen spinner, silently updates data */
  const refreshData = useCallback(async () => {
    try {
      const [res, metricsRes] = await Promise.all([
        dashboardApi.dashboard.getSustentacaoItems(undefined, resolvedConfigId),
        dashboardApi.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(includeAnalysis),
          resolvedConfigId,
        ),
      ]);
      if (res.success && res.data) setItems(res.data);
      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    } catch {
      /* silent */
    }
  }, [includeAnalysis, getMetricsStatuses, resolvedConfigId]);

  /** Metrics-only refresh — shows loading only on cards */
  const refreshMetrics = useCallback(
    async (withAnalysis: boolean) => {
      setMetricsLoading(true);
      try {
        const res = await dashboardApi.dashboard.getSustentacaoMetrics(
          getMetricsStatuses(withAnalysis),
          resolvedConfigId,
        );
        if (res.success && res.data) setMetrics(res.data);
      } catch {
        /* silent */
      } finally {
        setMetricsLoading(false);
      }
    },
    [getMetricsStatuses, resolvedConfigId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data automatically when sync completes
  useSyncRefresh(refreshData);

  // When includeAnalysis changes, only reload metrics (not the whole page)
  const isFirstRender = useRef(true);
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
          await dashboardApi.dashboard.restoreSla(externalId);
        } else {
          await dashboardApi.dashboard.excludeSla(externalId);
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
          await dashboardApi.dashboard.unhideItem(externalId);
        } else {
          await dashboardApi.dashboard.hideItem(externalId);
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

      const { htmlLines, textLines } = buildPriorityList({
        title: sectionTitle,
        items: visible,
        positionMap,
      });

      copyToClipboard(htmlLines, textLines);
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

  const handlePrioritize = useCallback((item: SustentacaoItemWithSLA) => {
    setPrioritizeItem(item);
  }, []);

  const handlePrioritizeSaved = useCallback(async () => {
    setPrioritizeItem(null);
    // Invalidate backend cache so refreshData gets fresh data
    await dashboardApi.dashboard.invalidateCache();
    refreshData();
  }, [refreshData]);

  // ── derived data ──

  const filteredItems = useMemo(() => {
    let result = items;
    // Area filter
    if (areaFilter !== 'all') {
      result = result.filter((i) =>
        areaFilter === 'gestao'
          ? isGestao(i.task.areaPath)
          : !isGestao(i.task.areaPath),
      );
    }
    // Text search
    if (searchText.trim()) {
      const term = searchText.trim().toLowerCase();
      result = result.filter((item) => {
        const id = (item.task.externalId ?? String(item.task.id)).toLowerCase();
        const title = (item.task.title ?? '').toLowerCase();
        return id.includes(term) || title.includes(term);
      });
    }
    return result;
  }, [items, searchText, areaFilter]);

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
  // Uses filteredItems so it respects the area filter
  const wrongPositionCount = useMemo(() => {
    let count = 0;
    for (const item of filteredItems) {
      if (item.isHidden) continue;
      const t = item.task;
      if (!t.assignedToName || !t.assignedToEmail || !t.status) continue;
      const allowed = positionMap.get(t.assignedToEmail.toLowerCase());
      if (!allowed || allowed.length === 0) continue;
      if (!allowed.includes(t.status.toLowerCase())) count++;
    }
    return count;
  }, [filteredItems, positionMap]);

  // When area filter is active, compute metrics from filteredItems directly
  // so the cards stay in sync with the list
  const derivedMetrics = useMemo((): SustentacaoMetrics | null => {
    if (areaFilter === 'all') return null; // use backend metrics when no filter
    if (!metrics) return null;

    const visible = filteredItems.filter((i) => !i.isHidden);
    const openTickets = visible.filter((i) => i.task.type === 'Ticket').length;
    const openImprovements = visible.filter(
      (i) => i.task.type === 'Improvement',
    ).length;

    const ticketsWithSla = visible.filter(
      (i) => i.task.type === 'Ticket' && !i.slaExcluded,
    );
    const slaViolated = ticketsWithSla.filter((i) => i.slaViolated);
    const slaUrgent = ticketsWithSla.filter(
      (i) =>
        !i.slaViolated &&
        i.businessHoursRemaining > 0 &&
        i.businessHoursRemaining <= 8,
    );
    const unassigned = visible.filter((i) => !i.task.assignedToName).length;

    const avgAge =
      ticketsWithSla.length > 0
        ? ticketsWithSla.reduce((sum, i) => sum + i.businessHoursElapsed, 0) /
          ticketsWithSla.length
        : 0;

    let oldestHours: number | null = null;
    let oldestExternalId: string | null = null;
    for (const t of ticketsWithSla) {
      if (oldestHours === null || t.businessHoursElapsed > oldestHours) {
        oldestHours = t.businessHoursElapsed;
        oldestExternalId = t.task.externalId ?? null;
      }
    }

    const byPriority = Array.from(
      visible.reduce((m, i) => {
        const p = i.task.priority ?? 'medium';
        m.set(p, (m.get(p) ?? 0) + 1);
        return m;
      }, new Map<string, number>()),
    ).map(([priority, count]) => ({ priority, count }));

    return {
      ...metrics, // keep closedTicketsLast30Days, avgCloseTime from backend
      totalOpen: visible.length,
      openTickets,
      openImprovements,
      slaViolatedCount: slaViolated.length,
      slaViolatedPercent:
        ticketsWithSla.length > 0
          ? Math.round((slaViolated.length / ticketsWithSla.length) * 100)
          : 0,
      slaWarningCount: ticketsWithSla.filter((i) => i.slaWarning).length,
      slaUrgentCount: slaUrgent.length,
      unassignedCount: unassigned,
      avgAgeBusinessHours: Math.round(avgAge * 10) / 10,
      oldestOpenTicketHours:
        oldestHours !== null ? Math.round(oldestHours * 10) / 10 : null,
      oldestOpenTicketExternalId: oldestExternalId,
      byPriority,
    };
  }, [areaFilter, filteredItems, metrics]);

  // Active metrics: derived (filtered) when area filter is on, backend otherwise
  const activeMetrics = derivedMetrics ?? metrics;

  // ── loading / error states ──
  if (loading && items.length === 0) {
    return (
      <PageLayout>
        <Stack spacing={1} mb={3}>
          <Skeleton
            variant="text"
            width={320}
            height={40}
            sx={{ borderRadius: 1 }}
          />
          <Stack direction="row" spacing={1}>
            {[100, 80, 110, 90, 120].map((w, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={w}
                height={48}
                sx={{ borderRadius: 2 }}
              />
            ))}
          </Stack>
        </Stack>
        <Skeleton
          variant="rounded"
          height={40}
          sx={{ mb: 2, maxWidth: 400, borderRadius: 1 }}
        />
        <Skeleton variant="rounded" height={450} sx={{ borderRadius: 2 }} />
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
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            Dashboard Sustentação
          </Typography>
          {projects.length > 1 && (
            <ProjectSelector
              projects={projects}
              selectedId={resolvedConfigId ?? null}
              onChange={handleProjectChange}
            />
          )}
        </Stack>
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
      <DebouncedSearchInput
        fullWidth
        placeholder="Buscar por código ou descrição da tarefa..."
        onSearch={setSearchText}
        sx={{ mb: 1 }}
      />

      {/* Area Filter */}
      <Stack direction="row" spacing={0.75} mb={2} flexWrap="wrap" useFlexGap>
        {(
          [
            { value: 'all', label: 'Todos' },
            { value: 'gestao', label: 'Gestão de Terceiros' },
            { value: 'chamada', label: 'Chamada Tecnológica' },
          ] as const
        ).map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            size="small"
            variant={areaFilter === opt.value ? 'filled' : 'outlined'}
            color={areaFilter === opt.value ? 'primary' : 'default'}
            onClick={() => setAreaFilter(opt.value)}
            sx={{ fontWeight: areaFilter === opt.value ? 700 : 400 }}
          />
        ))}
      </Stack>

      {/* Metric Cards */}
      {activeMetrics && (
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
            value={activeMetrics.openTickets}
            color="#16A34A"
            tooltip="Tickets em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ImprovementIcon fontSize="inherit" />}
            label="Melhorias abertas"
            value={activeMetrics.openImprovements}
            color="#DB2777"
            tooltip="Improvements em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ViolatedIcon fontSize="inherit" />}
            label="SLA estourado"
            value={activeMetrics.slaViolatedCount}
            subtitle={`${activeMetrics.slaViolatedPercent}% dos tickets`}
            color="#DC2626"
            bgColor={
              activeMetrics.slaViolatedCount > 0
                ? 'rgba(220,38,38,0.06)'
                : undefined
            }
            tooltip="Tickets cuja data de término (TÉRMINO) definida no Azure já foi ultrapassada."
          />
          <MetricCard
            icon={<WarningIcon fontSize="inherit" />}
            label="SLA urgente (≤8h)"
            value={activeMetrics.slaUrgentCount}
            color="#D97706"
            bgColor={
              activeMetrics.slaUrgentCount > 0
                ? 'rgba(217,119,6,0.06)'
                : undefined
            }
            tooltip="Tickets com 8 horas úteis ou menos para estourar o SLA (1 dia útil). Requer atenção imediata."
          />
          {/* Linha 2: Indicadores operacionais */}
          <MetricCard
            icon={<UnassignedIcon fontSize="inherit" />}
            label="Sem responsável / cargo incorreto"
            value={activeMetrics.unassignedCount + wrongPositionCount}
            subtitle={
              wrongPositionCount > 0
                ? `${activeMetrics.unassignedCount} sem resp. · ${wrongPositionCount} cargo incorreto`
                : undefined
            }
            color="#7C3AED"
            bgColor={
              activeMetrics.unassignedCount + wrongPositionCount > 0
                ? 'rgba(124,58,237,0.06)'
                : undefined
            }
            tooltip="Itens sem responsável atribuído ou com responsável cujo cargo não corresponde ao status atual (ex: tarefa em Auditoria sem auditor alocado). Baseado nos cargos configurados em Cargos > Status Permitidos."
          />
          <MetricCard
            icon={<ClosedIcon fontSize="inherit" />}
            label="Fechados (30 dias)"
            value={activeMetrics.closedTicketsLast30Days}
            subtitle={
              activeMetrics.avgCloseTimeBusinessHours !== null
                ? `Média: ${formatBusinessHours(activeMetrics.avgCloseTimeBusinessHours)}`
                : undefined
            }
            color="#15803D"
            tooltip="Tickets de Sustentação fechados nos últimos 30 dias e tempo médio entre criação e fechamento."
          />
          <MetricCard
            icon={<AvgTimeIcon fontSize="inherit" />}
            label="Idade média (Tickets)"
            value={formatBusinessHours(activeMetrics.avgAgeBusinessHours)}
            color="#0891B2"
            tooltip="Média de horas úteis desde a criação dos Tickets abertos com SLA ativo. 1d = 8h úteis."
          />
          <MetricCard
            icon={<OldestIcon fontSize="inherit" />}
            label="Ticket mais antigo (SLA)"
            value={formatBusinessHours(activeMetrics.oldestOpenTicketHours)}
            subtitle={
              activeMetrics.oldestOpenTicketExternalId
                ? `#${activeMetrics.oldestOpenTicketExternalId}`
                : undefined
            }
            color="#EA580C"
            bgColor={
              activeMetrics.oldestOpenTicketHours !== null &&
              activeMetrics.oldestOpenTicketHours > 40
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
            <Tooltip title="Selecionar itens para copiar">
              <IconButton
                size="small"
                onClick={() => setCopySelectionOpen(true)}
              >
                <SelectCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ordem de prioridade SLA">
              <IconButton
                size="small"
                onClick={() => {
                  const titles = ['Desenvolvimento', 'Auditoria', 'Análise'];
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
                  const titles = ['Desenvolvimento', 'Auditoria', 'Análise'];
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
          <Box key={idx} sx={{ display: activeTab === idx ? 'block' : 'none' }}>
            <ItemTable
              items={tabItems}
              showAreaColumn
              showHidden={showHidden}
              onToggleSla={handleToggleSla}
              onToggleHidden={handleToggleHidden}
              onCopyLink={handleCopyLink}
              onPrioritize={handlePrioritize}
              onRowClick={handleRowClick}
              positionMap={positionMap}
              busyItems={busyItems}
            />
          </Box>
        ))}
      </Box>

      <CopySelectionModal
        open={copySelectionOpen}
        onClose={() => setCopySelectionOpen(false)}
        devItems={devItems}
        auditItems={auditItems}
        analysisItems={analysisItems}
        positionMap={positionMap}
      />

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

      <PrioritizeItemModal
        open={prioritizeItem !== null}
        item={prioritizeItem}
        onClose={() => setPrioritizeItem(null)}
        onSaved={handlePrioritizeSaved}
      />
    </PageLayout>
  );
}
