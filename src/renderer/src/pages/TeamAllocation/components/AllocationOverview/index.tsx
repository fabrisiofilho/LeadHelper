import { useMemo, useState } from 'react';
import {
  Typography,
  Stack,
  Box,
  Chip,
  Avatar,
  Tooltip,
  Paper,
  Button,
  Collapse,
} from '@mui/material';
import {
  Groups as GroupsIcon,
  PersonOff as PersonOffIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
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

function UnallocatedMembersByRole({
  members,
  roleLabels,
  roleColors: colors,
}: {
  members: TeamMember[];
  roleLabels: Record<TeamMemberRole, string>;
  roleColors: Record<TeamMemberRole, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<TeamMemberRole, TeamMember[]>();
    for (const m of members) {
      const list = map.get(m.role) || [];
      list.push(m);
      map.set(m.role, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [members]);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: 'warning.light',
        borderRadius: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonOffIcon fontSize="small" sx={{ color: 'warning.main' }} />
          <Typography variant="subtitle2" fontWeight={600} color="warning.dark">
            Membros sem alocação ({members.length})
          </Typography>
          {!expanded &&
            grouped.map(([role, roleMembers]) => (
              <Chip
                key={role}
                label={`${roleLabels[role]}: ${roleMembers.length}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: colors[role] + '15',
                  color: colors[role],
                  border: '1px solid',
                  borderColor: colors[role] + '40',
                }}
              />
            ))}
        </Stack>
        <Button
          size="small"
          endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ textTransform: 'none', minWidth: 'auto' }}
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </Button>
      </Stack>

      <Collapse in={expanded}>
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pt: 1.5,
            pb: 0.5,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 2,
              bgcolor: 'rgba(128,128,128,0.3)',
            },
          }}
        >
          {grouped.map(([role, roleMembers]) => (
            <Paper
              key={role}
              variant="outlined"
              sx={{
                p: 1.5,
                minWidth: 180,
                maxWidth: 260,
                borderColor: colors[role] + '60',
                borderRadius: 2,
                flexShrink: 0,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: colors[role],
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption" fontWeight={600} noWrap>
                  {roleLabels[role]}
                </Typography>
                <Chip
                  label={roleMembers.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    bgcolor: colors[role] + '20',
                    color: colors[role],
                  }}
                />
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {roleMembers.map((member) => (
                  <Chip
                    key={member.id}
                    icon={
                      <Avatar
                        sx={{
                          width: 18,
                          height: 18,
                          fontSize: '0.55rem',
                          bgcolor: colors[role],
                        }}
                      >
                        {getInitials(member.name)}
                      </Avatar>
                    }
                    label={member.name}
                    variant="outlined"
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      '& .MuiChip-icon': { ml: 0.5 },
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

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
        return {
          team,
          allocations: teamAllocs,
          memberCount: teamAllocs.length,
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
            bgcolor: 'rgba(128,128,128,0.3)',
          },
        }}
      >
        {teamSummaries.map(({ team, allocations: teamAllocs, memberCount }) => {
          const isSelected = selectedTeam?.id === team.id;

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
                  <Tooltip key={alloc.id} title={`${alloc.teamMemberName}`}>
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
                          : 'grey.500',
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

              {/* Member count */}
              {memberCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: isSelected
                      ? 'rgba(255,255,255,0.8)'
                      : 'text.secondary',
                  }}
                >
                  {memberCount} {memberCount === 1 ? 'membro' : 'membros'}
                </Typography>
              )}
            </Paper>
          );
        })}

        {/* Add new team card — sticky on the right */}
        <Box
          sx={{
            position: 'sticky',
            right: 0,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'stretch',
            pl: 1.5,
            background: (theme) =>
              `linear-gradient(to right, transparent, ${theme.palette.background.default} 12px)`,
          }}
        >
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
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={500}
            >
              Nova Equipe
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Unallocated members grouped by role */}
      {unallocatedMembers.length > 0 && (
        <UnallocatedMembersByRole
          members={unallocatedMembers}
          roleLabels={roleLabels}
          roleColors={roleColors}
        />
      )}
    </Stack>
  );
}

export default AllocationOverview;
