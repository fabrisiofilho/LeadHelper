import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  Stack,
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { WorkItem } from '@shared/interfaces/config/index.types';

interface WorkItemDetailModalProps {
  open: boolean;
  workItem: WorkItem | null;
  onClose: () => void;
}

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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.75 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 130, flexShrink: 0, fontWeight: 500 }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Box>
  );
}

export function WorkItemDetailModal({ open, workItem, onClose }: WorkItemDetailModalProps) {
  if (!workItem) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <Chip
            label={workItem.type}
            size="small"
            variant="outlined"
            sx={{
              borderColor: TYPE_COLORS[workItem.type] || '#9e9e9e',
              color: TYPE_COLORS[workItem.type] || '#9e9e9e',
              flexShrink: 0,
            }}
          />
          <Typography variant="h6" fontWeight={600} noWrap>
            #{workItem.id} — {workItem.title}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={0.5}>
          <DetailRow label="ID">
            <Typography variant="body2">{workItem.id}</Typography>
          </DetailRow>
          <DetailRow label="Título">
            <Typography variant="body2">{workItem.title}</Typography>
          </DetailRow>
          <DetailRow label="Tipo">
            <Chip
              label={workItem.type}
              size="small"
              variant="outlined"
              sx={{
                borderColor: TYPE_COLORS[workItem.type] || '#9e9e9e',
                color: TYPE_COLORS[workItem.type] || '#9e9e9e',
              }}
            />
          </DetailRow>
          <DetailRow label="Estado">
            <Chip
              label={workItem.state}
              size="small"
              sx={{
                bgcolor: STATE_COLORS[workItem.state] || '#9e9e9e',
                color: '#fff',
                fontWeight: 500,
              }}
            />
          </DetailRow>
          <DetailRow label="Atribuído a">
            <Typography variant="body2">{workItem.assignedTo || 'Não atribuído'}</Typography>
          </DetailRow>
          <DetailRow label="Criado em">
            <Typography variant="body2">{formatDate(workItem.createdDate)}</Typography>
          </DetailRow>
          <DetailRow label="Atualizado em">
            <Typography variant="body2">{formatDate(workItem.changedDate)}</Typography>
          </DetailRow>

          {workItem.iterationPath && (
            <DetailRow label="Iteration Path">
              <Typography variant="body2">{workItem.iterationPath}</Typography>
            </DetailRow>
          )}
          {workItem.areaPath && (
            <DetailRow label="Area Path">
              <Typography variant="body2">{workItem.areaPath}</Typography>
            </DetailRow>
          )}
          {workItem.priority != null && (
            <DetailRow label="Prioridade">
              <Typography variant="body2">{workItem.priority}</Typography>
            </DetailRow>
          )}
          {workItem.storyPoints != null && (
            <DetailRow label="Story Points">
              <Typography variant="body2">{workItem.storyPoints}</Typography>
            </DetailRow>
          )}
          {workItem.tags && (
            <DetailRow label="Tags">
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {workItem.tags.split(';').map((tag) => (
                  <Chip key={tag.trim()} label={tag.trim()} size="small" variant="outlined" />
                ))}
              </Stack>
            </DetailRow>
          )}
          {workItem.originalWorkItemType && workItem.originalWorkItemType !== workItem.type && (
            <DetailRow label="Tipo Original">
              <Typography variant="body2">{workItem.originalWorkItemType}</Typography>
            </DetailRow>
          )}

          {workItem.description && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Descrição
              </Typography>
              <Box
                sx={{
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  p: 2,
                  '& img': { maxWidth: '100%' },
                  '& a': { color: 'primary.main' },
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: workItem.description }}
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default WorkItemDetailModal;
