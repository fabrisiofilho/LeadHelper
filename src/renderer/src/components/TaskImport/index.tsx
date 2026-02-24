import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Stack,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useTasks } from '@renderer/hooks/useTasks';
import { useSprints } from '@renderer/hooks/useSprints';
import { useTeams } from '@renderer/hooks/useTeams';
import {
  ImportContainer,
  DropZone,
  PreviewContainer,
  MappingContainer,
  MappingRow,
  PreviewRow,
} from './styles';
import type { CreateTaskInput } from '@shared/interfaces/config/index.types';

interface TaskImportProps {
  onImportSuccess?: () => void;
  onClose?: () => void;
}

interface ColumnMapping {
  title: string;
  description: string;
  estimationPoints: string;
  estimationHours: string;
}

interface ParsedRow {
  [key: string]: string | number | undefined;
}

export function TaskImport({ onImportSuccess, onClose }: TaskImportProps) {
  const { create } = useTasks();
  const { sprints, findAll: findAllSprints } = useSprints();
  const { teams, findAll: findAllTeams } = useTeams();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [data, setData] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    title: '',
    description: '',
    estimationPoints: '',
    estimationHours: '',
  });
  const [selectedSprintId, setSelectedSprintId] = useState<number | ''>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load sprints and teams on mount
  useState(() => {
    findAllSprints();
    findAllTeams();
  });

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
          header: 1,
        });

        if (jsonData.length < 2) {
          setError(
            'O arquivo deve conter pelo menos um cabeçalho e uma linha de dados',
          );
          return;
        }

        const headerRow = jsonData[0] as unknown as string[];
        const dataRows = jsonData
          .slice(1)
          .map((row) => {
            const obj: ParsedRow = {};
            headerRow.forEach((header, index) => {
              obj[header] = (row as unknown as (string | number)[])[index];
            });
            return obj;
          })
          .filter((row) =>
            Object.values(row).some((v) => v !== undefined && v !== ''),
          );

        setHeaders(headerRow);
        setData(dataRows);
        setFile(file);
        setError(null);

        // Auto-map columns if possible
        const autoMapping: ColumnMapping = {
          title: '',
          description: '',
          estimationPoints: '',
          estimationHours: '',
        };

        headerRow.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (
            lowerHeader.includes('título') ||
            lowerHeader.includes('titulo') ||
            lowerHeader.includes('title') ||
            lowerHeader.includes('nome')
          ) {
            autoMapping.title = header;
          } else if (
            lowerHeader.includes('descrição') ||
            lowerHeader.includes('descricao') ||
            lowerHeader.includes('description')
          ) {
            autoMapping.description = header;
          } else if (
            lowerHeader.includes('ponto') ||
            lowerHeader.includes('point') ||
            lowerHeader.includes('story')
          ) {
            autoMapping.estimationPoints = header;
          } else if (
            lowerHeader.includes('hora') ||
            lowerHeader.includes('hour') ||
            lowerHeader.includes('time')
          ) {
            autoMapping.estimationHours = header;
          }
        });

        setMapping(autoMapping);
      } catch (err) {
        setError(
          'Erro ao processar arquivo. Verifique se é um arquivo Excel válido.',
        );
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile &&
        (droppedFile.name.endsWith('.xlsx') ||
          droppedFile.name.endsWith('.xls') ||
          droppedFile.name.endsWith('.csv'))
      ) {
        parseFile(droppedFile);
      } else {
        setError('Por favor, selecione um arquivo Excel (.xlsx, .xls) ou CSV');
      }
    },
    [parseFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        parseFile(selectedFile);
      }
    },
    [parseFile],
  );

  const handleClearFile = useCallback(() => {
    setFile(null);
    setHeaders([]);
    setData([]);
    setMapping({
      title: '',
      description: '',
      estimationPoints: '',
      estimationHours: '',
    });
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!mapping.title) {
      setError('Mapeie pelo menos o campo "Título"');
      return;
    }

    setImporting(true);
    setError(null);
    let success = 0;
    let failed = 0;

    for (const row of data) {
      const title = row[mapping.title];
      if (!title || typeof title !== 'string') {
        failed++;
        continue;
      }

      const taskData: CreateTaskInput = {
        title: String(title),
        description: mapping.description
          ? String(row[mapping.description] || '')
          : undefined,
        estimationPoints:
          mapping.estimationPoints && row[mapping.estimationPoints]
            ? Number(row[mapping.estimationPoints])
            : undefined,
        estimationHours:
          mapping.estimationHours && row[mapping.estimationHours]
            ? Number(row[mapping.estimationHours])
            : undefined,
        estimationType:
          mapping.estimationPoints && row[mapping.estimationPoints]
            ? 'points'
            : mapping.estimationHours && row[mapping.estimationHours]
              ? 'hours'
              : undefined,
        sprintId: selectedSprintId || undefined,
        teamId: selectedTeamId || undefined,
      };

      try {
        const result = await create(taskData);
        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setImportResult({ success, failed });

    if (success > 0) {
      onImportSuccess?.();
    }
  }, [
    data,
    mapping,
    selectedSprintId,
    selectedTeamId,
    create,
    onImportSuccess,
  ]);

  const isMappingValid = mapping.title !== '';

  return (
    <ImportContainer>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight={600}>
          Importar Tarefas
        </Typography>
        {file && (
          <Tooltip title="Limpar arquivo">
            <IconButton size="small" onClick={handleClearFile}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {importResult && (
        <Alert
          severity={importResult.failed === 0 ? 'success' : 'warning'}
          sx={{ mb: 2 }}
          onClose={() => setImportResult(null)}
        >
          {importResult.success} tarefa(s) importada(s) com sucesso
          {importResult.failed > 0 && `, ${importResult.failed} falha(s)`}
        </Alert>
      )}

      {!file ? (
        <DropZone
          $isDragActive={isDragActive}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Arraste um arquivo Excel ou clique para selecionar
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Formatos aceitos: .xlsx, .xls, .csv
          </Typography>
        </DropZone>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <Chip
              label={file.name}
              onDelete={handleClearFile}
              color="primary"
              variant="outlined"
            />
            <Typography variant="body2" color="text.secondary" mt={1}>
              {data.length} linha(s) encontrada(s)
            </Typography>
          </Box>

          <MappingContainer>
            <Typography variant="subtitle2" fontWeight={600}>
              Mapeamento de Colunas
            </Typography>

            <MappingRow>
              <Typography variant="body2" sx={{ minWidth: 120 }}>
                Título *
              </Typography>
              <ArrowIcon color="action" />
              <TextField
                select
                size="small"
                value={mapping.title}
                onChange={(e) =>
                  setMapping({ ...mapping, title: e.target.value })
                }
                sx={{ minWidth: 200 }}
                error={!mapping.title}
              >
                <MenuItem value="">Selecione...</MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </TextField>
            </MappingRow>

            <MappingRow>
              <Typography variant="body2" sx={{ minWidth: 120 }}>
                Descrição
              </Typography>
              <ArrowIcon color="action" />
              <TextField
                select
                size="small"
                value={mapping.description}
                onChange={(e) =>
                  setMapping({ ...mapping, description: e.target.value })
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </TextField>
            </MappingRow>

            <MappingRow>
              <Typography variant="body2" sx={{ minWidth: 120 }}>
                Pontos
              </Typography>
              <ArrowIcon color="action" />
              <TextField
                select
                size="small"
                value={mapping.estimationPoints}
                onChange={(e) =>
                  setMapping({ ...mapping, estimationPoints: e.target.value })
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </TextField>
            </MappingRow>

            <MappingRow>
              <Typography variant="body2" sx={{ minWidth: 120 }}>
                Horas
              </Typography>
              <ArrowIcon color="action" />
              <TextField
                select
                size="small"
                value={mapping.estimationHours}
                onChange={(e) =>
                  setMapping({ ...mapping, estimationHours: e.target.value })
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Nenhum</MenuItem>
                {headers.map((header) => (
                  <MenuItem key={header} value={header}>
                    {header}
                  </MenuItem>
                ))}
              </TextField>
            </MappingRow>
          </MappingContainer>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              size="small"
              label="Sprint (opcional)"
              value={selectedSprintId}
              onChange={(e) =>
                setSelectedSprintId(e.target.value as number | '')
              }
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Nenhuma</MenuItem>
              {sprints.map((sprint) => (
                <MenuItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Equipe (opcional)"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value as number | '')}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Nenhuma</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <PreviewContainer>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Pré-visualização (primeiras 5 linhas)
            </Typography>
            <Paper sx={{ overflow: 'hidden', borderRadius: 1 }}>
              <TableContainer sx={{ maxHeight: 250 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableCell key={header}>
                          <Typography variant="body2" fontWeight={500}>
                            {header}
                          </Typography>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.slice(0, 5).map((row, index) => (
                      <PreviewRow key={index}>
                        {headers.map((header) => (
                          <TableCell key={header}>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ maxWidth: 150 }}
                            >
                              {String(row[header] ?? '')}
                            </Typography>
                          </TableCell>
                        ))}
                      </PreviewRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </PreviewContainer>

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
            {onClose && (
              <Button variant="outlined" onClick={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!isMappingValid || importing}
              startIcon={
                importing ? <CircularProgress size={16} /> : <CheckIcon />
              }
            >
              {importing
                ? 'Importando...'
                : `Importar ${data.length} Tarefa(s)`}
            </Button>
          </Stack>
        </>
      )}
    </ImportContainer>
  );
}

export default TaskImport;
