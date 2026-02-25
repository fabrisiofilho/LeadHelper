import { useState, useEffect, useCallback } from 'react';
import { Stack, TextField, Tooltip } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  addBusinessDays,
  countBusinessDays,
} from '@renderer/utils/business-days';

export interface DateRangeWithBusinessDaysProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  disabled?: boolean;
  startRequired?: boolean;
  endRequired?: boolean;
  startError?: string;
  endError?: string;
  size?: 'small' | 'medium';
  startLabel?: string;
  endLabel?: string;
  /** Stack all fields vertically (useful in narrow sidebars) */
  vertical?: boolean;
}

export function DateRangeWithBusinessDays({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  startRequired = false,
  endRequired = false,
  startError,
  endError,
  size,
  startLabel = 'Data Início',
  endLabel = 'Data Fim',
  vertical = false,
}: DateRangeWithBusinessDaysProps) {
  const [businessDays, setBusinessDays] = useState<string>('');
  const [editingDays, setEditingDays] = useState(false);

  useEffect(() => {
    if (!editingDays && startDate && endDate) {
      const days = countBusinessDays(startDate, endDate);
      setBusinessDays(days > 0 ? String(days) : '');
    } else if (!startDate || !endDate) {
      if (!editingDays) setBusinessDays('');
    }
  }, [startDate, endDate, editingDays]);

  const handleBusinessDaysChange = useCallback(
    (value: string) => {
      setEditingDays(true);
      setBusinessDays(value);
      const days = parseInt(value, 10);
      if (startDate && days > 0) {
        onEndDateChange(addBusinessDays(startDate, days));
      }
      if (!value) onEndDateChange(null);
    },
    [startDate, onEndDateChange],
  );

  const handleBusinessDaysBlur = useCallback(() => {
    setEditingDays(false);
  }, []);

  const handleStartDateChange = useCallback(
    (date: Date | null) => {
      onStartDateChange(date);
      const days = parseInt(businessDays, 10);
      if (date && days > 0) {
        onEndDateChange(addBusinessDays(date, days));
      }
    },
    [onStartDateChange, onEndDateChange, businessDays],
  );

  const handleEndDateChange = useCallback(
    (date: Date | null) => {
      setEditingDays(false);
      onEndDateChange(date);
    },
    [onEndDateChange],
  );

  const startPicker = (
    <DatePicker
      label={startLabel}
      value={startDate}
      onChange={handleStartDateChange}
      disabled={disabled}
      slotProps={{
        textField: {
          fullWidth: true,
          required: startRequired,
          size,
          error: !!startError,
          helperText: startError,
        },
      }}
    />
  );

  const endPicker = (
    <DatePicker
      label={endLabel}
      value={endDate}
      onChange={handleEndDateChange}
      minDate={startDate || undefined}
      disabled={disabled}
      slotProps={{
        textField: {
          fullWidth: true,
          required: endRequired,
          size,
          error: !!endError,
          helperText: endError,
        },
      }}
    />
  );

  const daysField = (
    <Tooltip title="Preencha para calcular a data fim automaticamente">
      <TextField
        label="Dias úteis"
        type="number"
        value={businessDays}
        onChange={(e) => handleBusinessDaysChange(e.target.value)}
        onBlur={handleBusinessDaysBlur}
        disabled={disabled || !startDate}
        size={size}
        fullWidth={vertical}
        slotProps={{ htmlInput: { min: 1, step: 1 } }}
        sx={vertical ? undefined : { minWidth: 110, maxWidth: 140 }}
      />
    </Tooltip>
  );

  if (vertical) {
    return (
      <Stack spacing={1.5}>
        {startPicker}
        {endPicker}
        {daysField}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {startPicker}
        {endPicker}
      </Stack>
      {daysField}
    </Stack>
  );
}

export default DateRangeWithBusinessDays;
