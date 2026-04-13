import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  Replay as ReplayIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import type { NoteCard } from '@shared/interfaces/config/index.types';

interface NoteCardItemProps {
  noteCard: NoteCard;
  onComplete: (id: number) => void;
  onEdit: (noteCard: NoteCard) => void;
  onViewDetails: (noteCard: NoteCard) => void;
  onReactivate?: (id: number) => void;
  onDelete?: (id: number) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function isDeadlinePast(deadline: string | null | undefined, completedAt: string | null | undefined): boolean {
  if (!deadline || completedAt) return false;
  return new Date() > new Date(deadline);
}

const ENTITY_TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  team_member: 'primary',
  team: 'secondary',
  position: 'success',
  task: 'warning',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  team_member: 'Membro',
  team: 'Equipe',
  position: 'Cargo',
  task: 'Task',
};

export function NoteCardItem({ noteCard, onComplete, onEdit, onViewDetails, onReactivate, onDelete }: NoteCardItemProps) {
  const sanitizedBody = DOMPurify.sanitize(noteCard.body);
  const deadlinePast = isDeadlinePast(noteCard.deadline, noteCard.completedAt);
  const isCompleted = !!noteCard.completedAt;
  const hasLinks = noteCard.links && noteCard.links.length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
        opacity: isCompleted ? 0.85 : 1,
      }}
    >
      {/* Top color strip */}
      <Box
        sx={{
          height: 4,
          bgcolor: deadlinePast ? 'error.main' : isCompleted ? 'success.main' : 'primary.main',
        }}
      />

      {/* Title */}
      <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          sx={{
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {noteCard.title}
        </Typography>
      </Box>

      {/* Body preview */}
      <Box
        sx={{
          px: 2,
          flex: 1,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          color: 'text.secondary',
          mb: 1,
          '& p': { margin: 0 },
          '& h1, & h2, & h3': { margin: 0, fontSize: '0.82rem', fontWeight: 600 },
          '& ul, & ol': { margin: 0, paddingLeft: '1.2rem' },
        }}
        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
      />

      {/* Metadata: date + deadline */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <CalendarIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
              {formatDate(noteCard.createdAt)}
            </Typography>
          </Stack>

          {noteCard.deadline && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ScheduleIcon sx={{ fontSize: 13, color: deadlinePast ? 'error.main' : 'text.disabled' }} />
              {deadlinePast ? (
                <Chip
                  icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                  label={formatDateTime(noteCard.deadline)}
                  color="error"
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Prazo: {formatDateTime(noteCard.deadline)}
                </Typography>
              )}
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Links */}
      {hasLinks && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {noteCard.links.slice(0, 4).map((link) => (
              <Chip
                key={link.id}
                label={link.entityName || `${ENTITY_TYPE_LABELS[link.entityType]} #${link.entityId}`}
                size="small"
                variant="outlined"
                color={ENTITY_TYPE_COLORS[link.entityType] || 'primary'}
                sx={{ height: 20, fontSize: '0.65rem', maxWidth: 160 }}
              />
            ))}
            {noteCard.links.length > 4 && (
              <Chip
                label={`+${noteCard.links.length - 4}`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          px: 1,
          py: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          gap: 0.25,
        }}
      >
        {!isCompleted && (
          <Tooltip title="Concluir">
            <IconButton size="small" color="success" onClick={() => onComplete(noteCard.id)}>
              <CheckCircleIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        {isCompleted && onReactivate && (
          <Tooltip title="Reativar">
            <IconButton size="small" color="info" onClick={() => onReactivate(noteCard.id)}>
              <ReplayIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        {!isCompleted && (
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => onEdit(noteCard)}>
              <EditIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Ver detalhes">
          <IconButton size="small" onClick={() => onViewDetails(noteCard)}>
            <VisibilityIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        {onDelete && (
          <Tooltip title="Excluir">
            <IconButton size="small" color="error" onClick={() => onDelete(noteCard.id)}>
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
}

export default NoteCardItem;
