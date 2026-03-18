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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  LocalFireDepartment as FireIcon,
  Diamond as DiamondIcon,
  TimerOff as TimerOffIcon,
  Timer as TimerIcon,
  VisibilityOff as HideIcon,
  Visibility as ShowIcon,
  ContentCopy as CopyIcon,
  WarningAmber as WarningIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { PageLayout } from '@renderer/components/PageLayout';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import type { SustentacaoItemWithSLA } from '@shared/interfaces/config/index.types';
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
  // 1. type+area weight
  const wa = typeAreaWeight(a);
  const wb = typeAreaWeight(b);
  if (wa !== wb) return wa - wb;
  // 2. priority (critical first)
  const pa = PRIO_ORDER[a.task.priority] ?? 99;
  const pb = PRIO_ORDER[b.task.priority] ?? 99;
  if (pa !== pb) return pa - pb;
  // 3. SLA remaining ASC
  return a.businessHoursRemaining - b.businessHoursRemaining;
}

function formatSlaRemaining(hours: number): string {
  if (hours <= 0) return 'Estourado';
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
  if (item.slaViolated) return 'error';
  if (item.slaWarning) return 'warning';
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
            const typeColor = isTicket ? '#d32f2f' : '#1976d2';
            const areaColor = isGestao(t.areaPath) ? '#1565c0' : '#c62828';
            const areaBg = isGestao(t.areaPath) ? '#e3f2fd' : '#fce4ec';

            return `<tr style="background:${bgColor};${noAssignee ? 'border-left:3px solid #ed6c02;' : ''}">
              <td style="padding:5px 8px;vertical-align:top;">
                <span style="color:#666;font-weight:600;font-size:10px;">#${t.externalId ?? t.id}</span><br/>
                <span style="display:inline-block;padding:1px 6px;border:1px solid ${typeColor};color:${typeColor};border-radius:10px;font-size:9px;font-weight:600;">${t.type}</span>
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
}

const ItemRow = memo(function ItemRow({
  item,
  showAreaColumn,
  onToggleSla,
  onToggleHidden,
  onCopyLink,
  onRowClick,
}: ItemRowProps) {
  const t = item.task;
  const prio = t.priority ?? 'medium';
  const prioLabel = PRIO_LABEL[prio] ?? prio;
  const prioColor = PRIO_COLOR[prio] ?? '#757575';
  const isTicket = t.type === 'Ticket';
  const noAssignee = !t.assignedToName;

  return (
    <TableRow
      sx={{
        opacity: item.isHidden ? 0.45 : 1,
        bgcolor: noAssignee ? 'rgba(255,152,0,0.06)' : undefined,
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
      onClick={() => onRowClick(t)}
    >
      {/* Item: ID + Tipo + Área + Prio empilhados verticalmente */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1 }}>
        <Stack spacing={0.4} alignItems="flex-start">
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            #{t.externalId ?? t.id}
          </Typography>
          <Chip
            label={t.type}
            size="small"
            color={isTicket ? 'error' : 'primary'}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.65rem', height: 18 }}
          />
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
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            {t.assignedToName || '—'}
          </Typography>
        </Stack>
      </TableCell>

      {/* SLA + Prazo empilhados */}
      <TableCell sx={{ verticalAlign: 'middle', py: 1, whiteSpace: 'nowrap' }}>
        {isTicket ? (
          item.slaExcluded ? (
            <Chip label="Excluído" size="small" variant="outlined" />
          ) : (
            <Stack spacing={0.3}>
              <Chip
                icon={item.slaViolated ? <TimerOffIcon /> : <TimerIcon />}
                label={formatSlaRemaining(item.businessHoursRemaining)}
                size="small"
                color={slaChipColor(item)}
                variant="outlined"
              />
              {item.expirationDate && (
                <Tooltip
                  title={
                    item.slaViolated
                      ? 'SLA estourado — data limite era:'
                      : 'Data limite do SLA'
                  }
                >
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
                    {new Date(item.expirationDate).toLocaleDateString('pt-BR')}{' '}
                    {new Date(item.expirationDate).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Tooltip>
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
}

const ItemTable = memo(function ItemTable({
  items,
  showAreaColumn,
  showHidden,
  onToggleSla,
  onToggleHidden,
  onCopyLink,
  onRowClick,
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
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
});

// ── Main Component ──

export function DashboardSustentacaoPage() {
  const [items, setItems] = useState<SustentacaoItemWithSLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const api = (
    window as unknown as {
      electronAPI: import('@shared/interfaces/config/index.types').CustomElectronAPI;
    }
  ).electronAPI;

  // ── fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.dashboard.getSustentacaoItems();
      if (res.success && res.data) {
        setItems(res.data);
      } else {
        setError(res.error ?? 'Erro ao carregar itens');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── actions ──
  const handleToggleSla = useCallback(
    async (externalId: string, excluded: boolean) => {
      try {
        if (excluded) {
          await api.dashboard.restoreSla(externalId);
        } else {
          await api.dashboard.excludeSla(externalId);
        }
        await fetchData();
      } catch {
        /* ignore */
      }
    },
    [fetchData],
  );

  const handleToggleHidden = useCallback(
    async (externalId: string, hidden: boolean) => {
      try {
        if (hidden) {
          await api.dashboard.unhideItem(externalId);
        } else {
          await api.dashboard.hideItem(externalId);
        }
        await fetchData();
      } catch {
        /* ignore */
      }
    },
    [fetchData],
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

  const { devItems, auditItems } = useMemo(() => {
    const dev: SustentacaoItemWithSLA[] = [];
    const audit: SustentacaoItemWithSLA[] = [];
    for (const item of items) {
      const s = item.task.status;
      if (DEV_STATUSES.has(s)) dev.push(item);
      else if (AUDIT_STATUSES.has(s)) audit.push(item);
    }
    dev.sort(dashboardSort);
    audit.sort(dashboardSort);
    return { devItems: dev, auditItems: audit };
  }, [items]);

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

      {/* Content */}
      <Stack spacing={3}>
        {/* Desenvolvimento */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <FireIcon sx={{ color: '#ed6c02' }} />
            <Typography variant="h6">Desenvolvimento</Typography>
            <Chip
              label={
                devItems.filter((i) => showHidden || !i.isHidden).length
              }
              size="small"
            />
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
          />
        </Box>

        {/* Auditoria */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <DiamondIcon sx={{ color: '#7e57c2' }} />
            <Typography variant="h6">Auditoria</Typography>
            <Chip
              label={
                auditItems.filter((i) => showHidden || !i.isHidden).length
              }
              size="small"
            />
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
          />
        </Box>
      </Stack>

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </PageLayout>
  );
}


