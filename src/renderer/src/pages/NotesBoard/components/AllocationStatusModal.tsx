import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  Divider,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as OkIcon,
  Warning as WarningIcon,
  PersonOff as NoAllocIcon,
  Schedule as ScheduleIcon,
  ArrowForward as NextIcon,
  EventBusy as OverdueIcon,
  PeopleAlt as AllIcon,
} from '@mui/icons-material';
import { Modal } from '@renderer/components/Modal';
import type {
  NoteCard,
  TeamMember,
} from '@shared/interfaces/config/index.types';

// ── helpers ───────────────────────────────────────────────────────────────────

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function fmt(iso: string, allDay = true): string {
  const d = new Date(iso);
  if (allDay)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function periodLabel(note: NoteCard): string {
  const allDay = note.allDay !== false;
  if (note.startDate && note.deadline) {
    const s = fmt(note.startDate, allDay);
    const e = fmt(note.deadline, allDay);
    return s === e ? s : `${s} → ${e}`;
  }
  if (note.startDate) return fmt(note.startDate, allDay);
  if (note.deadline) return fmt(note.deadline, allDay);
  return '';
}

function memberNotes(notes: NoteCard[], memberId: number): NoteCard[] {
  return notes.filter((n) =>
    n.links.some(
      (l) => l.entityType === 'team_member' && l.entityId === memberId,
    ),
  );
}

function activeNow(notes: NoteCard[]): NoteCard[] {
  const end = todayEnd();
  const start = todayStart();
  return notes.filter((n) => {
    if (!n.startDate) return false;
    const s = new Date(n.startDate);
    const e = n.deadline ? new Date(n.deadline) : s;
    return s <= end && e >= start;
  });
}

function nextUpcoming(notes: NoteCard[]): NoteCard | null {
  const end = todayEnd();
  const future = notes
    .filter((n) => n.startDate && new Date(n.startDate) > end)
    .sort(
      (a, b) =>
        new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime(),
    );
  return future[0] ?? null;
}

function overdueNotes(notes: NoteCard[]): NoteCard[] {
  const now = new Date();
  return notes.filter((n) => {
    if (n.completedAt) return false;
    const end = n.deadline ? new Date(n.deadline) : null;
    return end && end < now;
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

interface MemberStatus {
  member: TeamMember;
  current: NoteCard[];
  next: NoteCard | null;
  overdue: NoteCard[];
  allocatedToday: boolean;
}

type FilterView = 'all' | 'unallocated' | 'allocated' | 'overdue';

// ── constants ─────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  developer: '#2563EB',
  analyst: '#7C3AED',
  qa: '#16A34A',
  tech_lead: '#DC2626',
  devops: '#EA580C',
  designer: '#DB2777',
  product_owner: '#0891B2',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── MemberCard ────────────────────────────────────────────────────────────────

function MemberCard({ status }: { status: MemberStatus }) {
  const { member, current, next, overdue, allocatedToday } = status;
  const roleColor = ROLE_COLORS[member.role] ?? '#64748B';
  const hasOverdue = overdue.length > 0;

  // Determine left border accent
  const accentColor = hasOverdue
    ? '#EF4444'
    : allocatedToday
      ? '#16A34A'
      : '#F59E0B';

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: `4px solid ${accentColor}`,
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          bgcolor: roleColor,
          width: 36,
          height: 36,
          fontSize: '0.8rem',
          fontWeight: 700,
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {getInitials(member.name)}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + status chips */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography
            variant="body2"
            fontWeight={700}
            noWrap
            sx={{ maxWidth: 220 }}
            title={member.name}
          >
            {member.name}
          </Typography>

          {allocatedToday && !hasOverdue && (
            <Chip
              icon={<OkIcon sx={{ fontSize: '14px !important' }} />}
              label="Alocado hoje"
              color="success"
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
          {!allocatedToday && (
            <Chip
              icon={<NoAllocIcon sx={{ fontSize: '14px !important' }} />}
              label="Sem alocação"
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                bgcolor: '#F59E0B',
                color: '#fff',
                '& .MuiChip-icon': { color: '#fff' },
              }}
            />
          )}
          {hasOverdue && (
            <Chip
              icon={<OverdueIcon sx={{ fontSize: '14px !important' }} />}
              label={`${overdue.length} vencido(s)`}
              color="error"
              size="small"
              sx={{ height: 22, fontSize: '0.7rem' }}
            />
          )}
        </Stack>

        {/* Row 2: position */}
        {member.position?.name && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ lineHeight: 1.2 }}
          >
            {member.position.name}
          </Typography>
        )}

        {/* Current allocation(s) */}
        {current.length > 0 && (
          <Stack spacing={0.4} mt={0.75}>
            {current.map((n) => (
              <Box
                key={n.id}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'success.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <ScheduleIcon
                  sx={{ fontSize: 13, flexShrink: 0, opacity: 0.85 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    display="block"
                    noWrap
                    title={n.title}
                    sx={{ lineHeight: 1.3 }}
                  >
                    {n.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ opacity: 0.85, fontSize: '0.65rem' }}
                  >
                    {periodLabel(n)}
                    {n.deadline &&
                      ` · até ${fmt(n.deadline, n.allDay !== false)}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        )}

        {/* Next allocation */}
        {next && (
          <Box
            sx={{
              mt: 0.75,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <NextIcon sx={{ fontSize: 13, flexShrink: 0, opacity: 0.85 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                display="block"
                noWrap
                title={next.title}
                sx={{ lineHeight: 1.3 }}
              >
                Próxima: {next.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.85, fontSize: '0.65rem' }}
              >
                {periodLabel(next)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* No next note — warn only when currently allocated */}
        {allocatedToday && !next && (
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 0.4,
              color: 'warning.main',
            }}
          >
            <WarningIcon sx={{ fontSize: 12 }} />
            Sem próxima alocação
          </Typography>
        )}

        {/* Overdue notes */}
        {overdue.map((n) => (
          <Box
            key={n.id}
            sx={{
              mt: 0.75,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'error.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
            }}
          >
            <OverdueIcon sx={{ fontSize: 13, flexShrink: 0, opacity: 0.85 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                display="block"
                noWrap
                title={n.title}
                sx={{ lineHeight: 1.3 }}
              >
                {n.title}
              </Typography>
              {n.deadline && (
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.85, fontSize: '0.65rem' }}
                >
                  Venceu: {fmt(n.deadline, n.allDay !== false)}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export interface AllocationStatusModalProps {
  open: boolean;
  onClose: () => void;
  members: TeamMember[];
  activeNoteCards: NoteCard[];
}

export function AllocationStatusModal({
  open,
  onClose,
  members,
  activeNoteCards,
}: AllocationStatusModalProps) {
  const [filter, setFilter] = useState<FilterView>('all');

  const statuses = useMemo<MemberStatus[]>(() => {
    return members
      .filter((m) => m.isActive)
      .map((member) => {
        const notes = memberNotes(activeNoteCards, member.id);
        const current = activeNow(notes);
        const next = nextUpcoming(notes);
        const overdue = overdueNotes(notes);
        return {
          member,
          current,
          next,
          overdue,
          allocatedToday: current.length > 0,
        };
      })
      .sort((a, b) => {
        // Priority: overdue → unallocated → allocated-no-next → ok
        const score = (s: MemberStatus) => {
          if (s.overdue.length > 0) return 0;
          if (!s.allocatedToday) return 1;
          if (!s.next) return 2;
          return 3;
        };
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return a.member.name.localeCompare(b.member.name, 'pt-BR');
      });
  }, [members, activeNoteCards]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unallocated':
        return statuses.filter((s) => !s.allocatedToday);
      case 'allocated':
        return statuses.filter((s) => s.allocatedToday);
      case 'overdue':
        return statuses.filter((s) => s.overdue.length > 0);
      default:
        return statuses;
    }
  }, [statuses, filter]);

  const noAllocCount = statuses.filter((s) => !s.allocatedToday).length;
  const overdueCount = statuses.filter((s) => s.overdue.length > 0).length;
  const allocatedCount = statuses.filter((s) => s.allocatedToday).length;

  return (
    <Modal
      variant="form"
      open={open}
      title="Status de Alocação"
      handleClose={onClose}
      noFooter
      hasCloseButton
      setMaxWidth="640px"
      width="95vw"
    >
      <Stack spacing={1.5} sx={{ pt: 0.5 }}>
        {/* Summary bar */}
        <Stack
          direction="row"
          spacing={0.75}
          flexWrap="wrap"
          useFlexGap
          sx={{
            p: 1.25,
            borderRadius: 1.5,
            bgcolor: 'action.hover',
          }}
        >
          <Tooltip title="Sem alocação hoje">
            <Chip
              icon={<NoAllocIcon sx={{ fontSize: '14px !important' }} />}
              label={noAllocCount}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: noAllocCount > 0 ? '#F59E0B' : 'divider',
                color: noAllocCount > 0 ? '#fff' : 'text.disabled',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          </Tooltip>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ alignSelf: 'center' }}
          >
            sem alocação
          </Typography>
          <Box sx={{ flex: 1 }} />
          {overdueCount > 0 && (
            <>
              <Chip
                icon={<OverdueIcon sx={{ fontSize: '14px !important' }} />}
                label={overdueCount}
                color="error"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ alignSelf: 'center' }}
              >
                prazo vencido
              </Typography>
              <Box sx={{ flex: 1 }} />
            </>
          )}
          <Chip
            icon={<OkIcon sx={{ fontSize: '14px !important' }} />}
            label={allocatedCount}
            color="success"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ alignSelf: 'center' }}
          >
            alocado(s)
          </Typography>
        </Stack>

        {/* Filter tabs */}
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => {
            if (v) setFilter(v);
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 1.5,
              fontSize: '0.75rem',
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="all">
            <AllIcon sx={{ fontSize: 15, mr: 0.5 }} />
            Todos ({statuses.length})
          </ToggleButton>
          <ToggleButton value="unallocated" disabled={noAllocCount === 0}>
            <NoAllocIcon sx={{ fontSize: 15, mr: 0.5 }} />
            Sem alocação ({noAllocCount})
          </ToggleButton>
          {overdueCount > 0 && (
            <ToggleButton value="overdue">
              <OverdueIcon sx={{ fontSize: 15, mr: 0.5 }} />
              Vencidos ({overdueCount})
            </ToggleButton>
          )}
          <ToggleButton value="allocated" disabled={allocatedCount === 0}>
            <OkIcon sx={{ fontSize: 15, mr: 0.5 }} />
            Alocados ({allocatedCount})
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider />

        {/* Member list */}
        {statuses.length === 0 ? (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Nenhum membro ativo cadastrado.
          </Alert>
        ) : filtered.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={3}
          >
            Nenhum membro nesta categoria.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: '55vh', overflow: 'auto', pr: 0.25 }}>
            <Stack spacing={0.75}>
              {filtered.map((s) => (
                <MemberCard key={s.member.id} status={s} />
              ))}
            </Stack>
          </Box>
        )}

        <Typography
          variant="caption"
          color="text.disabled"
          textAlign="center"
          display="block"
        >
          Baseado nas notas ativas com vínculos de membro.
        </Typography>
      </Stack>
    </Modal>
  );
}

export default AllocationStatusModal;
