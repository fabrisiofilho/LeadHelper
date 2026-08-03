import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Button,
  Paper,
  Skeleton,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { useSlaConfig } from '@renderer/hooks/useSlaConfig';
import { useAzureDevOpsProjects } from '@renderer/hooks/useAzureDevOpsProjects';
import type {
  SlaProjectConfig,
  SlaConfigEntry,
  SlaSubArea,
  AzureDevOpsProjectConfig,
} from '@shared/interfaces/config/index.types';
import { SLA_SUB_AREA_LABELS } from '@shared/interfaces/config/index.types';

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES: {
  key: SlaConfigEntry['priority'];
  label: string;
  color: string;
}[] = [
  { key: 'critical', label: 'Crítica', color: '#d32f2f' },
  { key: 'high', label: 'Alta', color: '#ed6c02' },
  { key: 'medium', label: 'Média', color: '#0288d1' },
  { key: 'low', label: 'Baixa', color: '#2e7d32' },
];

const SUB_AREAS: SlaSubArea[] = [
  'gestao_terceiros',
  'chamada_tecnologica',
  'outros',
];

const DEFAULT_LIMITS: Record<string, number> = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 40,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursLabel(h: number): string {
  if (h < 8) return `${h}h úteis`;
  const days = h / 8;
  return Number.isInteger(days)
    ? `${days} dia${days > 1 ? 's' : ''} útil`
    : `${h}h úteis`;
}

function buildKey(subArea: SlaSubArea, priority: string): string {
  return `${subArea}:${priority}`;
}

function configToMap(config: SlaProjectConfig): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of config.entries) {
    m.set(buildKey(e.subArea, e.priority), e.hoursLimit);
  }
  return m;
}

function mapToEntries(m: Map<string, number>): SlaConfigEntry[] {
  const entries: SlaConfigEntry[] = [];
  for (const sa of SUB_AREAS) {
    for (const p of PRIORITIES) {
      entries.push({
        subArea: sa,
        priority: p.key,
        hoursLimit: m.get(buildKey(sa, p.key)) ?? DEFAULT_LIMITS[p.key],
      });
    }
  }
  return entries;
}

// ── Component ────────────────────────────────────────────────────────────────

export function SlaConfigPage() {
  const {
    projects,
    loading: projectsLoading,
    listProjects,
  } = useAzureDevOpsProjects();
  const { loading, saving, error, getByProject, saveRules, clearError } =
    useSlaConfig();

  const [selectedProject, setSelectedProject] =
    useState<AzureDevOpsProjectConfig | null>(null);
  const [localMap, setLocalMap] = useState<Map<string, number>>(new Map());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(
    new Map(),
  );

  // Load projects on mount
  useEffect(() => {
    listProjects();
  }, [listProjects]);

  // Auto-select first active project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      const first = projects.find((p) => p.isActive) ?? projects[0];
      setSelectedProject(first);
    }
  }, [projects, selectedProject]);

  // Load SLA config when project changes
  useEffect(() => {
    if (!selectedProject) return;
    let cancelled = false;
    getByProject(selectedProject.id).then((cfg) => {
      if (!cancelled && cfg) {
        setLocalMap(configToMap(cfg));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProject, getByProject]);

  const handleValueChange = useCallback(
    (subArea: SlaSubArea, priority: string, raw: string) => {
      const key = buildKey(subArea, priority);
      const val = parseFloat(raw);
      const newErrors = new Map(validationErrors);

      if (raw === '' || isNaN(val) || val <= 0) {
        newErrors.set(key, 'Valor inválido (mín: 0,5h)');
      } else {
        newErrors.delete(key);
      }

      setValidationErrors(newErrors);
      setLocalMap((prev) => {
        const next = new Map(prev);
        next.set(key, isNaN(val) ? 0 : val);
        return next;
      });
    },
    [validationErrors],
  );

  const handleReset = useCallback(() => {
    const defaults = new Map<string, number>();
    for (const sa of SUB_AREAS) {
      for (const p of PRIORITIES) {
        defaults.set(buildKey(sa, p.key), DEFAULT_LIMITS[p.key]);
      }
    }
    setLocalMap(defaults);
    setValidationErrors(new Map());
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedProject) return;
    if (validationErrors.size > 0) return;

    setSaveSuccess(false);
    clearError();

    const result = await saveRules({
      configId: selectedProject.id,
      entries: mapToEntries(localMap),
    });

    if (result) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }, [selectedProject, localMap, validationErrors, saveRules, clearError]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = projectsLoading || loading;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto', width: '100%' }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Configuração de SLA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Defina os limites de horas úteis por prioridade e sub-área de cada
            projeto
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Restaurar valores padrão para este projeto">
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ResetIcon />}
              onClick={handleReset}
              disabled={isLoading || saving || !selectedProject}
              size="small"
            >
              Restaurar Padrões
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={
              isLoading ||
              saving ||
              !selectedProject ||
              validationErrors.size > 0
            }
            size="small"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </Stack>
      </Stack>

      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configuração de SLA salva com sucesso.
        </Alert>
      )}

      {/* Project selector */}
      {projectsLoading ? (
        <Skeleton variant="rounded" height={52} sx={{ mb: 2 }} />
      ) : projects.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Nenhum projeto Azure DevOps configurado. Configure um projeto
          primeiro.
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" useFlexGap>
          {projects.map((p) => (
            <Chip
              key={p.id}
              label={p.displayName}
              variant={selectedProject?.id === p.id ? 'filled' : 'outlined'}
              color={selectedProject?.id === p.id ? 'primary' : 'default'}
              onClick={() => setSelectedProject(p)}
              sx={{ fontWeight: selectedProject?.id === p.id ? 700 : 400 }}
            />
          ))}
        </Stack>
      )}

      {/* Info banner */}
      <Alert
        severity="info"
        icon={<InfoIcon />}
        sx={{ mb: 3, '& .MuiAlert-message': { width: '100%' } }}
      >
        <Typography variant="body2">
          Os limites abaixo determinam quantas <strong>horas úteis</strong> um
          ticket pode ficar em aberto antes de violar o SLA. Horas úteis:
          08:00–12:00 e 13:30–17:30 (8h/dia).
        </Typography>
        <Typography variant="body2" mt={0.5} color="text.secondary">
          Padrões atuais:{' '}
          {PRIORITIES.map((p, i) => (
            <span key={p.key}>
              <span style={{ color: p.color, fontWeight: 600 }}>{p.label}</span>
              {' = '}
              {hoursLabel(DEFAULT_LIMITS[p.key])}
              {i < PRIORITIES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </Typography>
      </Alert>

      {/* SLA Grid */}
      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={160} />
          ))}
        </Stack>
      ) : selectedProject ? (
        <Stack spacing={2}>
          {SUB_AREAS.map((sa) => (
            <Paper
              key={sa}
              variant="outlined"
              sx={{ borderRadius: 2, overflow: 'hidden' }}
            >
              {/* Sub-area header */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  {SLA_SUB_AREA_LABELS[sa]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sa === 'gestao_terceiros' &&
                    'Tickets da área Gestão de Terceiros'}
                  {sa === 'chamada_tecnologica' &&
                    'Tickets da área Chamada Tecnológica'}
                  {sa === 'outros' &&
                    'Demais tickets de Sustentação não enquadrados acima'}
                </Typography>
              </Box>

              {/* Priority rows */}
              <Box sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  divider={<Divider orientation="vertical" flexItem />}
                  flexWrap="wrap"
                  useFlexGap
                >
                  {PRIORITIES.map((p) => {
                    const key = buildKey(sa, p.key);
                    const currentVal =
                      localMap.get(key) ?? DEFAULT_LIMITS[p.key];
                    const errMsg = validationErrors.get(key);
                    const defaultVal = DEFAULT_LIMITS[p.key];
                    const isModified = currentVal !== defaultVal;

                    return (
                      <Box
                        key={p.key}
                        sx={{ flex: '1 1 180px', minWidth: 160 }}
                      >
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={0.75}
                          mb={0.75}
                        >
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: p.color,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {p.label}
                          </Typography>
                          {isModified && (
                            <Chip
                              label="editado"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: 'action.selected',
                              }}
                            />
                          )}
                        </Stack>

                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={currentVal}
                          onChange={(e) =>
                            handleValueChange(sa, p.key, e.target.value)
                          }
                          error={!!errMsg}
                          helperText={errMsg ?? hoursLabel(currentVal)}
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  h
                                </InputAdornment>
                              ),
                              inputProps: { min: 0.5, step: 0.5 },
                            },
                          }}
                          sx={{
                            '& input': { fontVariantNumeric: 'tabular-nums' },
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Paper>
          ))}
        </Stack>
      ) : null}
    </Box>
  );
}

export default SlaConfigPage;
