import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  TableSortLabel,
  TablePagination,
  Skeleton,
  Snackbar,
  Alert,
  Tooltip as MuiTooltip,
  LinearProgress,
  Tabs,
  Tab,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  PictureAsPdfOutlined as PdfIcon,
  AssessmentOutlined as ReportsIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  ListAlt as ListIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { PageContainer } from './styles';
import type {
  ReportData,
  ReportItem,
  ReportPeriod,
  ExportResult,
} from '@shared/interfaces/config/index.types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function deepClone<T>(v: T): T {
  if (v == null || typeof v !== 'object') return v;
  try {
    return structuredClone(v);
  } catch {
    return JSON.parse(JSON.stringify(v));
  }
}

function fmtDate(d?: Date | string): string {
  if (!d) return '-';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('pt-BR');
}

const PERIOD_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: '90 dias', days: 90 },
];

const TYPE_COLORS = [
  '#4d8df7',
  '#1db954',
  '#FFAB00',
  '#FF5630',
  '#a07de8',
  '#00B8D9',
];
const STATUS_COLORS = ['#4d8df7', '#FFAB00', '#1db954', '#FF5630', '#a07de8'];

const TYPE_COLOR_MAP: Record<string, string> = {};
const STATUS_COLOR_MAP: Record<string, string> = {};

function buildPeriod(days: number): ReportPeriod {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
}

/* ------------------------------------------------------------------ */
/*  IPC                                                               */
/* ------------------------------------------------------------------ */
async function fetchReport(period: ReportPeriod): Promise<ReportData | null> {
  try {
    const raw = await window.electronAPI.azureDevOps.getReportData(period);
    const response = deepClone(raw);
    if (!response?.success || !response.data) return null;
    return response.data;
  } catch {
    return null;
  }
}

async function doExportPdf(period: ReportPeriod): Promise<ExportResult | null> {
  try {
    const raw = await window.electronAPI.azureDevOps.exportPdf(period);
    const response = deepClone(raw);
    if (!response?.success || !response.data) return null;
    return response.data;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  SimpleBarChart (CSS only)                                         */
/* ------------------------------------------------------------------ */
interface BarItem {
  label: string;
  value: number;
  color: string;
}

function SimpleBarChart({
  items,
  height = 260,
}: {
  items: BarItem[];
  height?: number;
}) {
  const maxVal = Math.max(...items.map((d) => d.value), 1);
  // When many items, use a fixed min-width per bar and allow horizontal scroll
  const needsScroll = items.length > 6;
  return (
    <Box
      sx={{
        overflowX: needsScroll ? 'auto' : 'hidden',
        overflowY: 'hidden',
        pb: needsScroll ? 1 : 0,
        // Thin scrollbar
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'action.disabled',
          borderRadius: 3,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          height,
          pt: 2,
          minWidth: needsScroll ? items.length * 64 : undefined,
        }}
      >
        {items.map((item, i) => {
          const pct = (item.value / maxVal) * 100;
          return (
            <MuiTooltip
              key={i}
              title={`${item.label}: ${item.value}`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  flex: needsScroll ? '0 0 56px' : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontSize: '0.7rem' }}
                >
                  {item.value}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 48,
                    height: `${Math.max(pct, 2)}%`,
                    bgcolor: item.color,
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.4s ease',
                    minHeight: 4,
                    '&:hover': { opacity: 0.8 },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    mt: 0.5,
                    textAlign: 'center',
                    fontSize: '0.65rem',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 56,
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            </MuiTooltip>
          );
        })}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Sort hook                                                         */
/* ------------------------------------------------------------------ */
type SortDir = 'asc' | 'desc';

function useSortable<T extends Record<string, unknown>>(items: T[]) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggle = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}

/* ------------------------------------------------------------------ */
/*  Work Item Detail Modal                                            */
/* ------------------------------------------------------------------ */
function WorkItemDetailModal({
  item,
  open,
  onClose,
}: {
  item: ReportItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  const fields: Array<{ label: string; value: string }> = [
    { label: 'ID', value: String(item.id) },
    { label: 'Título', value: item.title },
    { label: 'Tipo', value: item.type },
    { label: 'Tipo Original', value: item.originalType || '-' },
    { label: 'Status', value: item.status },
    { label: 'Responsável', value: item.assignee || 'Não atribuído' },
    { label: 'Projeto', value: item.project || '-' },
    { label: 'Area Path', value: item.areaPath || '-' },
    { label: 'Iteration Path', value: item.iterationPath || '-' },
    { label: 'Tags', value: item.tags || '-' },
    {
      label: 'Story Points',
      value: item.storyPoints != null ? String(item.storyPoints) : '-',
    },
    { label: 'Criado em', value: fmtDate(item.createdAt) },
    { label: 'Atualizado em', value: fmtDate(item.updatedAt) },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Chip
            label={item.type}
            size="small"
            sx={{
              bgcolor: (TYPE_COLOR_MAP[item.type] || '#4d8df7') + '22',
              color: TYPE_COLOR_MAP[item.type] || '#4d8df7',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
          <Typography variant="subtitle1" fontWeight={600} noWrap>
            #{item.id}
          </Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="h6" fontWeight={600} mb={2}>
          {item.title}
        </Typography>
        <Stack spacing={1.5}>
          {fields.map((f) => (
            <Stack
              key={f.label}
              direction="row"
              spacing={2}
              alignItems="baseline"
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 130, flexShrink: 0 }}
              >
                {f.label}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                {f.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Work Items Tab (table like Gestão de Tarefas)                     */
/* ------------------------------------------------------------------ */
interface PlainItem {
  id: number;
  title: string;
  type: string;
  originalType: string;
  status: string;
  assignee: string;
  project: string;
  areaPath: string;
  iterationPath: string;
  tags: string;
  storyPoints: number | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function WorkItemsTab({
  items,
  onSelectItem,
}: {
  items: PlainItem[];
  onSelectItem: (item: PlainItem) => void;
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(term) ||
        it.assignee.toLowerCase().includes(term) ||
        it.project.toLowerCase().includes(term) ||
        String(it.id).includes(term) ||
        it.type.toLowerCase().includes(term) ||
        it.status.toLowerCase().includes(term),
    );
  }, [items, search]);

  const { sorted, sortKey, sortDir, toggle } = useSortable(filtered);

  const paginated = useMemo(
    () => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sorted, page, rowsPerPage],
  );

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [search]);

  const cols: Array<{
    id: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    width?: number;
  }> = [
    { id: 'id', label: 'ID', width: 70 },
    { id: 'title', label: 'Título' },
    { id: 'type', label: 'Tipo', width: 120 },
    { id: 'status', label: 'Status', width: 120 },
    { id: 'assignee', label: 'Responsável', width: 160 },
    { id: 'project', label: 'Projeto', width: 150 },
    { id: 'storyPoints', label: 'Pontos', width: 80, align: 'right' },
    { id: 'createdAt', label: 'Criado', width: 100 },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <TextField
          size="small"
          placeholder="Buscar por título, responsável, projeto, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 400, maxWidth: '100%' }}
        />
      </Box>
      <Divider />

      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {cols.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  sx={{ width: col.width }}
                >
                  <TableSortLabel
                    active={sortKey === col.id}
                    direction={sortKey === col.id ? sortDir : 'asc'}
                    onClick={() => toggle(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={cols.length} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    Nenhum work item encontrado
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onSelectItem(row)}
                >
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      #{row.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      noWrap
                      sx={{ maxWidth: 300 }}
                    >
                      {row.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.type}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: (TYPE_COLOR_MAP[row.type] || '#4d8df7') + '18',
                        color: TYPE_COLOR_MAP[row.type] || '#4d8df7',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor:
                          (STATUS_COLOR_MAP[row.status] || '#4d8df7') + '20',
                        color: STATUS_COLOR_MAP[row.status] || '#4d8df7',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {row.assignee || 'Não atribuído'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {row.project || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {row.storyPoints != null ? row.storyPoints : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {fmtDate(row.createdAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 15, 25, 50]}
        labelRowsPerPage="Por página:"
        sx={{ flexShrink: 0 }}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Tab                                                     */
/* ------------------------------------------------------------------ */
function DashboardTab({
  reportData,
  byTypeBars,
  byStatusBars,
  assigneeData,
  projectData,
}: {
  reportData: ReportData;
  byTypeBars: BarItem[];
  byStatusBars: BarItem[];
  assigneeData: Array<{
    assignee: string;
    count: number;
    [k: string]: unknown;
  }>;
  projectData: Array<{ project: string; count: number; [k: string]: unknown }>;
}) {
  const assigneeSort = useSortable(assigneeData);
  const projectSort = useSortable(projectData);

  return (
    <Stack spacing={3} sx={{ p: 2.5, overflow: 'auto' }}>
      {/* Total */}
      <Box
        sx={{ bgcolor: 'background.default', borderRadius: '0.75rem', p: 2.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          Total de work items no período
        </Typography>
        <Typography variant="h3" fontWeight={700} color="primary.main">
          {reportData.totalItems}
        </Typography>
      </Box>

      {/* Charts */}
      <Stack spacing={3}>
        <Box
          sx={{
            bgcolor: 'background.default',
            borderRadius: '0.75rem',
            p: 2.5,
            overflow: 'hidden',
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Por Tipo
          </Typography>
          {byTypeBars.length > 0 ? (
            <SimpleBarChart items={byTypeBars} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: 'background.default',
            borderRadius: '0.75rem',
            p: 2.5,
            overflow: 'hidden',
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Por Status
          </Typography>
          {byStatusBars.length > 0 ? (
            <SimpleBarChart items={byStatusBars} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem dados
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Summary tables */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.default',
            borderRadius: '0.75rem',
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
                  <TableCell>
                    <TableSortLabel
                      active={assigneeSort.sortKey === 'assignee'}
                      direction={
                        assigneeSort.sortKey === 'assignee'
                          ? assigneeSort.sortDir
                          : 'asc'
                      }
                      onClick={() => assigneeSort.toggle('assignee')}
                    >
                      Responsável
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={assigneeSort.sortKey === 'count'}
                      direction={
                        assigneeSort.sortKey === 'count'
                          ? assigneeSort.sortDir
                          : 'asc'
                      }
                      onClick={() => assigneeSort.toggle('count')}
                    >
                      Qtd
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assigneeSort.sorted.map((row, i) => (
                  <TableRow key={row.assignee || `u-${i}`} hover>
                    <TableCell>{row.assignee || 'Não atribuído'}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.default',
            borderRadius: '0.75rem',
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
                  <TableCell>
                    <TableSortLabel
                      active={projectSort.sortKey === 'project'}
                      direction={
                        projectSort.sortKey === 'project'
                          ? projectSort.sortDir
                          : 'asc'
                      }
                      onClick={() => projectSort.toggle('project')}
                    >
                      Projeto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={projectSort.sortKey === 'count'}
                      direction={
                        projectSort.sortKey === 'count'
                          ? projectSort.sortDir
                          : 'asc'
                      }
                      onClick={() => projectSort.toggle('count')}
                    >
                      Qtd
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectSort.sorted.map((row, i) => (
                  <TableRow key={row.project || `p-${i}`} hover>
                    <TableCell>{row.project || 'Sem projeto'}</TableCell>
                    <TableCell align="right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export function AzureDevOpsReportsPage() {
  const [selectedPreset, setSelectedPreset] = useState(30);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSev, setSnackSev] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState<ReportItem | null>(null);

  const fetchIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++fetchIdRef.current;
    const period = buildPeriod(selectedPreset);

    setLoadingReport(true);
    fetchReport(period)
      .then((data) => {
        if (!cancelled && id === fetchIdRef.current) setReportData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled && id === fetchIdRef.current) setLoadingReport(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPreset]);

  const handleExportPdf = useCallback(async () => {
    setExporting(true);
    try {
      const result = await doExportPdf(buildPeriod(selectedPreset));
      if (result?.success && result.filePath) {
        setSnackMsg(`PDF exportado: ${result.filePath}`);
        setSnackSev('success');
      } else if (result && !result.success && result.error) {
        setSnackMsg(result.error);
        setSnackSev('error');
      }
      setSnackOpen(true);
    } catch {
      setSnackMsg('Erro ao exportar PDF');
      setSnackSev('error');
      setSnackOpen(true);
    } finally {
      setExporting(false);
    }
  }, [selectedPreset]);

  /* --- Build color maps from report data --- */
  useEffect(() => {
    if (!reportData) return;
    // Clear and rebuild
    for (const k of Object.keys(TYPE_COLOR_MAP)) delete TYPE_COLOR_MAP[k];
    for (const k of Object.keys(STATUS_COLOR_MAP)) delete STATUS_COLOR_MAP[k];
    (reportData.byType ?? []).forEach((d, i) => {
      TYPE_COLOR_MAP[d.type] = TYPE_COLORS[i % TYPE_COLORS.length];
    });
    (reportData.byStatus ?? []).forEach((d, i) => {
      STATUS_COLOR_MAP[d.status] = STATUS_COLORS[i % STATUS_COLORS.length];
    });
  }, [reportData]);

  /* --- Derived data --- */
  const byTypeBars: BarItem[] = useMemo(
    () =>
      (reportData?.byType ?? []).map((d, i) => ({
        label: String(d.type),
        value: Number(d.count),
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      })),
    [reportData],
  );
  const byStatusBars: BarItem[] = useMemo(
    () =>
      (reportData?.byStatus ?? []).map((d, i) => ({
        label: String(d.status),
        value: Number(d.count),
        color: STATUS_COLORS[i % STATUS_COLORS.length],
      })),
    [reportData],
  );
  const assigneeData = useMemo(
    () =>
      (reportData?.byAssignee ?? []).map((d) => ({
        assignee: String(d.assignee ?? ''),
        count: Number(d.count),
      })),
    [reportData],
  );
  const projectData = useMemo(
    () =>
      (reportData?.byProject ?? []).map((d) => ({
        project: String(d.project ?? ''),
        count: Number(d.count),
      })),
    [reportData],
  );

  /* --- Flat items for the work items tab --- */
  const plainItems: PlainItem[] = useMemo(
    () =>
      (reportData?.items ?? []).map((d) => ({
        id: Number(d.id),
        title: String(d.title ?? ''),
        type: String(d.type ?? ''),
        originalType: String(d.originalType ?? ''),
        status: String(d.status ?? ''),
        assignee: String(d.assignee ?? ''),
        project: String(d.project ?? ''),
        areaPath: String(d.areaPath ?? ''),
        iterationPath: String(d.iterationPath ?? ''),
        tags: String(d.tags ?? ''),
        storyPoints: d.storyPoints != null ? Number(d.storyPoints) : null,
        createdAt: d.createdAt ? String(d.createdAt) : '',
        updatedAt: d.updatedAt ? String(d.updatedAt) : '',
      })),
    [reportData],
  );

  const hasData = reportData != null && reportData.totalItems > 0;
  const isInitialLoad = loadingReport && reportData == null;

  const handleSelectWorkItem = useCallback((item: PlainItem) => {
    setSelectedItem({
      id: item.id,
      title: item.title,
      type: item.type,
      originalType: item.originalType || undefined,
      status: item.status,
      assignee: item.assignee || undefined,
      project: item.project || undefined,
      areaPath: item.areaPath || undefined,
      iterationPath: item.iterationPath || undefined,
      tags: item.tags || undefined,
      storyPoints: item.storyPoints ?? undefined,
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
    });
  }, []);

  return (
    <PageContainer
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexShrink={0}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ReportsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h4" fontWeight={700}>
              Relatórios Azure DevOps
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Visualize métricas e explore os work items importados
          </Typography>
        </Box>
        <MuiTooltip title="Exportar relatório em PDF">
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
        </MuiTooltip>
      </Stack>

      {/* Period */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '1rem',
          border: 1,
          borderColor: 'divider',
          p: 2,
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
          Período
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          {PERIOD_PRESETS.map((p) => (
            <Button
              key={p.days}
              onClick={() => setSelectedPreset(p.days)}
              variant={selectedPreset === p.days ? 'contained' : 'outlined'}
              disabled={loadingReport}
            >
              {p.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {loadingReport && !isInitialLoad && (
        <LinearProgress sx={{ mb: 1, borderRadius: 1, flexShrink: 0 }} />
      )}

      {isInitialLoad && (
        <Stack spacing={3} sx={{ flex: 1 }}>
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
        </Stack>
      )}

      {!isInitialLoad && !hasData && !loadingReport && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 8,
            bgcolor: 'background.paper',
            borderRadius: '1rem',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <ReportsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum dado encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Não há work items importados para o período selecionado.
          </Typography>
        </Box>
      )}

      {!isInitialLoad && hasData && reportData && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: '1rem',
            border: 1,
            borderColor: 'divider',
            minHeight: 0,
            overflow: 'hidden',
            opacity: loadingReport ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
            pointerEvents: loadingReport ? 'none' : 'auto',
          }}
        >
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              px: 2,
              flexShrink: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Tab
              icon={<DashboardIcon fontSize="small" />}
              iconPosition="start"
              label="Dashboard"
              sx={{ textTransform: 'none', minHeight: 48 }}
            />
            <Tab
              icon={<ListIcon fontSize="small" />}
              iconPosition="start"
              label={`Work Items (${reportData.totalItems})`}
              sx={{ textTransform: 'none', minHeight: 48 }}
            />
          </Tabs>

          {/* Tab content */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {activeTab === 0 && (
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                <DashboardTab
                  reportData={reportData}
                  byTypeBars={byTypeBars}
                  byStatusBars={byStatusBars}
                  assigneeData={assigneeData}
                  projectData={projectData}
                />
              </Box>
            )}
            {activeTab === 1 && (
              <WorkItemsTab
                items={plainItems}
                onSelectItem={handleSelectWorkItem}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Detail modal */}
      <WorkItemDetailModal
        item={selectedItem}
        open={selectedItem != null}
        onClose={() => setSelectedItem(null)}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackOpen(false)}
          severity={snackSev}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}

export default AzureDevOpsReportsPage;
