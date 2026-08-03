import { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  IconButton,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  PriorityHigh as PriorityHighIcon,
  Save as SaveIcon,
  DeleteOutline as RemoveIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import type {
  SustentacaoItemWithSLA,
  NoteCard,
  CustomElectronAPI,
} from '@shared/interfaces/config/index.types';

// ── Priority levels matching SLA_LIMITS ──

const LOCAL_PRIORITIES = [
  { value: 4, label: 'Crítica', color: '#9333EA', slaLabel: '4h úteis' },
  { value: 3, label: 'Alta', color: '#DC2626', slaLabel: '8h úteis (1d)' },
  { value: 2, label: 'Média', color: '#2563EB', slaLabel: '24h úteis (3d)' },
  { value: 1, label: 'Baixa', color: '#64748B', slaLabel: '40h úteis (5d)' },
] as const;

/** Prefix used to identify prioritization notes by title */
const PRIO_NOTE_PREFIX = 'Priorização #';

function extractJustification(html: string): string {
  const marker = '<strong>Justificativa:</strong>';
  const idx = html.indexOf(marker);
  if (idx === -1) return '';
  const after = html.slice(idx + marker.length);
  return after
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

interface PrioritizeItemModalProps {
  open: boolean;
  item: SustentacaoItemWithSLA | null;
  onClose: () => void;
  onSaved: () => void;
}

export function PrioritizeItemModal({
  open,
  item,
  onClose,
  onSaved,
}: PrioritizeItemModalProps) {
  const [selectedPriority, setSelectedPriority] = useState<number | null>(null);
  const [deadlineDate, setDeadlineDate] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<Date | null>(null);
  const [justification, setJustification] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingNote, setExistingNote] = useState<NoteCard | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);

  const api = (window as unknown as { electronAPI: CustomElectronAPI })
    .electronAPI;

  const hasPriority = item ? item.localPriority > 0 : false;

  // Pre-fill and load existing note when opening
  useEffect(() => {
    if (!open || !item) return;

    setSelectedPriority(item.localPriority > 0 ? item.localPriority : null);
    setDeadlineDate(null);
    setDeadlineTime(null);
    setJustification('');
    setError(null);
    setSaving(false);
    setRemoving(false);
    setExistingNote(null);

    if (item.task.id) {
      setLoadingNote(true);
      api.noteCard
        .findAllActive()
        .then((res) => {
          if (!res.success || !res.data) return;

          const taskId = item.task.id;
          const externalId = item.task.externalId;

          // Find by link first, then by title
          let found = res.data.find(
            (n) =>
              n.title.startsWith(PRIO_NOTE_PREFIX) &&
              n.links.some(
                (l) => l.entityType === 'task' && l.entityId === taskId,
              ),
          );
          if (!found && externalId) {
            found = res.data.find(
              (n) =>
                n.title.startsWith(`${PRIO_NOTE_PREFIX}${externalId}`) ||
                n.title.startsWith(`${PRIO_NOTE_PREFIX}#${externalId}`),
            );
          }
          if (found) {
            setExistingNote(found);
            if (found.deadline) {
              const d = new Date(found.deadline);
              setDeadlineDate(d);
              // Only set time if it's not midnight (i.e., user set a specific time)
              if (d.getHours() !== 0 || d.getMinutes() !== 0) {
                setDeadlineTime(d);
              }
            }
            const prev = extractJustification(found.body);
            if (prev) setJustification(prev);
          }
        })
        .finally(() => setLoadingNote(false));
    }
  }, [open, item, api]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Find and complete ALL active prioritization notes for this task.
   * Uses a fresh fetch to avoid stale state, and silently skips already-completed notes.
   */
  const completeAllPrioNotes = useCallback(
    async (taskId: number, externalId?: string) => {
      try {
        const res = await api.noteCard.findAllActive();
        if (!res.success || !res.data) return;

        const notes = res.data.filter((n) => {
          if (!n.title.startsWith(PRIO_NOTE_PREFIX)) return false;
          const linkedToTask = n.links.some(
            (l) => l.entityType === 'task' && l.entityId === taskId,
          );
          if (linkedToTask) return true;
          // Fallback: match by externalId in title
          if (externalId) {
            return (
              n.title.startsWith(`${PRIO_NOTE_PREFIX}${externalId}`) ||
              n.title.startsWith(`${PRIO_NOTE_PREFIX}#${externalId}`)
            );
          }
          return false;
        });

        for (const note of notes) {
          try {
            await api.noteCard.complete(note.id);
          } catch {
            // Already completed or other error — skip
          }
        }
      } catch {
        console.warn('Failed to complete prioritization notes');
      }
    },
    [api],
  );

  /**
   * Save: complete old notes → set priority → create new note
   */
  const handleSave = useCallback(async () => {
    if (!item || !item.task.externalId) return;

    if (selectedPriority === null) {
      setError('Selecione uma prioridade.');
      return;
    }
    if (!justification.trim()) {
      setError('Informe a justificativa para a priorização.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Complete ALL existing prioritization notes for this task (fresh fetch)
      await completeAllPrioNotes(item.task.id, item.task.externalId);

      // 2. Set local priority (after complete, so it's not wiped by stale notes)
      const priorityRes = await api.taskLocalPriority.set(
        item.task.externalId,
        selectedPriority,
      );
      if (!priorityRes.success) {
        setError(priorityRes.error ?? 'Erro ao definir prioridade.');
        setSaving(false);
        return;
      }

      // 3. Create new NoteCard
      const prioInfo = LOCAL_PRIORITIES.find(
        (p) => p.value === selectedPriority,
      );
      const prioLabel = prioInfo?.label ?? String(selectedPriority);

      const title = `Priorização #${item.task.externalId} — ${prioLabel}`;

      // Combine date + time into a single deadline
      let deadline: Date | null = null;
      if (deadlineDate) {
        deadline = new Date(deadlineDate);
        if (deadlineTime) {
          deadline.setHours(
            deadlineTime.getHours(),
            deadlineTime.getMinutes(),
            0,
            0,
          );
        } else {
          deadline.setHours(17, 30, 0, 0); // Default: end of business day
        }
      }

      const bodyParts = [
        `<p><strong>Item:</strong> #${item.task.externalId} — ${item.task.title}</p>`,
        `<p><strong>Prioridade definida:</strong> ${prioLabel}</p>`,
        hasPriority
          ? `<p><strong>Ação:</strong> Alteração de prioridade local</p>`
          : `<p><strong>Ação:</strong> Nova priorização local</p>`,
        deadline
          ? `<p><strong>Data limite:</strong> ${deadline.toLocaleDateString('pt-BR')} ${deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>`
          : '',
        `<p><strong>Justificativa:</strong></p>`,
        `<p>${justification.replace(/\n/g, '<br/>')}</p>`,
      ];

      const deadlineIso = deadline ? deadline.toISOString() : null;

      await api.noteCard.create({
        title,
        body: bodyParts.filter(Boolean).join(''),
        deadline: deadlineIso,
        links: [{ entityType: 'task', entityId: item.task.id }],
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro inesperado ao salvar.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    item,
    selectedPriority,
    justification,
    deadlineDate,
    deadlineTime,
    hasPriority,
    api,
    completeAllPrioNotes,
    onClose,
    onSaved,
  ]);

  /**
   * Remove: remove priority → complete all prio notes
   */
  const handleRemove = useCallback(async () => {
    if (!item || !item.task.externalId) return;

    setRemoving(true);
    setError(null);

    try {
      // 1. Remove local priority FIRST
      const removeRes = await api.taskLocalPriority.remove(
        item.task.externalId,
      );
      if (!removeRes.success) {
        setError(removeRes.error ?? 'Erro ao remover prioridade.');
        setRemoving(false);
        return;
      }

      // 2. Complete all prioritization notes (fresh fetch, no stale state)
      await completeAllPrioNotes(item.task.id, item.task.externalId);

      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro inesperado ao remover.',
      );
    } finally {
      setRemoving(false);
    }
  }, [item, api, completeAllPrioNotes, onClose, onSaved]);

  if (!open || !item) return null;

  const t = item.task;
  const busy = saving || removing;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }}
        onClick={handleClose}
      >
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            p: 3,
            minWidth: 500,
            maxWidth: 650,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <PriorityHighIcon color="warning" />
              <Typography variant="h6">
                {hasPriority ? 'Alterar Prioridade' : 'Priorizar Item'}
              </Typography>
            </Stack>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Item info */}
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                #{t.externalId ?? t.id}
              </Typography>
              <Chip
                label={t.type}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip label={t.status} size="small" variant="outlined" />
            </Stack>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {t.title}
            </Typography>
            {t.assignedToName && (
              <Typography
                variant="caption"
                color="text.secondary"
                mt={0.5}
                display="block"
              >
                Responsável: {t.assignedToName}
              </Typography>
            )}
          </Paper>

          {/* Existing note indicator */}
          {loadingNote && (
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Buscando nota de priorização...
              </Typography>
            </Stack>
          )}
          {!loadingNote && existingNote && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption">
                Nota ativa: <strong>{existingNote.title}</strong>
                {existingNote.deadline && (
                  <>
                    {' — Prazo: '}
                    {new Date(existingNote.deadline).toLocaleDateString(
                      'pt-BR',
                    )}
                  </>
                )}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                mt={0.5}
              >
                Ao salvar ou remover, esta nota será finalizada automaticamente.
              </Typography>
            </Alert>
          )}

          {/* Priority selection */}
          <Typography variant="subtitle2" mb={1}>
            Prioridade Local
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            mb={1.5}
            display="block"
          >
            Define a urgência local do item. Itens com prioridade local sobem na
            fila, independente da prioridade do Azure DevOps.
          </Typography>

          <ToggleButtonGroup
            value={selectedPriority}
            exclusive
            onChange={(_, val) => {
              if (val !== null) setSelectedPriority(val);
            }}
            fullWidth
            sx={{ mb: 2.5 }}
          >
            {LOCAL_PRIORITIES.map((p) => (
              <ToggleButton
                key={p.value}
                value={p.value}
                disabled={busy}
                sx={{
                  textTransform: 'none',
                  flexDirection: 'column',
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: `${p.color}14`,
                    borderColor: p.color,
                    color: p.color,
                    '&:hover': { bgcolor: `${p.color}22` },
                  },
                }}
              >
                <Typography variant="body2" fontWeight={700}>
                  {p.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.65rem', opacity: 0.7 }}
                >
                  {p.slaLabel}
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Deadline */}
          <Typography variant="subtitle2" mb={1}>
            Data Limite (opcional)
          </Typography>
          <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
            <DatePicker
              label="Data"
              value={deadlineDate}
              onChange={(v) => {
                setDeadlineDate(v);
                if (!v) setDeadlineTime(null);
              }}
              disabled={busy}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  placeholder: 'dd/mm/aaaa',
                },
                field: { clearable: true },
                popper: { sx: { zIndex: 99999 } },
              }}
              sx={{ flex: 7 }}
            />
            <TimePicker
              label="Hora"
              value={deadlineTime}
              onChange={(v) => setDeadlineTime(v)}
              disabled={busy || !deadlineDate}
              ampm={false}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: 'small',
                  placeholder: 'HH:mm',
                },
                popper: { sx: { zIndex: 99999 } },
              }}
              sx={{ flex: 5 }}
            />
          </Stack>

          {/* Justification */}
          <Typography variant="subtitle2" mb={1}>
            Justificativa *
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            mb={1}
            display="block"
          >
            Explique o motivo da priorização. Esta nota ficará registrada no
            Quadro de Notas.
          </Typography>
          <TextField
            multiline
            minRows={3}
            maxRows={6}
            fullWidth
            size="small"
            placeholder="Ex: Alinhamento com o cliente X definiu prazo para dd/mm/aaaa..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={busy}
            sx={{ mb: 2 }}
          />

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Actions */}
          <Stack direction="row" justifyContent="space-between" spacing={1.5}>
            <Box>
              {hasPriority && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={
                    removing ? <CircularProgress size={16} /> : <RemoveIcon />
                  }
                  onClick={handleRemove}
                  disabled={busy}
                  size="small"
                >
                  {removing ? 'Removendo...' : 'Remover Prioridade'}
                </Button>
              )}
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" onClick={handleClose} disabled={busy}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={
                  saving ? <CircularProgress size={16} /> : <SaveIcon />
                }
                onClick={handleSave}
                disabled={busy}
              >
                {saving
                  ? 'Salvando...'
                  : hasPriority
                    ? 'Alterar e Criar Nota'
                    : 'Priorizar e Criar Nota'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
