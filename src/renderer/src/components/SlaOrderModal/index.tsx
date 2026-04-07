import {
  Box,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  TimerOff as TimerOffIcon,
  Timer as TimerIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import type { SustentacaoItemWithSLA } from '@shared/interfaces/config/index.types';
import type { Task } from '@shared/interfaces/config/index.types';

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

interface SlaOrderModalProps {
  open: boolean;
  title: string;
  items: SustentacaoItemWithSLA[];
  showHidden: boolean;
  onClose: () => void;
  onRowClick: (task: Task) => void;
}

export function SlaOrderModal({
  open,
  title,
  items,
  showHidden,
  onClose,
  onRowClick,
}: SlaOrderModalProps) {
  if (!open) return null;

  // Only Tickets with active SLA, sorted by most consumed SLA first (highest elapsed → lowest remaining)
  const visible = (showHidden ? items : items.filter((i) => !i.isHidden))
    .filter((i) => i.task.type === 'Ticket' && !i.slaExcluded);

  const sorted = [...visible].sort((a, b) => {
    // Most consumed SLA first (highest businessHoursElapsed = most urgent)
    return b.businessHoursElapsed - a.businessHoursElapsed;
  });

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          p: 3,
          minWidth: 600,
          maxWidth: 900,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TimerIcon color="primary" />
            <Typography variant="h6">
              Ordem de Prioridade SLA — {title}
            </Typography>
            <Chip label={sorted.length} size="small" />
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Typography variant="body2" color="text.secondary" mb={2}>
          Tickets ordenados pelo consumo de SLA — do maior tempo decorrido para o menor.
        </Typography>

        {/* Table */}
        <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 50, fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Título</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Responsável</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Prioridade</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SLA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((item, idx) => {
                const t = item.task;
                const noAssignee = !t.assignedToName;
                const prio = t.priority ?? 'medium';

                return (
                  <TableRow
                    key={t.externalId ?? t.id}
                    sx={{
                      cursor: 'pointer',
                      opacity: item.isHidden ? 0.45 : 1,
                      bgcolor: item.slaViolated ? 'rgba(211,47,47,0.04)' : undefined,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => { onClose(); onRowClick(t); }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="text.secondary">
                        {idx + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        #{t.externalId ?? t.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.4 }}>
                        {t.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        {noAssignee && (
                          <Tooltip title="Sem responsável">
                            <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          </Tooltip>
                        )}
                        <Typography variant="body2">
                          {t.assignedToName || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={PRIO_LABEL[prio] ?? prio}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          bgcolor: PRIO_COLOR[prio] ?? '#757575',
                          color: '#fff',
                          fontSize: '0.65rem',
                          height: 18,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Stack spacing={0.3}>
                        <Chip
                          icon={item.slaViolated ? <TimerOffIcon /> : <TimerIcon />}
                          label={
                            item.slaViolated
                              ? formatSlaDelay(item.businessHoursRemaining)
                              : formatSlaRemaining(item.businessHoursRemaining)
                          }
                          size="small"
                          color={item.slaViolated ? 'error' : item.slaWarning ? 'warning' : 'info'}
                          variant={item.slaViolated ? 'filled' : 'outlined'}
                        />
                        {item.expirationDate && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: item.slaViolated ? 'error.main' : 'text.secondary',
                              fontSize: '0.7rem',
                            }}
                          >
                            {new Date(item.expirationDate).toLocaleDateString('pt-BR')}{' '}
                            {new Date(item.expirationDate).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
