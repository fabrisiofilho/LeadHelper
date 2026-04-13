import {
  Box,
  Typography,
  Chip,
  Alert,
  Divider,
  Stack,
  Grid,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { Modal } from '@renderer/components/Modal';
import type { NoteCard } from '@shared/interfaces/config/index.types';

export interface NoteCardDetailModalProps {
  open: boolean;
  onClose: () => void;
  noteCard: NoteCard | null;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  team_member: 'Membro',
  team: 'Equipe',
  position: 'Cargo',
  task: 'Task',
};

const ENTITY_TYPE_COLORS: Record<string, 'primary' | 'secondary' | 'success' | 'warning'> = {
  team_member: 'primary',
  team: 'secondary',
  position: 'success',
  task: 'warning',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function isDeadlinePast(deadline: string | null | undefined, completedAt: string | null | undefined): boolean {
  if (!deadline || completedAt) return false;
  return new Date() > new Date(deadline);
}

export function NoteCardDetailModal({ open, onClose, noteCard }: NoteCardDetailModalProps) {
  if (!noteCard) return null;

  const sanitizedBody = DOMPurify.sanitize(noteCard.body);
  const isCompleted = !!noteCard.completedAt;
  const deadlinePast = isDeadlinePast(noteCard.deadline, noteCard.completedAt);
  const hasLinks = noteCard.links && noteCard.links.length > 0;

  return (
    <Modal
      variant="form"
      open={open}
      title={noteCard.title}
      handleClose={onClose}
      noFooter
      hasCloseButton
      setMaxWidth="800px"
      width="90vw"
    >
      <Stack spacing={2.5} sx={{ pt: 0.5 }}>
        {/* Completion Alert */}
        {isCompleted && noteCard.completedAt && (
          <Alert severity="success" variant="outlined" sx={{ py: 0.5 }}>
            Nota concluída em {formatDateTime(noteCard.completedAt)}
          </Alert>
        )}

        {/* Metadata row */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                Criado em: {formatDate(noteCard.createdAt)}
              </Typography>
            </Stack>
          </Grid>

          {noteCard.deadline && (
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <TimeIcon sx={{ fontSize: 16, color: deadlinePast ? 'error.main' : 'text.disabled' }} />
                {deadlinePast ? (
                  <Chip
                    icon={<WarningIcon />}
                    label={`Prazo: ${formatDateTime(noteCard.deadline)}`}
                    color="error"
                    size="small"
                    variant="filled"
                  />
                ) : (
                  <Chip
                    label={`Prazo: ${formatDateTime(noteCard.deadline)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Grid>
          )}
        </Grid>

        <Divider />

        {/* Body */}
        <Box
          sx={{
            fontSize: '0.95rem',
            lineHeight: 1.7,
            '& p': { mt: 0, mb: 1 },
            '& h1': { fontSize: '1.5rem', mt: 0, mb: 1 },
            '& h2': { fontSize: '1.25rem', mt: 0, mb: 1 },
            '& h3': { fontSize: '1.1rem', mt: 0, mb: 1 },
            '& ul, & ol': { pl: 3, my: 0.5 },
            '& pre': { bgcolor: 'action.hover', p: 1.5, borderRadius: 1, overflow: 'auto', fontSize: '0.85rem' },
            '& code': { fontSize: '0.85rem' },
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />

        {/* Links */}
        {hasLinks && (
          <>
            <Divider />
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                <LinkIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  Vínculos
                </Typography>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {noteCard.links.map((link) => (
                  <Chip
                    key={link.id}
                    label={link.entityName || `${ENTITY_TYPE_LABELS[link.entityType] || link.entityType} #${link.entityId}`}
                    size="small"
                    variant="outlined"
                    color={ENTITY_TYPE_COLORS[link.entityType] || 'primary'}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  );
}

export default NoteCardDetailModal;
