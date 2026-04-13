import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react';
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
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import {
  Refresh as RefreshIcon,
  TimerOff as TimerOffIcon,
  Timer as TimerIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  ContentCopy as CopyIcon,
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
import type { SustentacaoItemWithSLA, SustentacaoMetrics } from '@shared/interfaces/config/index.types';
import type { Task } from '@shared/interfaces/config/index.types';

// ── constants ──

const PRIO_LABEL: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};
const PRIO_COLOR: Record<string, string> = {
  critical: '#d32f2f',
  high: '#ed6c02',
  medium: '#0288d1',
  low: '#757575',
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

const STATE_ORDER: Record<string, number> = {
  'Em Desenvolvimento': 0,
  'Em Andamento': 1,
  Active: 2,
  'In Progress': 3,
  'Preparando para Dev': 4,
  'Em Auditoria': 5,
  'Aguardando Auditoria': 6,
  'Em Homologação': 7,
  'Aguardando Validação': 8,
  'Aguardando Implantação': 9,
  Novo: 10,
  New: 11,
  'Em Levantamento': 12,
  'Backlog (sem atribuição)': 99,
};

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
  if (!item.slaViolated && item.businessHoursRemaining <= 8 && item.businessHoursRemaining > 0) return 'warning';
  return 'info';
}

// ── PDF export (captures rendered HTML table) ──

async function exportToPdf(
  items: SustentacaoItemWithSLA[],
  title: string,
  showHidden: boolean,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const visible = showHidden ? items : items.filter((i) => !i.isHidden);
  if (visible.length === 0) return;

  // Build an off-screen container with a simplified table
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:1100px;background:#fff;padding:16px;font-family:Roboto,Arial,sans-serif;';

  const now = new Date().toLocaleString('pt-BR');
  container.innerHTML = `
    <h2 style="margin:0 0 4px;font-size:16px;color:#1976d2;">${title}</h2>
    <p style="margin:0 0 12px;font-size:10px;color:#888;">Gerado em: ${now}</p>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#1976d2;color:#fff;">
          <th style="padding:6px 8px;text-align:left;width:160px;">Item</th>
          <th style="padding:6px 8px;text-align:left;">Título</th>
          <th style="padding:6px 8px;text-align:left;width:140px;">Status</th>
          <th style="padding:6px 8px;text-align:left;width:160px;">Responsável</th>
          <th style="padding:6px 8px;text-align:left;width:120px;">SLA</th>
        </tr>
      </thead>
      <tbody>
        ${visible
          .map((item, idx) => {
            const t = item.task;
            const prio = PRIO_LABEL[t.priority] ?? t.priority;
            const area = areaLabel(t.areaPath);
            const isTicket = t.type === 'Ticket';
            const bgColor = idx % 2 === 0 ? '#fff' : '#f5f5f5';
            const noAssignee = !t.assignedToName;

            let slaHtml = '<span style="color:#999;">—</span>';
            if (isTicket) {
              if (item.slaExcluded) {
                slaHtml = '<span style="color:#999;">Excluído</span>';
              } else {
                const color = item.slaViolated ? '#d32f2f' : item.slaWarning ? '#ed6c02' : '#333';
                const weight = item.slaViolated ? 'bold' : 'normal';
                slaHtml = `<span style="color:${color};font-weight:${weight};">${formatSlaRemaining(item.businessHoursRemaining)}</span>`;
                if (item.expirationDate) {
                  const d = new Date(item.expirationDate);
                  slaHtml += `<br/><span style="font-size:9px;color:${color};">${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`;
                }
              }
            }

            const prioColor = PRIO_COLOR[t.priority] ?? '#757575';
            const typeColor = isTicket ? '#4caf50' : '#e91e63';
            const areaColor = isGestao(t.areaPath) ? '#1565c0' : '#c62828';
            const areaBg = isGestao(t.areaPath) ? '#e3f2fd' : '#fce4ec';

            return `<tr style="background:${bgColor};${noAssignee ? 'border-left:3px solid #ed6c02;' : ''}">
              <td style="padding:5px 8px;vertical-align:top;">
                <span style="color:#666;font-weight:600;font-size:10px;">#${t.externalId ?? t.id}</span><br/>
                <span style="display:inline-block;padding:1px 6px;background:${typeColor};color:#fff;border-radius:10px;font-size:9px;font-weight:600;">${t.type}</span>
                <span style="display:inline-block;padding:1px 6px;background:${areaBg};color:${areaColor};border-radius:10px;font-size:9px;font-weight:600;">${area}</span>
                <span style="display:inline-block;padding:1px 6px;background:${prioColor};color:#fff;border-radius:10px;font-size:9px;font-weight:700;">${prio}</span>
              </td>
              <td style="padding:5px 8px;vertical-align:top;">${t.title}</td>
              <td style="padding:5px 8px;vertical-align:top;"><span style="display:inline-block;padding:1px 8px;border:1px solid #ccc;border-radius:10px;font-size:10px;">${t.status}</span></td>
              <td style="padding:5px 8px;vertical-align:top;${noAssignee ? 'color:#ed6c02;font-weight:600;' : ''}">${t.assignedToName || 'Sem responsável'}</td>
              <td style="padding:5px 8px;vertical-align:top;">${slaHtml}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 277; // A4 landscape width in mm minus margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageHeight = 190; // usable height in mm
    let yOffset = 0;

    while (yOffset < imgHeight) {
      if (yOffset > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', 10, 5, imgWidth, imgHeight, undefined, 'FAST', 0);
      // Shift the image up for next page
      if (yOffset + pageHeight < imgHeight) {
        doc.addPage();
        yOffset += pageHeight;
        doc.addImage(imgData, 'PNG', 10, 5 - yOffset, imgWidth, imgHeight, undefined, 'FAST', 0);
      }
      break;
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
  const prioColor = PRIO_COLOR[prio] ?? '#757575';
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
            ? 'rgba(211,47,47,0.06)'
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
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
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
          <WorkItemTypeChip type={t.type} sx={{ height: 18 }} />
          {showAreaColumn && (
            <Chip
              label={areaLabel(t.areaPath)}
              size="small"
              variant="filled"
              sx={{
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 18,
                bgcolor: isGestao(t.areaPath) ? '#e3f2fd' : '#fce4ec',
                color: isGestao(t.areaPath) ? '#1565c0' : '#c62828',
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
                fontSize: '0.65rem',
                height: 18,
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
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {t.assignedToName || '—'}
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
                {!item.slaViolated && item.businessHoursRemaining > 0 && item.businessHoursRemaining <= 8 && (
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
                  {new Date(item.expirationDate).toLocaleDateString('pt-BR')}{' '}
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
      <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'middle', py: 1 }} onClick={(e) => e.stopPropagation()}>
        {isBusy ? (
          <CircularProgress size={20} sx={{ mx: 1 }} />
        ) : (
          <>
            {isTicket && (
              <Tooltip title={item.slaExcluded ? 'Restaurar SLA' : 'Excluir SLA'}>
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
              <IconButton size="small" onClick={() => onCopyLink(t.externalId!)}>
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
          {visible.map((item) => (
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

function MetricCard({ icon, label, value, subtitle, color = '#1976d2', bgColor, tooltip }: MetricCardProps) {
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
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block', wordBreak: 'break-word' }}>
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" display="block" color="text.disabled" sx={{ lineHeight: 1.3, wordBreak: 'break-word', fontSize: '0.68rem' }}>
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
  const [positionMap, setPositionMap] = useState<Map<string, string[]>>(new Map());
  const [busyItems, setBusyItems] = useState<Set<string>>(new Set());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [slaOrderModal, setSlaOrderModal] = useState<{ open: boolean; title: string; items: SustentacaoItemWithSLA[] }>({
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
  const getMetricsStatuses = useCallback((withAnalysis: boolean) => [
    ...DEV_STATUSES,
    ...AUDIT_STATUSES,
    ...(withAnalysis ? ANALYSIS_STATUSES : []),
  ], []);

  /** Full initial load — shows full-screen spinner */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, membersRes, metricsRes] = await Promise.all([
        api.dashboard.getSustentacaoItems(),
        api.teamMember.findAll(),
        api.dashboard.getSustentacaoMetrics(getMetricsStatuses(includeAnalysis)),
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
        api.dashboard.getSustentacaoMetrics(getMetricsStatuses(includeAnalysis)),
      ]);
      if (res.success && res.data) setItems(res.data);
      if (metricsRes.success && metricsRes.data) setMetrics(metricsRes.data);
    } catch {
      /* silent */
    }
  }, [includeAnalysis, getMetricsStatuses]);

  /** Metrics-only refresh — shows loading only on cards */
  const refreshMetrics = useCallback(async (withAnalysis: boolean) => {
    setMetricsLoading(true);
    try {
      const res = await api.dashboard.getSustentacaoMetrics(getMetricsStatuses(withAnalysis));
      if (res.success && res.data) setMetrics(res.data);
    } catch {
      /* silent */
    } finally {
      setMetricsLoading(false);
    }
  }, [getMetricsStatuses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setItems(prev => prev.map(i =>
        i.task.externalId === externalId
          ? { ...i, slaExcluded: !excluded }
          : i,
      ));
      setBusyItems(prev => new Set(prev).add(externalId));
      try {
        if (excluded) {
          await api.dashboard.restoreSla(externalId);
        } else {
          await api.dashboard.excludeSla(externalId);
        }
        await refreshData();
      } catch {
        // Revert on error
        setItems(prev => prev.map(i =>
          i.task.externalId === externalId
            ? { ...i, slaExcluded: excluded }
            : i,
        ));
      } finally {
        setBusyItems(prev => {
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
      setItems(prev => prev.map(i =>
        i.task.externalId === externalId
          ? { ...i, isHidden: !hidden }
          : i,
      ));
      setBusyItems(prev => new Set(prev).add(externalId));
      try {
        if (hidden) {
          await api.dashboard.unhideItem(externalId);
        } else {
          await api.dashboard.hideItem(externalId);
        }
        await refreshData();
      } catch {
        // Revert on error
        setItems(prev => prev.map(i =>
          i.task.externalId === externalId
            ? { ...i, isHidden: hidden }
            : i,
        ));
      } finally {
        setBusyItems(prev => {
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
            color="#4caf50"
            tooltip="Tickets em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ImprovementIcon fontSize="inherit" />}
            label="Melhorias abertas"
            value={metrics.openImprovements}
            color="#e91e63"
            tooltip="Improvements em Desenvolvimento ou Auditoria na área de Sustentação (exclui ocultos)."
          />
          <MetricCard
            icon={<ViolatedIcon fontSize="inherit" />}
            label="SLA estourado"
            value={metrics.slaViolatedCount}
            subtitle={`${metrics.slaViolatedPercent}% dos tickets`}
            color="#d32f2f"
            bgColor={metrics.slaViolatedCount > 0 ? 'rgba(211,47,47,0.06)' : undefined}
            tooltip="Tickets cujo tempo de SLA já foi ultrapassado. Limites por prioridade: Crítica 4h, Alta 8h, Média 24h, Baixa 40h úteis."
          />
          <MetricCard
            icon={<WarningIcon fontSize="inherit" />}
            label="SLA urgente (≤8h)"
            value={metrics.slaUrgentCount}
            color="#ed6c02"
            bgColor={metrics.slaUrgentCount > 0 ? 'rgba(237,108,2,0.06)' : undefined}
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
            color="#9c27b0"
            bgColor={(metrics.unassignedCount + wrongPositionCount) > 0 ? 'rgba(156,39,176,0.06)' : undefined}
            tooltip="Itens sem responsável atribuído ou com responsável cujo cargo não corresponde ao status atual (ex: tarefa em Auditoria sem auditor alocado). Baseado nos cargos configurados em Cargos > Status Permitidos."
          />
          <MetricCard
            icon={<ClosedIcon fontSize="inherit" />}
            label="Fechados (30 dias)"
            value={metrics.closedTicketsLast30Days}
            subtitle={metrics.avgCloseTimeBusinessHours !== null ? `Média: ${formatBusinessHours(metrics.avgCloseTimeBusinessHours)}` : undefined}
            color="#2e7d32"
            tooltip="Tickets de Sustentação fechados nos últimos 30 dias e tempo médio entre criação e fechamento."
          />
          <MetricCard
            icon={<AvgTimeIcon fontSize="inherit" />}
            label="Idade média (Tickets)"
            value={formatBusinessHours(metrics.avgAgeBusinessHours)}
            color="#0288d1"
            tooltip="Média de horas úteis desde a criação dos Tickets abertos com SLA ativo. 1d = 8h úteis."
          />
          <MetricCard
            icon={<OldestIcon fontSize="inherit" />}
            label="Ticket mais antigo (SLA)"
            value={formatBusinessHours(metrics.oldestOpenTicketHours)}
            subtitle={metrics.oldestOpenTicketExternalId ? `#${metrics.oldestOpenTicketExternalId}` : undefined}
            color="#f57c00"
            bgColor={metrics.oldestOpenTicketHours !== null && metrics.oldestOpenTicketHours > 40 ? 'rgba(245,124,0,0.06)' : undefined}
            tooltip="Horas úteis de SLA acumuladas desde a criação do Ticket aberto mais antigo com SLA ativo. Considera apenas horário útil (08:00–12:00, 13:30–17:30). Limites: Crítica 4h, Alta 8h (1d), Média 24h (3d), Baixa 40h (5d)."
          />
        </Box>
      )}

      {/* Content */}
      <Stack spacing={3}>
        {/* Desenvolvimento */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <Typography variant="h6">Desenvolvimento</Typography>
            <Chip
              label={
                devItems.filter((i) => showHidden || !i.isHidden).length
              }
              size="small"
            />
            <Tooltip title="Ordem de prioridade SLA">
              <IconButton
                size="small"
                onClick={() => setSlaOrderModal({ open: true, title: 'Desenvolvimento', items: devItems })}
              >
                <SlaOrderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exportar PDF">
              <IconButton
                size="small"
                onClick={() => exportToPdf(devItems, 'Desenvolvimento - Sustentação', showHidden)}
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <ItemTable
            items={devItems}
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

        {/* Auditoria */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <Typography variant="h6">Auditoria</Typography>
            <Chip
              label={
                auditItems.filter((i) => showHidden || !i.isHidden).length
              }
              size="small"
            />
            <Tooltip title="Ordem de prioridade SLA">
              <IconButton
                size="small"
                onClick={() => setSlaOrderModal({ open: true, title: 'Auditoria', items: auditItems })}
              >
                <SlaOrderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exportar PDF">
              <IconButton
                size="small"
                onClick={() => exportToPdf(auditItems, 'Auditoria - Sustentação', showHidden)}
              >
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <ItemTable
            items={auditItems}
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

        {/* Análise */}
        {analysisItems.length > 0 && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Typography variant="h6">Análise</Typography>
              <Chip
                label={
                  analysisItems.filter((i) => showHidden || !i.isHidden).length
                }
                size="small"
              />
              <Tooltip title="Ordem de prioridade SLA">
                <IconButton
                  size="small"
                  onClick={() => setSlaOrderModal({ open: true, title: 'Análise', items: analysisItems })}
                >
                  <SlaOrderIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Exportar PDF">
                <IconButton
                  size="small"
                  onClick={() => exportToPdf(analysisItems, 'Análise - Sustentação', showHidden)}
                >
                  <PdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <ItemTable
              items={analysisItems}
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
        )}
      </Stack>

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


