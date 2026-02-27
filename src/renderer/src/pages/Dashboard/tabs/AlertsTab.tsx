import { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PersonOff as PersonOffIcon,
  Assignment as TaskIcon,
  EventBusy as EventBusyIcon,
} from '@mui/icons-material';
import { useDashboard } from '@renderer/hooks/useDashboard';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTasks } from '@renderer/hooks/useTasks';
import { useTeamMemberAllocations } from '@renderer/hooks/useTeamMemberAllocations';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

export function AlertsTab() {
  const { membersWithoutAllocation } = useDashboard();
  const { sprints } = useSprints();
  const { tasks } = useTasks();
  const { allocations } = useTeamMemberAllocations();

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (!t.endDate || t.status === 'done' || t.status === 'completed')
        return false;
      return new Date(t.endDate) < now;
    });
  }, [tasks]);

  const endingSprints = useMemo(() => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return sprints.filter((s) => {
      const end = new Date(s.endDate);
      return s.isActive && end > now && end <= in7Days;
    });
  }, [sprints]);

  const endingAllocations = useMemo(() => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return allocations.filter((a) => {
      if (!a.endDate || !a.isActive) return false;
      const end = new Date(a.endDate);
      return end > now && end <= in7Days;
    });
  }, [allocations]);

  const unassignedTasks = useMemo(() => {
    return tasks.filter(
      (t) =>
        !t.assignedToEmail && t.status !== 'done' && t.status !== 'completed',
    );
  }, [tasks]);

  const totalAlerts =
    overdueTasks.length +
    endingSprints.length +
    endingAllocations.length +
    membersWithoutAllocation.length +
    unassignedTasks.length;

  return (
    <Stack spacing={2}>
      {totalAlerts === 0 ? (
        <Alert severity="success">
          <AlertTitle>Tudo em ordem!</AlertTitle>
          Não há alertas ou ações pendentes no momento.
        </Alert>
      ) : (
        <Alert severity="info">
          <AlertTitle>Atenção necessária</AlertTitle>
          {totalAlerts} alerta(s) requerem sua atenção.
        </Alert>
      )}

      {overdueTasks.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'error.main',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <ErrorIcon color="error" />
            <Typography variant="h6" fontWeight={600}>
              Tarefas Atrasadas
            </Typography>
            <Chip label={overdueTasks.length} size="small" color="error" />
          </Stack>
          <List dense>
            {overdueTasks.slice(0, 5).map((task) => (
              <ListItem key={task.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <TaskIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={task.title}
                  secondary={`Prazo: ${new Date(task.endDate!).toLocaleDateString('pt-BR')} • ${task.assignedToName || 'Não atribuída'}`}
                />
              </ListItem>
            ))}
          </List>
          {overdueTasks.length > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              E mais {overdueTasks.length - 5} tarefa(s) atrasada(s)
            </Typography>
          )}
        </Box>
      )}

      {unassignedTasks.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'warning.main',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <WarningIcon color="warning" />
            <Typography variant="h6" fontWeight={600}>
              Tarefas Não Atribuídas
            </Typography>
            <Chip label={unassignedTasks.length} size="small" color="warning" />
          </Stack>
          <List dense>
            {unassignedTasks.slice(0, 5).map((task) => (
              <ListItem key={task.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <TaskIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={task.title}
                  secondary={`Status: ${task.status} • Sprint: ${task.sprint?.name || 'Sem sprint'}`}
                />
              </ListItem>
            ))}
          </List>
          {unassignedTasks.length > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              E mais {unassignedTasks.length - 5} tarefa(s) não atribuída(s)
            </Typography>
          )}
        </Box>
      )}

      {membersWithoutAllocation.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'info.main',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <PersonOffIcon color="info" />
            <Typography variant="h6" fontWeight={600}>
              Membros sem Alocação
            </Typography>
            <Chip
              label={membersWithoutAllocation.length}
              size="small"
              color="info"
            />
          </Stack>
          <List dense>
            {membersWithoutAllocation.slice(0, 5).map((member) => (
              <ListItem key={member.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: ROLE_COLORS[member.role] }}>
                    {getInitials(member.name)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={member.name}
                  secondary={`${member.role} • ${member.email}`}
                />
              </ListItem>
            ))}
          </List>
          {membersWithoutAllocation.length > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              E mais {membersWithoutAllocation.length - 5} membro(s) sem
              alocação
            </Typography>
          )}
        </Box>
      )}

      {endingSprints.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'warning.main',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <EventBusyIcon color="warning" />
            <Typography variant="h6" fontWeight={600}>
              Sprints Terminando em Breve
            </Typography>
            <Chip label={endingSprints.length} size="small" color="warning" />
          </Stack>
          <List dense>
            {endingSprints.map((sprint) => (
              <ListItem key={sprint.id}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <EventBusyIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={sprint.name}
                  secondary={`Termina em: ${new Date(sprint.endDate).toLocaleDateString('pt-BR')}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {endingAllocations.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'info.main',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <InfoIcon color="info" />
            <Typography variant="h6" fontWeight={600}>
              Alocações Terminando em Breve
            </Typography>
            <Chip label={endingAllocations.length} size="small" color="info" />
          </Stack>
          <List dense>
            {endingAllocations.slice(0, 5).map((allocation) => (
              <ListItem key={allocation.id}>
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor:
                        ROLE_COLORS[allocation.teamMember?.role || 'developer'],
                    }}
                  >
                    {getInitials(allocation.teamMember?.name || '')}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={allocation.teamMember?.name}
                  secondary={`${allocation.team?.name} • Termina em: ${new Date(allocation.endDate!).toLocaleDateString('pt-BR')}`}
                />
              </ListItem>
            ))}
          </List>
          {endingAllocations.length > 5 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: 'block' }}
            >
              E mais {endingAllocations.length - 5} alocação(ões) terminando
            </Typography>
          )}
        </Box>
      )}
    </Stack>
  );
}
