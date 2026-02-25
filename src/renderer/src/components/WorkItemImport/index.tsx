import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Checkbox,
  InputAdornment,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as ImportIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugIcon,
  Assignment as TaskIcon,
  Description as StoryIcon,
  Help as DefaultIcon,
} from '@mui/icons-material';
import { useAzureDevOps } from '@renderer/hooks/useAzureDevOps';
import type { WorkItemFilters } from '@shared/interfaces/config/index.types';
import {
  ImportContainer,
  FiltersSection,
  WorkItemRow,
  WorkItemTypeIcon,
} from './styles';

/**
 * WorkItemImport component
 * Allows fetching and importing work items from Azure DevOps
 *
 * Requirements: 7.6, 7.7, 7.8, 7.9, 7.10
 */

interface WorkItemImportProps {
  onImportSuccess?: () => void;
}

const workItemTypes = [
  { value: '', label: 'Todos os tipos' },
  { value: 'User Story', label: 'User Story' },
  { value: 'Task', label: 'Task' },
  { value: 'Bug', label: 'Bug' },
  { value: 'Feature', label: 'Feature' },
  { value: 'Epic', label: 'Epic' },
];

const workItemStates = [
  { value: '', label: 'Todos os estados' },
  { value: 'New', label: 'New' },
  { value: 'Active', label: 'Active' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Closed', label: 'Closed' },
];

const getWorkItemIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'bug':
      return <BugIcon fontSize="small" color="error" />;
    case 'task':
      return <TaskIcon fontSize="small" color="primary" />;
    case 'user story':
      return <StoryIcon fontSize="small" color="success" />;
    default:
      return <DefaultIcon fontSize="small" color="action" />;
  }
};

const getStateColor = (
  state: string,
): 'default' | 'primary' | 'success' | 'warning' | 'info' => {
  switch (state.toLowerCase()) {
    case 'new':
      return 'default';
    case 'active':
      return 'primary';
    case 'resolved':
      return 'info';
    case 'closed':
      return 'success';
    default:
      return 'default';
  }
};

export function WorkItemImport({ onImportSuccess }: WorkItemImportProps) {
  const {
    workItems,
    loading,
    error,
    isConnected,
    fetchWorkItems,
    importWorkItems,
    clearError,
    clearWorkItems,
  } = useAzureDevOps();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const handleFetchWorkItems = useCallback(async () => {
    clearError();
    setSelectedIds([]);
    setImportSuccess(null);

    const filters: WorkItemFilters = {};

    if (typeFilter) {
      filters.types = [typeFilter];
    }

    if (stateFilter) {
      filters.states = [stateFilter];
    }

    if (searchQuery.trim()) {
      filters.query = searchQuery.trim();
    }

    await fetchWorkItems(filters);
  }, [fetchWorkItems, typeFilter, stateFilter, searchQuery, clearError]);

  useEffect(() => {
    // Clear work items when component unmounts
    return () => {
      clearWorkItems();
    };
  }, [clearWorkItems]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(workItems.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleImport = async () => {
    if (selectedIds.length === 0) return;

    setImportLoading(true);
    setImportSuccess(null);
    clearError();

    try {
      const importedTasks = await importWorkItems(selectedIds);
      if (importedTasks.length > 0) {
        setImportSuccess(
          `${importedTasks.length} work item(s) importado(s) com sucesso!`,
        );
        setSelectedIds([]);
        onImportSuccess?.();
      }
    } finally {
      setImportLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <ImportContainer>
        <Alert severity="warning">
          Configure a conexão com Azure DevOps antes de importar work items.
        </Alert>
      </ImportContainer>
    );
  }

  return (
    <ImportContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight={600}>
          Importar Work Items
        </Typography>
        <IconButton
          size="small"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>

      {/* Filters Section */}
      <Collapse in={filtersExpanded}>
        <FiltersSection>
          <TextField
            size="small"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 200, flex: 1 }}
          />

          <TextField
            select
            size="small"
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            {workItemTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Estado"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            sx={{ minWidth: 150 }}
            slotProps={{
              select: {
                displayEmpty: true,
              },
              inputLabel: { shrink: true },
            }}
          >
            {workItemStates.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            onClick={handleFetchWorkItems}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </FiltersSection>
      </Collapse>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {importSuccess && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setImportSuccess(null)}
        >
          {importSuccess}
        </Alert>
      )}

      {/* Work Items Table */}
      {workItems.length > 0 ? (
        <>
          <Paper
            sx={{ width: '100%', overflow: 'hidden', borderRadius: '0.5rem' }}
          >
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={
                          selectedIds.length > 0 &&
                          selectedIds.length < workItems.length
                        }
                        checked={
                          workItems.length > 0 &&
                          selectedIds.length === workItems.length
                        }
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Atribuído a</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {workItems.map((item) => (
                    <WorkItemRow
                      key={item.id}
                      hover
                      selected={selectedIds.includes(item.id)}
                      onClick={() => handleSelectItem(item.id)}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox checked={selectedIds.includes(item.id)} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          #{item.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <WorkItemTypeIcon>
                          {getWorkItemIcon(item.type)}
                          <span>{item.type}</span>
                        </WorkItemTypeIcon>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.state}
                          color={getStateColor(item.state)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.assignedTo || '-'}
                        </Typography>
                      </TableCell>
                    </WorkItemRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Import Action */}
          <Box
            mt={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              {selectedIds.length} de {workItems.length} item(s) selecionado(s)
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleImport}
              disabled={selectedIds.length === 0 || importLoading}
              startIcon={
                importLoading ? <CircularProgress size={16} /> : <ImportIcon />
              }
            >
              {importLoading
                ? 'Importando...'
                : `Importar ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
            </Button>
          </Box>
        </>
      ) : (
        <Box
          py={4}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {loading
              ? 'Buscando work items...'
              : 'Clique em "Buscar" para carregar work items do Azure DevOps'}
          </Typography>
          {loading && <CircularProgress size={24} sx={{ mt: 2 }} />}
        </Box>
      )}
    </ImportContainer>
  );
}

export default WorkItemImport;
