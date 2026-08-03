import { useState, useCallback, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
  Stack,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Circle as CircleIcon,
  DeleteSweep as ClearIcon,
  DoneAll as DoneAllIcon,
  OpenInNew as OpenIcon,
  SwapHoriz as MoveIcon,
} from '@mui/icons-material';
import {
  useNotificationCenter,
  type NotificationEntry,
} from '@renderer/hooks/useNotificationCenter';
import { TaskViewModal } from '@renderer/components/TaskViewModal';
import type { Task } from '@shared/interfaces/config/index.types';

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return `Hoje, ${formatTime(d)}`;
  if (isYesterday) return `Ontem, ${formatTime(d)}`;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_COLORS: Record<string, string> = {
  Ticket: '#16A34A',
  Improvement: '#DB2777',
  'User Story': '#2563EB',
};

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    clear,
    setOpenTaskHandler,
  } = useNotificationCenter();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
      markAllRead();
    },
    [markAllRead],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpenTask = useCallback(
    async (externalId: string) => {
      handleClose();
      try {
        const res = await window.electronAPI.task.findAll({});
        if (res.success && res.data) {
          const task = res.data.find((t) => t.externalId === externalId);
          if (task) {
            setSelectedTask(task);
            setIsTaskModalOpen(true);
          }
        }
      } catch {
        /* ignore */
      }
    },
    [handleClose],
  );

  // Register the open task handler so native notification clicks work
  useEffect(() => {
    setOpenTaskHandler(handleOpenTask);
  }, [handleOpenTask, setOpenTaskHandler]);

  const handleCloseTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  }, []);

  const handleItemClick = useCallback(
    (entry: NotificationEntry, externalId: string) => {
      markRead(entry.id);
      handleOpenTask(externalId);
    },
    [markRead, handleOpenTask],
  );

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton onClick={handleOpen} color="primary" size="small">
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? (
              <NotificationsIcon fontSize="small" />
            ) : (
              <NotificationsNoneIcon fontSize="small" />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 400,
              maxHeight: 480,
              borderRadius: 2,
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Notificações
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {notifications.length > 0 && (
              <>
                <Tooltip title="Marcar todas como lidas">
                  <IconButton size="small" onClick={markAllRead}>
                    <DoneAllIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Limpar todas">
                  <IconButton size="small" onClick={clear}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>

        {/* Content */}
        <Box sx={{ overflow: 'auto', maxHeight: 400 }}>
          {notifications.length === 0 ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ py: 6, px: 2 }}
            >
              <NotificationsNoneIcon
                sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                Nenhuma notificação
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                textAlign="center"
                sx={{ mt: 0.5 }}
              >
                Movimentações de Tickets, Improvements e User Stories aparecerão
                aqui após a sincronização.
              </Typography>
            </Stack>
          ) : (
            notifications.map((entry, idx) => (
              <Box key={entry.id}>
                {idx > 0 && <Divider />}
                <NotificationItem entry={entry} onItemClick={handleItemClick} />
              </Box>
            ))
          )}
        </Box>
      </Popover>

      <TaskViewModal
        open={isTaskModalOpen}
        task={selectedTask}
        onClose={handleCloseTaskModal}
      />
    </>
  );
}

function NotificationItem({
  entry,
  onItemClick,
}: {
  entry: NotificationEntry;
  onItemClick: (entry: NotificationEntry, externalId: string) => void;
}) {
  // Group changes by new status for display
  const grouped = new Map<string, typeof entry.changes>();
  for (const change of entry.changes) {
    const group = grouped.get(change.newStatus) || [];
    group.push(change);
    grouped.set(change.newStatus, group);
  }

  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        bgcolor: entry.read ? 'transparent' : 'action.hover',
        transition: 'background-color 0.2s',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
        {!entry.read && (
          <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
        )}
        <MoveIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {formatDate(entry.timestamp)}
        </Typography>
        <Chip
          label={`${entry.changes.length} ${entry.changes.length === 1 ? 'item' : 'itens'}`}
          size="small"
          variant="outlined"
        />
      </Stack>

      {Array.from(grouped.entries()).map(([newStatus, items]) => (
        <Box key={newStatus} sx={{ mb: 0.75 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ display: 'block', mb: 0.5 }}
          >
            → {newStatus}
          </Typography>
          <Stack spacing={0.5}>
            {items.map((change) => (
              <Stack
                key={change.externalId}
                direction="row"
                alignItems="center"
                spacing={0.75}
                sx={{
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
                onClick={() => onItemClick(entry, change.externalId)}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{
                    color: TYPE_COLORS[change.type] || 'text.secondary',
                    minWidth: 48,
                  }}
                >
                  #{change.externalId}
                </Typography>
                <Chip
                  label={change.type}
                  size="small"
                  sx={{
                    bgcolor: TYPE_COLORS[change.type] || '#64748B',
                    color: '#fff',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {change.title}
                </Typography>
                <OpenIcon
                  sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}
