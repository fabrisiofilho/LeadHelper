import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  TextField,
  MenuItem,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  InputAdornment,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as ImportIcon,
  CloudDownload as FetchIcon,
} from '@mui/icons-material';
import type {
  WorkItem,
  WorkItemFilters,
} from '@shared/interfaces/config/index.types';

interface ExploreTabProps {
  isConnected: boolean;
  workItems: WorkItem[];
  loading: boolean;
  error: string | null;
  onFetchWorkItems: (filters?: WorkItemFilters) => Promise<WorkItem[]>;
  onImportWorkItems: (ids: number[]) => Promise<unknown[]>;
  onClearError: () => void;
}

const WORK_ITEM_TYPES = [
  { value: 'Bug', label: 'Bug' },
  { value: 'Task', label: 'Task' },
  { value: 'User Story', label: 'User Story' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Product Backlog Item', label: 'Product Backlog Item' },
];

const WORK_ITEM_STATES = [
  { value: 'New', label: 'New' },
  { value: 'Active', label: 'Active' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Removed', label: 'Removed' },
  { value: 'To Do', label: 'To Do' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
];

const STATE_COLORS: Record<string, string> = {
  New: '#2196f3',
  Active: '#ff9800',
  'In Progress': '#ff9800',
  'To Do': '#9e9e9e',
  Resolved: '#4caf50',
  Closed: '#4caf50',
  Done: '#4caf50',
  Removed: '#f44336',
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};

export function ExploreTab({
  isConnected,
  workItems,
  loading,
  error,
  onFetchWorkItems,
  onImportWorkItems,
  onClearError,
}: ExploreTabProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(
    null,
  );
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    onClearError();
    setSelectedIds(new Set());
    setImportResult(null);
    setPage(0);
    const filters: WorkItemFilters = {};
    if (selectedTypes.length > 0) filters.types = selectedTypes;
    if (selectedStates.length > 0) filters.states = selectedStates;
    if (searchQuery.trim()) filters.query = searchQuery.trim();
    await onFetchWorkItems(filters);
    setFetched(true);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setImportResult(null);
    onClearError();
    try {
      const result = await onImportWorkItems(Array.from(selectedIds));
      setImportResult({ count: result.length });
      setSelectedIds(new Set());
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === workItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workItems.map((wi) => wi.id)));
    }
  };

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return workItems.slice(start, start + rowsPerPage);
  }, [workItems, page, rowsPerPage]);

  if (!isConnected) {
    return (
      <Box textAlign="center" py={6}>
        <Typography color="text.secondary">
          Configure e teste a conexão na aba Configuração antes de explorar work
          items.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>
          {error}
        </Alert>
      )}
      {importResult && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setImportResult(null)}
        >
          {importResult.count} tarefa(s) importada(s) com sucesso!
        </Alert>
      )}

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
          Filtros de Busca
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Tipo"
            size="small"
            sx={{ minWidth: 180 }}
            SelectProps={{
              multiple: true,
              renderValue: (sel) => (sel as string[]).join(', '),
            }}
            value={selectedTypes}
            onChange={(e) =>
              setSelectedTypes(e.target.value as unknown as string[])
            }
          >
            {WORK_ITEM_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                <Checkbox
                  size="small"
                  checked={selectedTypes.includes(t.value)}
                />
                {t.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Estado"
            size="small"
            sx={{ minWidth: 180 }}
            SelectProps={{
              multiple: true,
              renderValue: (sel) => (sel as string[]).join(', '),
            }}
            value={selectedStates}
            onChange={(e) =>
              setSelectedStates(e.target.value as unknown as string[])
            }
          >
            {WORK_ITEM_STATES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                <Checkbox
                  size="small"
                  checked={selectedStates.includes(s.value)}
                />
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Buscar por título"
            size="small"
            sx={{ minWidth: 220 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            variant="contained"
            onClick={handleFetch}
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <FetchIcon />
              )
            }
          >
            {loading ? 'Buscando...' : 'Buscar Work Items'}
          </Button>
        </Stack>
      </Paper>

      {/* Results */}
      {fetched && workItems.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="text.secondary">
            Nenhum work item encontrado com os filtros selecionados.
          </Typography>
        </Box>
      )}

      {workItems.length > 0 && (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Typography variant="body2" color="text.secondary">
              {workItems.length} work item(s) encontrado(s)
              {selectedIds.size > 0 && ` — ${selectedIds.size} selecionado(s)`}
            </Typography>
            <Button
              variant="contained"
              color="success"
              disabled={selectedIds.size === 0 || importing}
              onClick={handleImport}
              startIcon={
                importing ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ImportIcon />
                )
              }
            >
              {importing
                ? 'Importando...'
                : `Importar Selecionados (${selectedIds.size})`}
            </Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={
                        selectedIds.size === workItems.length &&
                        workItems.length > 0
                      }
                      indeterminate={
                        selectedIds.size > 0 &&
                        selectedIds.size < workItems.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Atribuído</TableCell>
                  <TableCell>Atualizado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.map((wi) => (
                  <TableRow
                    key={wi.id}
                    hover
                    selected={selectedIds.has(wi.id)}
                    onClick={() => toggleSelect(wi.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={selectedIds.has(wi.id)} />
                    </TableCell>
                    <TableCell>{wi.id}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {wi.title}
                    </TableCell>
                    <TableCell>
                      <Chip label={wi.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={wi.state}
                        size="small"
                        sx={{
                          bgcolor: STATE_COLORS[wi.state] || '#9e9e9e',
                          color: '#fff',
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>{wi.assignedTo || '-'}</TableCell>
                    <TableCell>{formatDate(wi.changedDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={workItems.length}
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
