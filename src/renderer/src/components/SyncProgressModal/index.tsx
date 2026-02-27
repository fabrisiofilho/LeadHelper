import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Stack,
  Alert,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

interface SyncProgress {
  step: 'sprints' | 'teams' | 'work_items' | 'members' | 'tasks' | 'complete';
  message: string;
  current: number;
  total: number;
  percentage: number;
}

interface SyncProgressModalProps {
  open: boolean;
  onClose: () => void;
}

const stepLabels: Record<SyncProgress['step'], string> = {
  sprints: 'Sprints',
  teams: 'Equipes',
  work_items: 'Work Items',
  members: 'Membros',
  tasks: 'Tarefas',
  complete: 'Concluído',
};

export function SyncProgressModal({ open, onClose }: SyncProgressModalProps) {
  const [progress, setProgress] = useState<SyncProgress>({
    step: 'sprints',
    message: 'Iniciando sincronização...',
    current: 0,
    total: 100,
    percentage: 0,
  });

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setProgress({
        step: 'sprints',
        message: 'Iniciando sincronização...',
        current: 0,
        total: 100,
        percentage: 0,
      });
      setCompletedSteps(new Set());
      setIsComplete(false);
      return;
    }

    const handleProgress = (_event: unknown, data: SyncProgress) => {
      setProgress(data);

      if (data.step === 'complete') {
        setIsComplete(true);
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Mark previous steps as completed
        setCompletedSteps((prev) => {
          const newSet = new Set(prev);
          const steps: SyncProgress['step'][] = [
            'sprints',
            'teams',
            'work_items',
            'members',
            'tasks',
          ];
          const currentIndex = steps.indexOf(data.step);
          for (let i = 0; i < currentIndex; i++) {
            newSet.add(steps[i]);
          }
          return newSet;
        });
      }
    };

    window.electronAPI.onSyncProgress(handleProgress);

    return () => {
      // Cleanup listener
      window.electronAPI.offSyncProgress?.(handleProgress);
    };
  }, [open, onClose]);

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={!isComplete}
      onClose={isComplete ? onClose : undefined}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isComplete ? (
            <CheckCircleIcon color="success" />
          ) : (
            <SyncIcon className="rotating-icon" />
          )}
          <Typography variant="h6">
            {isComplete
              ? 'Sincronização Concluída'
              : 'Sincronizando com Azure DevOps'}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {isComplete ? (
            <Alert severity="success">
              Todos os dados foram sincronizados com sucesso!
            </Alert>
          ) : (
            <>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {progress.message}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress.percentage}
                  sx={{ height: 8, borderRadius: 1, mt: 1 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {progress.percentage}%
                </Typography>
              </Box>

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Etapas:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(
                    [
                      'sprints',
                      'teams',
                      'work_items',
                      'members',
                      'tasks',
                    ] as const
                  ).map((step) => {
                    const isCompleted = completedSteps.has(step);
                    const isCurrent = progress.step === step;

                    return (
                      <Chip
                        key={step}
                        label={stepLabels[step]}
                        size="small"
                        color={
                          isCompleted
                            ? 'success'
                            : isCurrent
                              ? 'primary'
                              : 'default'
                        }
                        variant={isCurrent ? 'filled' : 'outlined'}
                        icon={isCompleted ? <CheckCircleIcon /> : undefined}
                      />
                    );
                  })}
                </Stack>
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      <style>
        {`
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          .rotating-icon {
            animation: rotate 2s linear infinite;
          }
        `}
      </style>
    </Dialog>
  );
}
