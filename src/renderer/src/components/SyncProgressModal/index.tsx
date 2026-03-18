import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Stack,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';

type SyncStep = 'sprints' | 'teams' | 'work_items' | 'members' | 'tasks' | 'complete';

interface SyncProgress {
  step: SyncStep;
  message: string;
  current: number;
  total: number;
  percentage: number;
}

interface SyncProgressModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS: SyncStep[] = ['sprints', 'teams', 'work_items', 'members', 'tasks'];

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

  useEffect(() => {
    if (!open) {
      setProgress(initialProgress);
      setCompletedSteps(new Set());
      setIsComplete(false);
      return;
    }

    const handleProgress = (_event: unknown, data: SyncProgress) => {
      setProgress(data);

      if (data.step === 'complete') {
        setIsComplete(true);
        setTimeout(onClose, 2000);
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
          maxWidth: 520,
          textAlign: 'center',
        }}
      >
        {isComplete ? (
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
        ) : (
          <SyncIcon
            className="sync-rotate"
            sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
          />
        )}

        <Typography variant="h6" gutterBottom>
          {isComplete ? 'Sincronização Concluída!' : 'Sincronizando com Azure DevOps'}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {progress.message}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          color={isComplete ? 'success' : 'primary'}
          sx={{ height: 8, borderRadius: 1, mb: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {progress.percentage}%
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
          {STEPS.map((step) => {
            const done = completedSteps.has(step) || isComplete;
            const current = progress.step === step && !isComplete;
            return (
              <Chip
                key={step}
                label={stepLabels[step]}
                size="small"
                color={done ? 'success' : current ? 'primary' : 'default'}
                variant={current ? 'filled' : 'outlined'}
                icon={done ? <CheckCircleIcon /> : undefined}
              />
            );
          })}
        </Stack>
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
