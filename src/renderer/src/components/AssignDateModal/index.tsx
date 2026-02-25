import { useState } from 'react';
import { Typography, Stack } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { Modal } from '@renderer/components/Modal';
import { DateRangeWithBusinessDays } from '@renderer/components/DateRangeWithBusinessDays';

export interface AssignDateModalProps {
  open: boolean;
  memberName: string;
  taskTitle: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (startDate: Date, endDate: Date) => void;
}

export function AssignDateModal({
  open,
  memberName,
  taskTitle,
  loading = false,
  onClose,
  onConfirm,
}: AssignDateModalProps) {
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!startDate) {
      setError('Data início é obrigatória');
      return;
    }
    if (!endDate) {
      setError('Data fim é obrigatória');
      return;
    }
    if (endDate < startDate) {
      setError('Data fim deve ser posterior à data início');
      return;
    }
    setError(null);
    onConfirm(startDate, endDate);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Modal
        variant="form"
        open={open}
        title="Definir período da alocação"
        handleClose={onClose}
        handleConfirm={handleConfirm}
        confirmLabel="Atribuir"
        cancelLabel="Cancelar"
        loading={loading}
        setMaxWidth="580px"
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Atribuindo <strong>{memberName}</strong> à tarefa{' '}
            <strong>{taskTitle}</strong>. Informe o período da alocação:
          </Typography>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <DateRangeWithBusinessDays
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            startRequired
            endRequired
          />
        </Stack>
      </Modal>
    </LocalizationProvider>
  );
}

export default AssignDateModal;
