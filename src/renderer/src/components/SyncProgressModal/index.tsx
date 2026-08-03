import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Stack,
  Paper,
  Chip,
  Collapse,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
  ErrorOutline as ErrorIcon,
  WarningAmber as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

type SyncStep =
  | 'sprints'
  | 'teams'
  | 'work_items'
  | 'members'
  | 'tasks'
  | 'complete';

interface SyncProgress {
  step: SyncStep;
  message: string;
  current: number;
  total: number;
  percentage: number;
  stepErrors?: string[];
  stepResult?: { created: number; updated: number; total: number };
  projectName?: string;
  projectIndex?: number;
  projectTotal?: number;
}

interface StepInfo {
  errors: string[];
  result?: { created: number; updated: number; total: number };
}

interface SyncProgressModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: SyncStep[] = [
  'sprints',
  'teams',
  'work_items',
  'members',
  'tasks',
];

const stepLabels: Record<SyncStep, string> = {
  sprints: 'Sprints',
  teams: 'Equipes',
  work_items: 'Work Items',
  members: 'Membros',
  tasks: 'Tarefas',
  complete: 'Concluído',
};

const initialProgress: SyncProgress = {
  step: 'sprints',
  message: 'Iniciando sincronização...',
  current: 0,
  total: 100,
  percentage: 0,
};

export function SyncProgressModal({ open, onClose }: SyncProgressModalProps) {
  const [progress, setProgress] = useState<SyncProgress>(initialProgress);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [stepInfoMap, setStepInfoMap] = useState<Map<string, StepInfo>>(
    new Map(),
  );
  const [expandedErrors, setExpandedErrors] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    if (!open) {
      setProgress(initialProgress);
      setCompletedSteps(new Set());
      setIsComplete(false);
      setStepInfoMap(new Map());
      setExpandedErrors(false);
      setHasErrors(false);
      return;
    }

    const handleProgress = (_event: unknown, data: SyncProgress) => {
      setProgress(data);

      if (data.stepErrors || data.stepResult) {
        setStepInfoMap((prev) => {
          const next = new Map(prev);
          const currentStep = data.step === 'complete' ? 'tasks' : data.step;
          next.set(currentStep, {
            errors: data.stepErrors ?? [],
            result: data.stepResult,
          });
          return next;
        });
        if (data.stepErrors && data.stepErrors.length > 0) {
          setHasErrors(true);
        }
      }

      if (data.step === 'complete') {
        setIsComplete(true);
        if (!data.stepErrors?.length && !data.message.includes('falha')) {
          setTimeout(onClose, 2000);
        }
      } else {
        setCompletedSteps((prev) => {
          const newSet = new Set(prev);
          const currentIndex = STEPS.indexOf(data.step);
          for (let i = 0; i < currentIndex; i++) {
            newSet.add(STEPS[i]);
          }
          return newSet;
        });
      }
    };

    const unsub = window.electronAPI.onSyncProgress(handleProgress);
    return () => {
      if (typeof unsub === 'function') unsub();
      window.electronAPI.offSyncProgress?.(handleProgress);
    };
  }, [open, onClose]);

  if (!open) return null;

  const allErrors = Array.from(stepInfoMap.entries()).flatMap(([step, info]) =>
    info.errors.map((err) => ({ step, error: err })),
  );

  const isMultiProject =
    progress.projectTotal !== undefined && progress.projectTotal > 1;

  const getStepChipColor = (
    step: SyncStep,
  ): 'success' | 'primary' | 'error' | 'warning' | 'default' => {
    const done = completedSteps.has(step) || isComplete;
    const current = progress.step === step && !isComplete;
    const info = stepInfoMap.get(step);
    if (done && info?.errors?.length) return 'warning';
    if (done) return 'success';
    if (current) return 'primary';
    return 'default';
  };

  const getStepIcon = (step: SyncStep) => {
    const done = completedSteps.has(step) || isComplete;
    const info = stepInfoMap.get(step);
    if (done && info?.errors?.length) return <WarningIcon />;
    if (done) return <CheckCircleIcon />;
    return undefined;
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 4,
          p: '2rem 3rem',
          minWidth: 420,
          maxWidth: 580,
          maxHeight: '80vh',
          overflow: 'auto',
          textAlign: 'center',
        }}
      >
        {isComplete ? (
          hasErrors ? (
            <WarningIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
          ) : (
            <CheckCircleIcon
              sx={{ fontSize: 48, color: 'success.main', mb: 2 }}
            />
          )
        ) : (
          <SyncIcon
            className="sync-rotate"
            sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
          />
        )}

        <Typography variant="h6" gutterBottom>
          {isComplete
            ? hasErrors
              ? 'Sincronização Concluída com Alertas'
              : 'Sincronização Concluída!'
            : 'Sincronizando com Azure DevOps'}
        </Typography>

        {/* Multi-project indicator */}
        {isMultiProject && !isComplete && (
          <Box
            sx={{
              mb: 1.5,
              px: 2,
              py: 0.75,
              borderRadius: 2,
              bgcolor: 'action.hover',
              display: 'inline-block',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Projeto {progress.projectIndex} de {progress.projectTotal}
            </Typography>
            {progress.projectName && (
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{ display: 'block' }}
              >
                {progress.projectName}
              </Typography>
            )}
          </Box>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {progress.message}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          color={isComplete ? (hasErrors ? 'warning' : 'success') : 'primary'}
          sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 2 }}
        >
          {progress.percentage}%
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ mb: 2 }}
        >
          {STEPS.map((step) => {
            const current = progress.step === step && !isComplete;
            const info = stepInfoMap.get(step);
            const resultLabel = info?.result ? ` (${info.result.total})` : '';
            return (
              <Tooltip
                key={step}
                title={
                  info?.errors?.length
                    ? `${info.errors.length} erro(s) nesta etapa`
                    : info?.result
                      ? `Criados: ${info.result.created}, Atualizados: ${info.result.updated}`
                      : ''
                }
              >
                <Chip
                  label={`${stepLabels[step]}${resultLabel}`}
                  size="small"
                  color={getStepChipColor(step)}
                  variant={current ? 'filled' : 'outlined'}
                  icon={getStepIcon(step)}
                />
              </Tooltip>
            );
          })}
        </Stack>

        {/* Error details section */}
        {allErrors.length > 0 && (
          <Box sx={{ textAlign: 'left' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="center"
              spacing={0.5}
              sx={{ cursor: 'pointer', mb: 1 }}
              onClick={() => setExpandedErrors((v) => !v)}
            >
              <ErrorIcon sx={{ fontSize: 18, color: 'warning.main' }} />
              <Typography variant="body2" color="warning.main" fontWeight={600}>
                {allErrors.length} erro(s) durante a sincronização
              </Typography>
              <IconButton size="small">
                {expandedErrors ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
            <Collapse in={expandedErrors}>
              <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
                {allErrors.map((e, i) => (
                  <Alert
                    key={i}
                    severity="warning"
                    variant="outlined"
                    sx={{
                      py: 0.5,
                      '& .MuiAlert-message': { fontSize: '0.75rem' },
                    }}
                  >
                    <AlertTitle sx={{ fontSize: '0.8rem', mb: 0 }}>
                      {stepLabels[e.step as SyncStep] ?? e.step}
                    </AlertTitle>
                    {e.error}
                  </Alert>
                ))}
              </Stack>
            </Collapse>
          </Box>
        )}

        {/* Close button when complete with errors */}
        {isComplete && hasErrors && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label="Fechar"
              onClick={onClose}
              color="primary"
              variant="outlined"
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        )}
      </Paper>

      <style>
        {`
          @keyframes sync-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .sync-rotate {
            animation: sync-rotate 1.5s linear infinite;
          }
        `}
      </style>
    </Box>
  );
}
