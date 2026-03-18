import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  Chip,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { Modal } from '@renderer/components/Modal';
import {
  StandardTable,
  type StandardColumn,
} from '@renderer/components/StandardTable';
import type { Position } from '@shared/interfaces/config/index.types';

interface ImportRow {
  email: string;
  positionName: string;
  positionId: number | null;
  emailValid: boolean;
  positionValid: boolean;
  editing: boolean;
}

interface ImportPositionsModalProps {
  open: boolean;
  onClose: () => void;
  positions: Position[];
  memberEmails: string[];
  onImport: (
    rows: Array<{ email: string; positionId: number }>,
  ) => Promise<void>;
}

const COLUMNS: StandardColumn[] = [
  { id: 'status', label: '', noSort: true },
  { id: 'email', label: 'Email' },
  { id: 'position', label: 'Cargo' },
  { id: 'actions', label: '', noSort: true, align: 'right' },
];

function parseCsv(
  text: string,
): Array<{ email: string; positionName: string }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const results: Array<{ email: string; positionName: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Try semicolon, comma, tab
    const sep = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
    const parts = line
      .split(sep)
      .map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (i === 0 && parts[0]?.toLowerCase().includes('email')) continue; // skip header
    if (parts.length >= 2) {
      results.push({ email: parts[0], positionName: parts[1] });
    }
  }
  return results;
}

export function ImportPositionsModal({
  open,
  onClose,
  positions,
  memberEmails,
  onImport,
}: ImportPositionsModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    updated: number;
    errors: string[];
  } | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setResult(null);
      setFileLoaded(false);
    }
  }, [open]);

  const emailSet = useMemo(
    () => new Set(memberEmails.map((e) => e.toLowerCase())),
    [memberEmails],
  );

  const resolvePosition = useCallback(
    (name: string): { id: number | null; valid: boolean } => {
      const match = positions.find(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
      return match ? { id: match.id, valid: true } : { id: null, valid: false };
    },
    [positions],
  );

  const handleFileSelect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseCsv(text);
      const mapped: ImportRow[] = parsed.map((r) => {
        const pos = resolvePosition(r.positionName);
        return {
          email: r.email,
          positionName: r.positionName,
          positionId: pos.id,
          emailValid: emailSet.has(r.email.toLowerCase()),
          positionValid: pos.valid,
          editing: false,
        };
      });
      setRows(mapped);
      setFileLoaded(true);
      setResult(null);
    };
    input.click();
  }, [resolvePosition, emailSet]);

  const handlePositionChange = useCallback(
    (index: number, positionId: number) => {
      setRows((prev) => {
        const next = [...prev];
        const pos = positions.find((p) => p.id === positionId);
        next[index] = {
          ...next[index],
          positionId,
          positionName: pos?.name ?? next[index].positionName,
          positionValid: true,
          editing: false,
        };
        return next;
      });
    },
    [positions],
  );

  const toggleEditing = useCallback((index: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], editing: !next[index].editing };
      return next;
    });
  }, []);

  const hasErrors = rows.some((r) => !r.emailValid || !r.positionValid);
  const validRows = rows.filter(
    (r) => r.emailValid && r.positionValid && r.positionId,
  );

  const handleImport = useCallback(async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      await onImport(
        validRows.map((r) => ({ email: r.email, positionId: r.positionId! })),
      );
      setResult({ updated: validRows.length, errors: [] });
    } catch {
      setResult({ updated: 0, errors: ['Erro ao importar'] });
    } finally {
      setImporting(false);
    }
  }, [validRows, onImport]);

  return (
    <Modal
      variant="form"
      open={open}
      title="Importar Cargos via CSV"
      handleClose={onClose}
      handleConfirm={handleImport}
      confirmLabel={`Importar (${validRows.length})`}
      cancelLabel="Fechar"
      loading={importing}
      setMaxWidth="700px"
      confirmDisabled={validRows.length === 0 || !!result}
    >
      <Stack spacing={2}>
        {!fileLoaded && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleFileSelect}
            >
              Selecionar arquivo CSV
            </Button>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              mt={1}
            >
              Formato: email;cargo (separado por ; ou , ou tab)
            </Typography>
          </Box>
        )}

        {fileLoaded && !result && (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="body2" color="text.secondary">
                {rows.length} registro(s) encontrado(s) — {validRows.length}{' '}
                válido(s)
              </Typography>
              <Button size="small" onClick={handleFileSelect}>
                Trocar arquivo
              </Button>
            </Stack>

            {hasErrors && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Corrija os erros antes de importar. Clique no ícone de edição
                para selecionar um cargo existente.
              </Alert>
            )}

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <StandardTable
                columns={COLUMNS}
                sortConfig={null}
                onSort={() => {}}
                rows={rows.map((row, idx) => ({
                  id: idx,
                  cells: {
                    status:
                      row.emailValid && row.positionValid ? (
                        <CheckIcon fontSize="small" color="success" />
                      ) : (
                        <ErrorIcon fontSize="small" color="error" />
                      ),
                    email: (
                      <Stack>
                        <Typography
                          variant="body2"
                          color={row.emailValid ? 'text.primary' : 'error.main'}
                        >
                          {row.email}
                        </Typography>
                        {!row.emailValid && (
                          <Typography variant="caption" color="error.main">
                            Email não encontrado
                          </Typography>
                        )}
                      </Stack>
                    ),
                    position: row.editing ? (
                      <TextField
                        select
                        size="small"
                        value={row.positionId ?? ''}
                        onChange={(e) =>
                          handlePositionChange(idx, Number(e.target.value))
                        }
                        sx={{ minWidth: 180 }}
                        autoFocus
                      >
                        {positions
                          .filter((p) => p.isActive)
                          .map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                      </TextField>
                    ) : (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Chip
                          label={row.positionName}
                          size="small"
                          color={row.positionValid ? 'primary' : 'error'}
                          variant={row.positionValid ? 'outlined' : 'filled'}
                        />
                        {!row.positionValid && (
                          <Typography variant="caption" color="error.main">
                            Não existe
                          </Typography>
                        )}
                      </Stack>
                    ),
                    actions:
                      !row.positionValid || row.editing ? (
                        <Tooltip
                          title={row.editing ? 'Cancelar' : 'Selecionar cargo'}
                        >
                          <IconButton
                            size="small"
                            onClick={() => toggleEditing(idx)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null,
                  },
                }))}
                page={0}
                rowsPerPage={rows.length}
                totalCount={rows.length}
                onPageChange={() => {}}
                onRowsPerPageChange={() => {}}
                hidePagination
              />
            </Box>
          </>
        )}

        {result && (
          <Alert severity={result.errors.length > 0 ? 'warning' : 'success'}>
            {result.updated} cargo(s) atualizado(s) com sucesso.
            {result.errors.length > 0 && (
              <Box mt={1}>
                {result.errors.map((err, i) => (
                  <Typography
                    key={i}
                    variant="caption"
                    display="block"
                    color="error.main"
                  >
                    {err}
                  </Typography>
                ))}
              </Box>
            )}
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
