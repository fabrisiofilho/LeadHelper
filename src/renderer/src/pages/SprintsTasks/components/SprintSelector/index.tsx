import {
  Autocomplete,
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import type { Sprint } from '@shared/interfaces/config/index.types';

export interface SprintSelectorProps {
  sprints: Sprint[];
  selectedSprint: Sprint | null;
  loading: boolean;
  onSelectSprint: (sprint: Sprint | null) => void;
  onNewSprint: () => void;
  onEditSprint?: (sprint: Sprint) => void;
}

type SprintStatus = {
  label: string;
  color: 'success' | 'primary' | 'default';
};

const getSprintStatus = (sprint: Sprint): SprintStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(sprint.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate);
  end.setHours(0, 0, 0, 0);

  if (today >= start && today <= end) {
    return { label: 'Em Andamento', color: 'success' };
  } else if (today < start) {
    return { label: 'Futura', color: 'primary' };
  } else {
    return { label: 'Finalizada', color: 'default' };
  }
};

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
};

export function SprintSelector({
  sprints,
  selectedSprint,
  loading,
  onSelectSprint,
  onNewSprint,
  onEditSprint,
}: SprintSelectorProps) {
  return (
    <>
      <Autocomplete
        size="small"
        options={sprints}
        value={selectedSprint}
        loading={loading}
        onChange={(_e, value) => onSelectSprint(value)}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderOption={(props, option) => {
          const status = getSprintStatus(option);
          return (
            <li {...props} key={option.id}>
              <Box sx={{ width: '100%', py: 0.5 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography variant="body2" fontWeight={500}>
                    {option.name}
                  </Typography>
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                    sx={{ height: 22, fontSize: '0.72rem' }}
                  />
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.25, display: 'block' }}
                >
                  {formatDate(option.startDate)} — {formatDate(option.endDate)}
                </Typography>
              </Box>
            </li>
          );
        }}
        sx={{ minWidth: 320, maxWidth: 480, flex: 1 }}
        slotProps={{
          popper: { sx: { minWidth: 340 } },
        }}
        renderInput={(params) => (
          <TextField {...params} placeholder="Selecionar sprint..." />
        )}
        noOptionsText="Nenhuma sprint encontrada"
        loadingText="Carregando..."
      />

      {selectedSprint && onEditSprint && (
        <Tooltip title="Editar sprint">
          <IconButton size="small" onClick={() => onEditSprint(selectedSprint)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Button
        variant="contained"
        size="small"
        startIcon={<AddIcon />}
        onClick={onNewSprint}
        sx={{ borderRadius: '0.5rem', whiteSpace: 'nowrap' }}
      >
        Nova Sprint
      </Button>
    </>
  );
}

export default SprintSelector;
