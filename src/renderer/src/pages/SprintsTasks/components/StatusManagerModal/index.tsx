import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Box,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type {
  TaskStatusConfig,
  CreateTaskStatusConfigInput,
  UpdateTaskStatusConfigInput,
} from '@shared/interfaces/config/index.types';

export interface StatusManagerModalProps {
  open: boolean;
  statuses: TaskStatusConfig[];
  loading: boolean;
  onClose: () => void;
  onCreate: (
    data: CreateTaskStatusConfigInput,
  ) => Promise<TaskStatusConfig | null>;
  onUpdate: (
    id: number,
    data: UpdateTaskStatusConfigInput,
  ) => Promise<TaskStatusConfig | null>;
  onDelete: (id: number) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export function StatusManagerModal({
  open,
  statuses,
  loading,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: StatusManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#1976d2');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewName('');
      setNewLabel('');
      setNewColor('#1976d2');
      setAdding(false);
    }
  }, [open]);

  const handleAdd = async () => {
    if (!newName.trim() || !newLabel.trim()) return;
    const result = await onCreate({
      name: newName.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newLabel.trim(),
      color: newColor,
      showInKanban: true,
    });
    if (result) {
      setNewName('');
      setNewLabel('');
      setNewColor('#1976d2');
      setAdding(false);
      await onRefresh();
    }
  };

  const handleToggleKanban = async (status: TaskStatusConfig) => {
    await onUpdate(status.id, { showInKanban: !status.showInKanban });
    await onRefresh();
  };

  const handleColorChange = async (status: TaskStatusConfig, color: string) => {
    await onUpdate(status.id, { color });
    await onRefresh();
  };

  const handleLabelChange = async (status: TaskStatusConfig, label: string) => {
    if (label.trim()) {
      await onUpdate(status.id, { label: label.trim() });
      await onRefresh();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerenciar Status do Kanban</DialogTitle>
      <DialogContent>
        {loading && statuses.length === 0 ? (
          <Stack alignItems="center" p={3}>
            <CircularProgress size={32} />
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Configure os status disponíveis e quais aparecem no Kanban.
            </Typography>

            {statuses.map((status) => (
              <Box key={status.id}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <input
                    type="color"
                    value={status.color}
                    onChange={(e) => handleColorChange(status, e.target.value)}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label={`Cor do status ${status.label}`}
                  />
                  <TextField
                    size="small"
                    defaultValue={status.label}
                    onBlur={(e) => handleLabelChange(status, e.target.value)}
                    sx={{ flex: 1 }}
                    aria-label={`Nome do status ${status.label}`}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={status.showInKanban}
                        onChange={() => handleToggleKanban(status)}
                        size="small"
                      />
                    }
                    label={<Typography variant="caption">Kanban</Typography>}
                  />
                  {!status.isDefault && (
                    <Tooltip title="Excluir status">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          await onDelete(status.id);
                          await onRefresh();
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            ))}

            <Divider />

            {adding ? (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2">Novo Status</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: 32,
                      height: 32,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    aria-label="Cor do novo status"
                  />
                  <TextField
                    size="small"
                    label="Identificador"
                    placeholder="ex: review"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="Rótulo"
                    placeholder="ex: Em Revisão"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                </Stack>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button size="small" onClick={() => setAdding(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAdd}
                    disabled={!newName.trim() || !newLabel.trim()}
                  >
                    Adicionar
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setAdding(true)}
              >
                Adicionar Status
              </Button>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default StatusManagerModal;
