import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { ContentLoading } from '@renderer/components/ContentLoading';
import type { TaskUpdateRecord } from '@shared/interfaces/config/index.types';

interface CardHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: number | null;
  taskTitle?: string;
}

/**
 * Formats a date for display in the history table.
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
/**
 * Truncates a long value string for display.
 */
function truncateValue(value?: string, maxLength = 80): string {
  if (!value) return '—';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}

/**
 * CardHistoryDialog displays the update history of a card in chronological
 * descending order (most recent first).
 *
 * Shows: date, changed by, field changed, old value, new value.
 * Used by both Dashboard Sustentação and Dashboard Projetos.
 *
 * Validates: Requirement 4.1
 */
export function CardHistoryDialog({
  open,
  onClose,
  taskId,
  taskTitle,
}: CardHistoryDialogProps) {
  const [history, setHistory] = useState<TaskUpdateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    setHistory([]);

    try {
      const response =
        await window.electronAPI.dashboard.getTaskUpdateHistory(id);

      if (!response.success) {
        setError(response.error || 'Erro ao carregar histórico');
        return;
      }

      setHistory(response.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro de comunicação',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && taskId !== null) {
      loadHistory(taskId);
    }
    if (!open) {
      setHistory([]);
      setError(null);
    }
  }, [open, taskId, loadHistory]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 1.5,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <HistoryIcon color="primary" />
          <Box>
            <Typography variant="h6" component="span">
              Histórico de Atualizações
            </Typography>
            {taskTitle && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {taskTitle}
              </Typography>
            )}
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" aria-label="Fechar">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, minHeight: 300 }}>
        {loading && (
          <Box sx={{ p: 3 }}>
            <ContentLoading variant="spinner" message="Carregando histórico..." />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {!loading && !error && history.length === 0 && (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              Nenhum registro de atualização encontrado para este card.
            </Alert>
          </Box>
        )}

        {!loading && !error && history.length > 0 && (
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Data</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Alterado por</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Campo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Valor Anterior</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Novo Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(record.changedDate)}
                    </TableCell>
                    <TableCell>
                      {record.changedBy || '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={record.fieldName}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={record.oldValue || undefined}
                    >
                      {truncateValue(record.oldValue)}
                    </TableCell>
                    <TableCell
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={record.newValue || undefined}
                    >
                      {truncateValue(record.newValue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CardHistoryDialog;
