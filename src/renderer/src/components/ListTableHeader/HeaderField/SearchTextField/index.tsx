import { styledTheme } from '@renderer/styles/styledTheme';
import {
  InputAdornment,
  Stack,
  TextField,
  type TextFieldProps,
  useMediaQuery,
} from '@mui/material';
import { type RefCallback } from 'react';
import { SearchIcon } from './styles';

type Props = Omit<TextFieldProps, 'onChange'> & {
  onChange: (text: string) => void;
  value: string;
  label: string;
  iconPosition?: 'left' | 'right';
  inputRef?: RefCallback<HTMLInputElement>;
};

export function SearchTextField({
  onChange,
  value,
  label,
  iconPosition = 'left',
  inputRef,
  ...rest
}: Readonly<Props>) {
  const isMobile = useMediaQuery(styledTheme.SIZES.xs);

  const currentLabel = isMobile ? 'Buscar' : label;

  return (
    <Stack direction="row">
      <TextField
        {...rest}
        fullWidth
        variant="outlined"
        inputRef={inputRef}
        placeholder={currentLabel}
        value={value}
        onKeyDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(event.target.value)}
        slotProps={{
          input:
            iconPosition === 'left'
              ? {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }
              : {
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
        }}
      />
    </Stack>
  );
}
