import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Sync as SyncIcon,
  SyncProblem as SyncAllIcon,
} from '@mui/icons-material';
import type { Task, SyncResult } from '@shared/interfaces/config/index.types';

interface ImportedTasksTabProps {
  isConnected: boolean;
  onSyncTask: (taskId: number) => Promise<Task | null>;
  onSyncAll: () => Promise<SyncResult | null>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#9e9e9e',
  in_progress: '#ff9800',
  completed: '#4caf50',
  cancelled: '#f44336',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ImportedTasksTab({
  isConnected,
  onSyncTask,
  onSyncAll,
}: ImportedTasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const loadImportedTasks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.task.findAll({
        origin: 'azure_devops',
      });
      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch {
      setError('Erro ao carregar tarefas importadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImportedTasks();
  }, [loadImportedTasks]);

  const handleSyncTask = async (taskId: number) => {
    setSyncingId(taskId);
    setError(null);
    try {
      const updated = await onSyncTask(taskId);
      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      }
    } catch {
      setError(`Erro ao sincronizar tarefa #${taskId}`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    setSyncResult(null);
    setError(null);
    try {
      const result = await onSyncAll();
      if (result) {
        setSyncResult(result);
        // Reload to get updated data
        await loadImportedTasks();
      }
    } catch {
      setError('Erro ao sincronizar tarefas');
    } finally {
      setSyncingAll(false);
    }
  };

  const paginatedTasks = tasks.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  if (!isConnected) {
    return (
      <Box textAlign="center" py={6}>
        <Typography color="text.secondary">
          Configure e teste a conexão na aba Configuração para sincronizar
          tarefas.
        </Typography>
      </Box>
    );
  }

  if (loading && tasks.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <CircularProgress size={36} />
        <Typography color="text.secondary" mt={1}>
          Carregando tarefas importadas...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {syncResult && (
        <Alert
          severity={syncResult.failed > 0 ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setSyncResult(null)}
        >
          Sincronização concluída: {syncResult.synced} sincronizada(s)
          {syncResult.failed > 0 && `, ${syncResult.failed} com erro`}
          {syncResult.errors.length > 0 && (
            <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2 }}>
              {syncResult.errors.slice(0, 5).map((err, i) => (
                <li key={i}>
                  <Typography variant="caption">{err}</Typography>
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="body2" color="text.secondary">
          {tasks.length} tarefa(s) importada(s) do Azure DevOps
        </Typography>
        <Button
          variant="outlined"
          onClick={handleSyncAll}
          disabled={syncingAll || tasks.length === 0}
          startIcon={
            syncingAll ? <CircularProgress size={16} /> : <SyncAllIcon />
          }
        >
          {syncingAll ? 'Sincronizando...' : 'Sincronizar Todas'}
        </Button>
      </Stack>

      {tasks.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            Nenhuma tarefa importada ainda. Use a aba Explorar para buscar e
            importar work items.
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>ID Azure</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Atualizado</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>
                      <Chip
                        label={`#${task.externalId}`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 350,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[task.status] || task.status}
                        size="small"
                        sx={{
                          bgcolor: STATUS_COLORS[task.status] || '#9e9e9e',
                          color: '#fff',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>{formatDate(task.updatedAt)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Sincronizar com Azure DevOps">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleSyncTask(task.id)}
                            disabled={syncingId === task.id || syncingAll}
                          >
                            {syncingId === task.id ? (
                              <CircularProgress size={18} />
                            ) : (
                              <SyncIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={tasks.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            labelRowsPerPage="Itens por página"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count}`
            }
          />
        </>
      )}
    </Box>
  );
}
