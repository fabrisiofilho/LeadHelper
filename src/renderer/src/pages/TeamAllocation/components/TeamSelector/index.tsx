import {
  Autocomplete,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Stack,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import type { Team } from '@shared/interfaces/config/index.types';

export interface TeamSelectorProps {
  teams: Team[];
  selectedTeam: Team | null;
  loading: boolean;
  onSelectTeam: (team: Team | null) => void;
  onNewTeam: () => void;
  onEditTeam?: (team: Team) => void;
}

export function TeamSelector({
  teams,
  selectedTeam,
  loading,
  onSelectTeam,
  onNewTeam,
  onEditTeam,
}: TeamSelectorProps) {
  return (
    <>
      <Autocomplete
        size="small"
        options={teams}
        value={selectedTeam}
        loading={loading}
        onChange={(_e, value) => onSelectTeam(value)}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Stack direction="column" width="100%">
              <Typography variant="body2">{option.name}</Typography>
              {option.description && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {option.description}
                </Typography>
              )}
            </Stack>
          </li>
        )}
        sx={{ minWidth: 280, maxWidth: 400 }}
        renderInput={(params) => (
          <TextField {...params} placeholder="Selecionar equipe..." />
        )}
        noOptionsText="Nenhuma equipe encontrada"
        loadingText="Carregando..."
      />

      {selectedTeam && onEditTeam && (
        <Tooltip title="Editar equipe">
          <IconButton size="small" onClick={() => onEditTeam(selectedTeam)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={onNewTeam}
        sx={{ borderRadius: '0.5rem', whiteSpace: 'nowrap' }}
      >
        Nova Equipe
      </Button>
    </>
  );
}

export default TeamSelector;
