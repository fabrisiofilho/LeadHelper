import { forwardRef, useCallback, useState, useEffect } from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { formatCurrency, formatCurrencyInput } from '@renderer/utils/currency';

type CurrencyInputProps = Omit<TextFieldProps, 'onChange' | 'value'> & {
  value: number | string | undefined;
  onChange: (value: number) => void;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('R$ 0,00');

    // Sincroniza valor externo com display
    useEffect(() => {
      const numericValue =
        typeof value === 'string' ? parseFloat(value) : (value ?? 0);
      if (!isNaN(numericValue)) {
        setDisplayValue(formatCurrency(numericValue));
      }
    }, [value]);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        const { formatted, numeric } = formatCurrencyInput(inputValue);

        setDisplayValue(formatted);
        onChange(numeric);
      },
      [onChange],
    );

    const handleFocus = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        setTimeout(() => event.target.select(), 0);
      },
      [],
    );

    return (
      <TextField
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        slotProps={{
          ...props.slotProps,
          input: {
            ...props.slotProps?.input,
            inputProps: {
              inputMode: 'numeric',
            },
          },
        }}
      />
    );
  },
);

CurrencyInput.displayName = 'CurrencyInput';
