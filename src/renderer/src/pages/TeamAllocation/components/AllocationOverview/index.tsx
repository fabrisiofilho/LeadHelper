import { useMemo } from 'react';
import {
  Typography,
  Stack,
  Box,
  Chip,
  Avatar,
  Tooltip,
  LinearProgress,
  Paper,
  Button,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  PersonOff as PersonOffIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type {
  Team,
  TeamMember,
  TeamMemberAllocation,
  TeamMemberRole,
} from '@shared/interfaces/config/index.types';
import { getInitials, ROLE_COLORS } from '@renderer/utils/member';

interface AllocationOverviewProps {
  teams: Team[];
  teamMembers: TeamMember[];
  allAllocations: TeamMemberAllocation[];
  selectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  onNewTeam: () => void;
}

const roleLabels: Record<TeamMemberRole, string> = {
  developer: 'Dev',
  analyst: 'Analista',
  qa: 'QA',
  tech_lead: 'Tech Lead',
  devops: 'DevOps',
  designer: 'Designer',
  product_owner: 'PO',
};

const roleColors = ROLE_COLORS;

export function AllocationOverview({
  teams,
  teamMembers,
  allAllocations,
  selectedTeam,
  onSelectTeam,
  onNewTeam,
}: AllocationOverviewProps) {
  const activeAllocations = useMemo(
    () => allAllocations.filter((a) => a.isActive),
    [allAllocations],
  );

  const teamSummaries = useMemo(() => {
    return teams
      .filter((t) => t.isActive)
      .map((team) => {
        const teamAllocs = activeAllocations.filter(
          (a) => a.teamId === team.id,
        );
        const totalDedication = teamAllocs.reduce(
          (sum, a) => sum + a.dedicationPercentage,
          0,
        );
        return {
          team,
          allocations: teamAllocs,
          memberCount: teamAllocs.length,
          totalDedication,
        };
      })
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [teams, activeAllocations]);

  const unallocatedMembers = useMemo(() => {
    const allocatedMemberIds = new Set(
      activeAllocations.map((a) => a.teamMemberId),
    );
    return teamMembers.filter(
      (m) => m.isActive && !allocatedMemberIds.has(m.id),
    );
  }, [teamMembers, activeAllocations]);

  return (
    <Stack spacing={2}>
      {/* Team cards */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 1,
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': {
            borderRadius: 2,
            bgcolor: 'rgba(0,0,0,0.1)',
          },
        }}
      >
        {teamSummaries.map(
          ({ team, allocations: teamAllocs, memberCount, totalDedication }) => {
            const isSelected = selectedTeam?.id === team.id;
            const avgDedication =
              memberCount > 0 ? Math.round(totalDedication / memberCount) : 0;

            return (
              <Paper
                key={team.id}
                elevation={isSelected ? 3 : 0}
                onClick={() => onSelectTeam(team)}
                sx={{
                  p: 1.5,
                  minWidth: 200,
                  maxWidth: 240,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: isSelected ? 'primary.main' : 'background.paper',
                  color: isSelected ? 'primary.contrastText' : 'text.primary',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  '&:hover': {
                    borderColor: isSelected ? 'primary.main' : 'primary.light',
                    bgcolor: isSelected ? 'primary.main' : 'action.hover',
                  },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <GroupsIcon
                    fontSize="small"
                    sx={{
                      color: isSelected ? '#fff' : 'text.secondary',
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    noWrap
                    sx={{
                      flex: 1,
                      color: isSelected ? '#fff' : 'text.primary',
                    }}
                  >
                    {team.name}
                  </Typography>
                  <Chip
                    label={memberCount}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : 'action.hover',
                      color: isSelected ? '#fff' : 'text.secondary',
                    }}
                  />
                </Stack>

                {/* Member avatars */}
                <Stack direction="row" spacing={-0.5} mb={1}>
                  {teamAllocs.slice(0, 5).map((alloc) => (
                    <Tooltip
                      key={alloc.id}
                      title={`${alloc.teamMemberName} - ${alloc.dedicationPercentage}%`}
                    >
                      <Avatar
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.6rem',
                          border: '2px solid',
                          borderColor: isSelected
                            ? 'primary.main'
                            : 'background.paper',
                          bgcolor: isSelected
                            ? 'rgba(255,255,255,0.3)'
                            : 'grey.400',
                          color: '#fff',
                        }}
                      >
                        {alloc.teamMemberName
                          ? getInitials(alloc.teamMemberName)
                          : '?'}
                      </Avatar>
                    </Tooltip>
                  ))}
                  {teamAllocs.length > 5 && (
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.55rem',
                        border: '2px solid',
                        borderColor: isSelected
                          ? 'primary.main'
                          : 'background.paper',
                        bgcolor: 'grey.500',
                        color: '#fff',
                      }}
                    >
                      +{teamAllocs.length - 5}
                    </Avatar>
                  )}
                  {teamAllocs.length === 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: isSelected
                          ? 'rgba(255,255,255,0.8)'
                          : 'text.disabled',
                      }}
                    >
                      Sem membros
                    </Typography>
                  )}
                </Stack>

                {/* Avg dedication bar */}
                {memberCount > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(avgDedication, 100)}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: isSelected
                          ? 'rgba(255,255,255,0.2)'
                          : 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 2,
                          bgcolor: isSelected ? '#fff' : undefined,
                        },
                      }}
                      color={
                        avgDedication > 80
                          ? 'error'
                          : avgDedication > 50
                            ? 'warning'
                            : 'primary'
                      }
                    />
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        color: isSelected ? '#fff' : 'text.secondary',
                        minWidth: 30,
                        textAlign: 'right',
                      }}
                    >
                      {avgDedication}%
                    </Typography>
                  </Stack>
                )}
              </Paper>
            );
          },
        )}

        {/* Add new team card */}
        <Paper
          variant="outlined"
          onClick={onNewTeam}
          sx={{
            p: 1.5,
            minWidth: 120,
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          <AddIcon sx={{ color: 'text.secondary', mb: 0.5 }} />
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Nova Equipe
          </Typography>
        </Paper>
      </Box>

      {/* Unallocated members */}
      {unallocatedMembers.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderColor: 'warning.light',
            bgcolor: 'warning.50',
            borderRadius: 2,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <PersonOffIcon fontSize="small" sx={{ color: 'warning.main' }} />
            <Typography
              variant="subtitle2"
              fontWeight={600}
              color="warning.dark"
            >
              Membros sem alocação ({unallocatedMembers.length})
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {unallocatedMembers.map((member) => (
              <Chip
                key={member.id}
                icon={
                  <Avatar
                    sx={{
                      width: 20,
                      height: 20,
                      fontSize: '0.6rem',
                      bgcolor: roleColors[member.role],
                    }}
                  >
                    {getInitials(member.name)}
                  </Avatar>
                }
                label={
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <span>{member.name}</span>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: 'text.secondary' }}
                    >
                      {roleLabels[member.role]}
                    </Typography>
                  </Stack>
                }
                variant="outlined"
                size="small"
                sx={{
                  height: 28,
                  '& .MuiChip-icon': { ml: 0.5 },
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

export default AllocationOverview;
