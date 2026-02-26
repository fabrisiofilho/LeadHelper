import {
  useEffect,
  useRef,
  useState,
  useReducer,
  useCallback,
  useMemo,
} from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  ButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Snackbar,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  FileDownloadOutlined as CsvIcon,
  PictureAsPdfOutlined as PdfIcon,
  AssessmentOutlined as ReportsIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTableSort } from '@renderer/hooks/useTableSort';
import { SortableTableCell } from '@renderer/components/SortableTableCell';
import { PageContainer } from './styles';
import type {
  ReportData,
  ReportPeriod,
  ExportResult,
} from '@shared/interfaces/config/index.types';

const PERIOD_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 },
] as const;

const TYPE_COLORS = [
  '#4d8df7',
  '#1db954',
  '#FFAB00',
  '#FF5630',
  '#a07de8',
  '#00B8D9',
];
const STATUS_COLORS = ['#4d8df7', '#FFAB00', '#1db954', '#FF5630', '#a07de8'];

function buildPeriod(days: number): ReportPeriod {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

/**
 * Deep-clone any value so that frozen objects returned by Electron's
 * contextBridge become mutable plain objects safe for React 19 state.
 */
function clone<T>(v: T): T {
  if (v == null || typeof v !== 'object') return v;
  return JSON.parse(JSON.stringify(v));
}

// --- IPC helpers that bypass the useAzureDevOps hook entirely ---
// This avoids the double-setState cascade (hook loading + component loading)
// that was triggering React 19 FiberRootNode crashes.
async function fetchReport(period: ReportPeriod): Promise<ReportData | null> {
  const response = await (window.electronAPI.azureDevOps as any).getReportData(
    period,
  );
  if (!response?.success) return null;
  return clone(response.data) ?? null;
}

async function doExportCsv(period: ReportPeriod): Promise<ExportResult | null> {
  const response = await (window.electronAPI.azureDevOps as any).exportCsv(
    period,
  );
  if (!response?.success) return null;
  return clone(response.data) ?? null;
}

async function doExportPdf(period: ReportPeriod): Promise<ExportResult | null> {
  const response = await (window.electronAPI.azureDevOps as any).exportPdf(
    period,
  );
  if (!response?.success) return null;
  return clone(response.data) ?? null;
}

// --- Filter state managed via useReducer ---
interface FilterState {
  selectedPreset: number;
  customStart: Date | null;
  customEnd: Date | null;
  isCustom: boolean;
  fetchTrigger: number;
}

type FilterAction =
  | { type: 'SELECT_PRESET'; days: number }
  | { type: 'SET_CUSTOM_START'; date: Date | null }
  | { type: 'SET_CUSTOM_END'; date: Date | null };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SELECT_PRESET':
      return {
        ...state,
        isCustom: false,
        selectedPreset: action.days,
        fetchTrigger: state.fetchTrigger + 1,
      };
    case 'SET_CUSTOM_START': {
      const nextStart = action.date ? new Date(action.date.getTime()) : null;
      const shouldFetch = nextStart != null && state.customEnd != null;
      return {
        ...state,
        customStart: nextStart,
        isCustom: true,
        fetchTrigger: shouldFetch ? state.fetchTrigger + 1 : state.fetchTrigger,
      };
    }
    case 'SET_CUSTOM_END': {
      const nextEnd = action.date ? new Date(action.date.getTime()) : null;
      const shouldFetch = state.customStart != null && nextEnd != null;
      return {
        ...state,
        customEnd: nextEnd,
        isCustom: true,
        fetchTrigger: shouldFetch ? state.fetchTrigger + 1 : state.fetchTrigger,
      };
    }
    default:
      return state;
  }
}

function getCurrentPeriod(state: FilterState): ReportPeriod {
  if (state.isCustom && state.customStart && state.customEnd) {
    const start = new Date(state.customStart.getTime());
    start.setHours(0, 0, 0, 0);
    const end = new Date(state.customEnd.getTime());
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  return buildPeriod(state.selectedPreset);
}

export function AzureDevOpsReportsPage() {
  const [filters, dispatch] = useReducer(filterReducer, {
    selectedPreset: 30,
    customStart: null,
    customEnd: null,
    isCustom: false,
    fetchTrigger: 0,
  });

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const fetchIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++fetchIdRef.current;
    const period = getCurrentPeriod(filters);

    setLoadingReport(true);

    fetchReport(period)
      .then((data) => {
        if (!cancelled && id === fetchIdRef.current) {
          setReportData(data);
        }
      })
      .catch(() => {
        /* swallow – no data */
      })
      .finally(() => {
        if (!cancelled && id === fetchIdRef.current) {
          setLoadingReport(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.fetchTrigger]);

  const handlePresetClick = useCallback((days: number) => {
    dispatch({ type: 'SELECT_PRESET', days });
  }, []);

  const handleCustomStartChange = useCallback((date: Date | null) => {
    dispatch({ type: 'SET_CUSTOM_START', date });
  }, []);

  const handleCustomEndChange = useCallback((date: Date | null) => {
    dispatch({ type: 'SET_CUSTOM_END', date });
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const period = getCurrentPeriod(filters);
      const result = await doExportCsv(period);
      if (result?.success && result.filePath) {
        setSnackbar({
          open: true,
          message: `CSV exportado com sucesso: ${result.filePath}`,
          severity: 'success',
        });
      } else if (result && !result.success && result.error) {
        setSnackbar({ open: true, message: result.error, severity: 'error' });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Erro ao exportar CSV',
        severity: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const period = getCurrentPeriod(filters);
      const result = await doExportPdf(period);
      if (result?.success && result.filePath) {
        setSnackbar({
          open: true,
          message: `PDF exportado com sucesso: ${result.filePath}`,
          severity: 'success',
        });
      } else if (result && !result.success && result.error) {
        setSnackbar({ open: true, message: result.error, severity: 'error' });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Erro ao exportar PDF',
        severity: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const {
    sortedItems: sortedAssignees,
    sortConfig: assigneeSortConfig,
    handleSort: handleAssigneeSort,
  } = useTableSort(reportData?.byAssignee ?? []);

  const {
    sortedItems: sortedProjects,
    sortConfig: projectSortConfig,
    handleSort: handleProjectSort,
  } = useTableSort(reportData?.byProject ?? []);

  const hasData = reportData && reportData.totalItems > 0;
  const isInitialLoad = loadingReport && !reportData;

  // Memoize chart data arrays so Recharts always gets fresh mutable objects
  const byTypeData = useMemo(
    () => (reportData?.byType ?? []).map((item) => ({ ...item })),
    [reportData?.byType],
  );
  const byStatusData = useMemo(
    () => (reportData?.byStatus ?? []).map((item) => ({ ...item })),
    [reportData?.byStatus],
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <PageContainer>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ReportsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>
                Relatórios Azure DevOps
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Visualize métricas e tendências dos work items importados
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar dados em CSV">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<CsvIcon />}
                  onClick={handleExportCsv}
                  disabled={exporting || loadingReport || !hasData}
                  size="small"
                >
                  Exportar CSV
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Exportar relatório em PDF">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<PdfIcon />}
                  onClick={handleExportPdf}
                  disabled={exporting || loadingReport || !hasData}
                  size="small"
                >
                  Exportar PDF
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Period Filter */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: '1rem',
            border: 1,
            borderColor: 'divider',
            p: 2,
            mb: 3,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
            Período
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <ButtonGroup size="small" variant="outlined">
              {PERIOD_PRESETS.map((preset) => (
                <Button
                  key={preset.days}
                  onClick={() => handlePresetClick(preset.days)}
                  variant={
                    !filters.isCustom && filters.selectedPreset === preset.days
                      ? 'contained'
                      : 'outlined'
                  }
                  disabled={loadingReport}
                >
                  {preset.label}
                </Button>
              ))}
            </ButtonGroup>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                ou
              </Typography>
              <DatePicker
                label="Data início"
                value={filters.customStart}
                onChange={handleCustomStartChange}
                disabled={loadingReport}
                slotProps={{
                  textField: { size: 'small', sx: { width: 160 } },
                }}
              />
              <DatePicker
                label="Data fim"
                value={filters.customEnd}
                onChange={handleCustomEndChange}
                disabled={loadingReport}
                slotProps={{
                  textField: { size: 'small', sx: { width: 160 } },
                }}
              />
            </Stack>
          </Stack>
        </Box>

        {/* Loading indicator for subsequent loads */}
        {loadingReport && !isInitialLoad && (
          <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
        )}

        {/* Skeleton for initial load only */}
        {isInitialLoad && (
          <Stack spacing={3}>
            <Skeleton
              variant="rounded"
              height={80}
              sx={{ borderRadius: '1rem' }}
            />
            <Stack direction="row" spacing={3}>
              <Skeleton
                variant="rounded"
                height={300}
                sx={{ flex: 1, borderRadius: '1rem' }}
              />
              <Skeleton
                variant="rounded"
                height={300}
                sx={{ flex: 1, borderRadius: '1rem' }}
              />
            </Stack>
            <Skeleton
              variant="rounded"
              height={200}
              sx={{ borderRadius: '1rem' }}
            />
            <Skeleton
              variant="rounded"
              height={200}
              sx={{ borderRadius: '1rem' }}
            />
          </Stack>
        )}

        {/* Empty State */}
        {!isInitialLoad && !hasData && !loadingReport && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              px: 4,
              bgcolor: 'background.paper',
              borderRadius: '1rem',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <ReportsIcon
              sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum dado encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Não há work items importados para o período selecionado.
            </Typography>
          </Box>
        )}

        {/* Report Content */}
        {!isInitialLoad && hasData && reportData && (
          <Stack
            spacing={3}
            sx={{
              opacity: loadingReport ? 0.5 : 1,
              transition: 'opacity 0.2s ease',
              pointerEvents: loadingReport ? 'none' : 'auto',
            }}
          >
            {/* Total Count */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '1rem',
                border: 1,
                borderColor: 'divider',
                p: 2.5,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Total de work items no período
              </Typography>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {reportData.totalItems}
              </Typography>
            </Box>

            {/* Charts Row */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
              {/* Chart by Type */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: 'background.paper',
                  borderRadius: '1rem',
                  border: 1,
                  borderColor: 'divider',
                  p: 2.5,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  Por Tipo
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={byTypeData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="type"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                    />
                    <YAxis
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#282828',
                        border: '1px solid #404040',
                        borderRadius: 8,
                        color: '#f0f0f0',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Quantidade"
                      radius={[4, 4, 0, 0]}
                    >
                      {byTypeData.map((_, index) => (
                        <Cell
                          key={`type-${index}`}
                          fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Chart by Status */}
              <Box
                sx={{
                  flex: 1,
                  bgcolor: 'background.paper',
                  borderRadius: '1rem',
                  border: 1,
                  borderColor: 'divider',
                  p: 2.5,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  Por Status
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={byStatusData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="status"
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                    />
                    <YAxis
                      tick={{ fill: '#a0a0a0', fontSize: 12 }}
                      axisLine={{ stroke: '#333' }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#282828',
                        border: '1px solid #404040',
                        borderRadius: 8,
                        color: '#f0f0f0',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Quantidade"
                      radius={[4, 4, 0, 0]}
                    >
                      {byStatusData.map((_, index) => (
                        <Cell
                          key={`status-${index}`}
                          fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Stack>

            {/* Table by Assignee */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '1rem',
                border: 1,
                borderColor: 'divider',
                p: 2.5,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Por Responsável
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableTableCell
                        id="assignee"
                        label="Responsável"
                        sortConfig={assigneeSortConfig}
                        onSort={handleAssigneeSort}
                      />
                      <SortableTableCell
                        id="count"
                        label="Quantidade"
                        sortConfig={assigneeSortConfig}
                        onSort={handleAssigneeSort}
                        align="right"
                      />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAssignees.map((row) => (
                      <TableRow key={row.assignee} hover>
                        <TableCell>{row.assignee || 'Não atribuído'}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Table by Project */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: '1rem',
                border: 1,
                borderColor: 'divider',
                p: 2.5,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Por Projeto
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableTableCell
                        id="project"
                        label="Projeto"
                        sortConfig={projectSortConfig}
                        onSort={handleProjectSort}
                      />
                      <SortableTableCell
                        id="count"
                        label="Quantidade"
                        sortConfig={projectSortConfig}
                        onSort={handleProjectSort}
                        align="right"
                      />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedProjects.map((row) => (
                      <TableRow key={row.project} hover>
                        <TableCell>{row.project || 'Sem projeto'}</TableCell>
                        <TableCell align="right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        )}

        {/* Snackbar for export notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={closeSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </PageContainer>
    </LocalizationProvider>
  );
}

export default AzureDevOpsReportsPage;
