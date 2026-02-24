import { Show } from '@renderer/components/Show';
import { Box, FormHelperText } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ptBR } from 'date-fns/locale/pt-BR';
import { parseDateSafe } from '@renderer/utils/date';

export type DatePickerProps = {
  value: string | Date | null;
  onChange: (value: Date | null) => void;
  onAccept?: (date: Date | null) => void;
  label?: string;
  disabled?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  defaultValue?: Date | null;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  required?: boolean;
  views?: ('year' | 'month' | 'day')[];
  format?: string;
};

export function DatePicker({
  value,
  onChange,
  onAccept,
  label,
  error,
  helperText,
  required,
  fullWidth,
  disabled,
  disableFuture,
  disablePast,
  minDate,
  maxDate,
  views = ['year', 'month', 'day'],
  format = 'dd/MM/yyyy',
}: Readonly<DatePickerProps>) {
  const handleChange = (newValue: Date | null) => {
    onChange(newValue);
  };

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <MuiDatePicker
          label={label}
          value={parseDateSafe(value)}
          onChange={handleChange}
          onAccept={onAccept}
          disabled={disabled}
          disableFuture={disableFuture}
          disablePast={disablePast}
          minDate={parseDateSafe(minDate) ?? undefined}
          maxDate={parseDateSafe(maxDate) ?? undefined}
          views={views}
          format={format}
          slotProps={{
            textField: {
              fullWidth,
              required,
              error,
              size: 'small',
              InputLabelProps: {
                shrink: true,
              },
            },
            actionBar: {
              actions: ['clear', 'today'],
            },
          }}
          localeText={{
            clearButtonLabel: 'Limpar',
            todayButtonLabel: 'Hoje',
            cancelButtonLabel: 'Cancelar',
            okButtonLabel: 'OK',
          }}
        />
      </LocalizationProvider>

      <Show.When isTrue={!!helperText}>
        <Box position="relative">
          <FormHelperText error={error} variant="outlined">
            {helperText}
          </FormHelperText>
        </Box>
      </Show.When>
    </Box>
  );
}
