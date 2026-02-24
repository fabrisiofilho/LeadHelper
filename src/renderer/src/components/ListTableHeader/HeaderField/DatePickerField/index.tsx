import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ptBR } from 'date-fns/locale/pt-BR';
import { parseDateSafe } from '@renderer/utils/date';

type Props = {
  label: string;
  value: string | Date | null;
  onAccept?: (date: string | Date | null) => void;
  handleChange: (value: string | Date | null) => void;
  disabledDatePicker?: boolean;
  disableFuture?: boolean;
  disablePast?: boolean;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
  popperOffset?: number[];
};

export function DatePickerField({
  label,
  value,
  disabledDatePicker,
  onAccept,
  handleChange,
  minDate,
  maxDate,
  disableFuture,
  disablePast,
}: Readonly<Props>) {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <MuiDatePicker
        views={['year', 'day']}
        minDate={parseDateSafe(minDate) ?? undefined}
        maxDate={parseDateSafe(maxDate) ?? undefined}
        label={label}
        value={parseDateSafe(value)}
        disabled={disabledDatePicker}
        disableFuture={disableFuture}
        disablePast={disablePast}
        onChange={handleChange}
        onAccept={onAccept}
        slotProps={{
          textField: {
            size: 'small',
            InputLabelProps: {
              shrink: true,
            },
          },
        }}
      />
    </LocalizationProvider>
  );
}
