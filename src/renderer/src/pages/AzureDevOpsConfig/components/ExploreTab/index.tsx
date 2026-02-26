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
  Tooltip,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as ImportIcon,
  CloudDownload as FetchIcon,
  Clear as ClearIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import type {
  WorkItem,
  WorkItemFilters,
} from '@shared/interfaces/config/index.types';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { SortableTableCell } from '@renderer/components/SortableTableCell';
import { IterationSelector } from '@renderer/components/IterationSelector';
import { WorkItemDetailModal } from '../WorkItemDetailModal';

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
  { value: 'Epic', label: 'Epic' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Improvement', label: 'Improvement' },
  { value: 'Product Backlog Item', label: 'Product Backlog Item' },
  { value: 'Rework', label: 'Rework' },
  { value: 'Task', label: 'Task' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'User Story', label: 'User Story' },
];

const WORK_ITEM_STATES = [
  { value: 'Novo', label: 'Novo' },
  { value: 'Em levantamento', label: 'Em levantamento' },
  { value: 'Backlog comprometido', label: 'Backlog comprometido' },
  { value: 'Preparando para Dev', label: 'Preparando para Dev' },
  { value: 'Em desenvolvimento', label: 'Em desenvolvimento' },
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Aguardando auditoria', label: 'Aguardando auditoria' },
  { value: 'Em auditoria', label: 'Em auditoria' },
  { value: 'Em homologação', label: 'Em homologação' },
  { value: 'Aguardando validação', label: 'Aguardando validação' },
  { value: 'Aguardando implantação', label: 'Aguardando implantação' },
  { value: 'Finalizado', label: 'Finalizado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

const STATE_COLORS: Record<string, string> = {
  Novo: '#2196f3',
  'Em levantamento': '#90a4ae',
  'Backlog comprometido': '#78909c',
  'Preparando para Dev': '#7e57c2',
  'Em desenvolvimento': '#ff9800',
  'Em andamento': '#ff9800',
  'Aguardando auditoria': '#ab47bc',
  'Em auditoria': '#8e24aa',
  'Em homologação': '#26a69a',
  'Aguardando validação': '#5c6bc0',
  'Aguardando implantação': '#42a5f5',
  Finalizado: '#4caf50',
  Cancelado: '#f44336',
};

const TYPE_COLORS: Record<string, string> = {
  Bug: '#cc293d',
  Epic: '#ff7b00',
  Feature: '#773b93',
  Improvement: '#4caf50',
  'Product Backlog Item': '#009ccc',
  Rework: '#795548',
  Task: '#f2cb1d',
  Ticket: '#0097a7',
  'User Story': '#009ccc',
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
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [selectedIterationPath, setSelectedIterationPath] = useState<string | null>(null);
  const [createdAfter, setCreatedAfter] = useState<Date | null>(null);
  const [createdBefore, setCreatedBefore] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(
    null,
  );
  const [fetched, setFetched] = useState(false);
  const [detailItem, setDetailItem] = useState<WorkItem | null>(null);

  // Client-side filtering for assignedTo and date range (post-fetch)
  const filteredWorkItems = useMemo(() => {
    let items = workItems;

    if (assignedToFilter.trim()) {
      const search = assignedToFilter.toLowerCase();
      items = items.filter((wi) =>
        wi.assignedTo?.toLowerCase().includes(search),
      );
    }

    if (createdAfter) {
      const after = new Date(createdAfter);
      after.setHours(0, 0, 0, 0);
      items = items.filter((wi) => {
        const d =
          typeof wi.createdDate === 'string'
            ? new Date(wi.createdDate)
            : wi.createdDate;
        return d >= after;
      });
    }

    if (createdBefore) {
      const before = new Date(createdBefore);
      before.setHours(23, 59, 59, 999);
      items = items.filter((wi) => {
        const d =
          typeof wi.createdDate === 'string'
            ? new Date(wi.createdDate)
            : wi.createdDate;
        return d <= before;
      });
    }

    return items;
  }, [workItems, assignedToFilter, createdAfter, createdBefore]);

  const { sortedItems, sortConfig, handleSort } =
    useTableSort(filteredWorkItems);

  // Unique assignees for info
  const uniqueAssignees = useMemo(() => {
    const set = new Set<string>();
    workItems.forEach((wi) => {
      if (wi.assignedTo) set.add(wi.assignedTo);
    });
    return Array.from(set).sort();
  }, [workItems]);

  // Stats
  const stats = useMemo(() => {
    const typeCount: Record<string, number> = {};
    const stateCount: Record<string, number> = {};
    filteredWorkItems.forEach((wi) => {
      typeCount[wi.type] = (typeCount[wi.type] || 0) + 1;
      stateCount[wi.state] = (stateCount[wi.state] || 0) + 1;
    });
    return { typeCount, stateCount };
  }, [filteredWorkItems]);

  const handleFetch = async () => {
    onClearError();
    setSelectedIds(new Set());
    setImportResult(null);
    setPage(0);
    const filters: WorkItemFilters = {};
    if (selectedTypes.length > 0) filters.types = selectedTypes;
    if (selectedStates.length > 0) filters.states = selectedStates;
    if (searchQuery.trim()) filters.query = searchQuery.trim();
    if (selectedIterationPath) filters.iterationPath = selectedIterationPath;
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

  const handleClearFilters = () => {
    setSelectedTypes([]);
    setSelectedStates([]);
    setSearchQuery('');
    setAssignedToFilter('');
    setSelectedIterationPath(null);
    setCreatedAfter(null);
    setCreatedBefore(null);
    setPage(0);
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedStates.length > 0 ||
    searchQuery.trim() !== '' ||
    assignedToFilter.trim() !== '' ||
    selectedIterationPath !== null ||
    createdAfter !== null ||
    createdBefore !== null;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map((wi) => wi.id)));
    }
  };

  const selectCurrentPage = () => {
    const pageItems = paginatedItems.map((wi) => wi.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageItems.forEach((id) => next.add(id));
      return next;
    });
  };

  const paginatedItems = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedItems.slice(start, start + rowsPerPage);
  }, [sortedItems, page, rowsPerPage]);

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
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={1.5}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Filtros de Busca
            </Typography>
            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
              >
                Limpar Filtros
              </Button>
            )}
          </Stack>
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

            <IterationSelector
              value={selectedIterationPath}
              onChange={setSelectedIterationPath}
              disabled={loading}
            />

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

            <TextField
              label="Atribuído a"
              size="small"
              sx={{ minWidth: 180 }}
              value={assignedToFilter}
              onChange={(e) => {
                setAssignedToFilter(e.target.value);
                setPage(0);
              }}
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

            <DatePicker
              label="Criado após"
              value={createdAfter}
              onChange={(v) => {
                setCreatedAfter(v);
                setPage(0);
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: 160 },
                },
              }}
            />

            <DatePicker
              label="Criado antes"
              value={createdBefore}
              onChange={(v) => {
                setCreatedBefore(v);
                setPage(0);
              }}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: 160 },
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

        {/* Stats chips */}
        {fetched && sortedItems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
            >
              <Typography variant="caption" color="text.secondary" mr={1}>
                Resumo:
              </Typography>
              {Object.entries(stats.typeCount).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type}: ${count}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: TYPE_COLORS[type] || '#9e9e9e',
                    color: TYPE_COLORS[type] || '#9e9e9e',
                  }}
                />
              ))}
              <Box
                sx={{
                  mx: 0.5,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  height: 20,
                }}
              />
              {Object.entries(stats.stateCount).map(([state, count]) => (
                <Chip
                  key={state}
                  label={`${state}: ${count}`}
                  size="small"
                  sx={{
                    bgcolor: (STATE_COLORS[state] || '#9e9e9e') + '20',
                    color: STATE_COLORS[state] || '#9e9e9e',
                    fontWeight: 500,
                  }}
                />
              ))}
              {uniqueAssignees.length > 0 && (
                <>
                  <Box
                    sx={{
                      mx: 0.5,
                      borderLeft: '1px solid',
                      borderColor: 'divider',
                      height: 20,
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {uniqueAssignees.length} responsável(is)
                  </Typography>
                </>
              )}
            </Stack>
          </Paper>
        )}

        {/* Loading skeleton for table */}
        {loading && !fetched && sortedItems.length === 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['', 'ID', 'Título', 'Tipo', 'Estado', 'Atribuído', 'Criado', 'Atualizado', ''].map((col, i) => (
                    <TableCell key={i}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell padding="checkbox"><Skeleton variant="rounded" width={20} height={20} /></TableCell>
                    <TableCell><Skeleton variant="text" width={50} /></TableCell>
                    <TableCell><Skeleton variant="text" width="80%" /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                    <TableCell><Skeleton variant="text" width={100} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="text" width={80} /></TableCell>
                    <TableCell><Skeleton variant="circular" width={28} height={28} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Results */}
        {fetched && sortedItems.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Nenhum work item encontrado com os filtros selecionados.
            </Typography>
          </Box>
        )}

        {sortedItems.length > 0 && (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {filteredWorkItems.length} work item(s) encontrado(s)
                  {selectedIds.size > 0 &&
                    ` — ${selectedIds.size} selecionado(s)`}
                </Typography>
                <Tooltip title="Selecionar página atual">
                  <IconButton size="small" onClick={selectCurrentPage}>
                    <SelectAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {selectedIds.size > 0 && (
                  <Tooltip title="Limpar seleção">
                    <IconButton
                      size="small"
                      onClick={() => setSelectedIds(new Set())}
                    >
                      <DeselectIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
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
                          selectedIds.size === sortedItems.length &&
                          sortedItems.length > 0
                        }
                        indeterminate={
                          selectedIds.size > 0 &&
                          selectedIds.size < sortedItems.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </TableCell>
                    <SortableTableCell
                      id="id"
                      label="ID"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={80}
                    />
                    <SortableTableCell
                      id="title"
                      label="Título"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableTableCell
                      id="type"
                      label="Tipo"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={140}
                    />
                    <SortableTableCell
                      id="state"
                      label="Estado"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={120}
                    />
                    <SortableTableCell
                      id="assignedTo"
                      label="Atribuído"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={160}
                    />
                    <SortableTableCell
                      id="createdDate"
                      label="Criado"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={110}
                    />
                    <SortableTableCell
                      id="changedDate"
                      label="Atualizado"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      width={110}
                    />
                    <TableCell width={50} />
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
                        <Checkbox
                          size="small"
                          checked={selectedIds.has(wi.id)}
                        />
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
                        <Tooltip title={wi.title} placement="top-start">
                          <span>{wi.title}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={wi.type}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: TYPE_COLORS[wi.type] || '#9e9e9e',
                            color: TYPE_COLORS[wi.type] || '#9e9e9e',
                          }}
                        />
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
                      <TableCell>
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 150 }}
                        >
                          {wi.assignedTo || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(wi.createdDate)}</TableCell>
                      <TableCell>{formatDate(wi.changedDate)}</TableCell>
                      <TableCell padding="none" align="center">
                        <Tooltip title="Ver detalhes">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailItem(wi);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={sortedItems.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 15, 25, 50, 100]}
              labelRowsPerPage="Itens por página"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} de ${count}`
              }
            />
          </>
        )}

        <WorkItemDetailModal
          open={!!detailItem}
          workItem={detailItem}
          onClose={() => setDetailItem(null)}
        />
      </Box>
    </LocalizationProvider>
  );
}
