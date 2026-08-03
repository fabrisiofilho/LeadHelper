import { useState, useEffect, useRef } from 'react';
import {
  TextField,
  InputAdornment,
  type SxProps,
  type Theme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface DebouncedSearchInputProps {
  /** Placeholder text shown in the input */
  placeholder?: string;
  /** Debounce delay in ms (default: 300) */
  debounce?: number;
  /** Called with the debounced value after the user stops typing */
  onSearch: (value: string) => void;
  /** Initial value (uncontrolled — only used on first render) */
  defaultValue?: string;
  /** MUI TextField size */
  size?: 'small' | 'medium';
  /** Whether the input takes up 100% width */
  fullWidth?: boolean;
  /** MUI sx prop forwarded to the TextField */
  sx?: SxProps<Theme>;
}

/**
 * A search TextField that keeps its own internal value so that every
 * keystroke only re-renders *this* component. The parent is notified
 * via `onSearch` only after the user stops typing for `debounce` ms.
 *
 * This prevents heavy parent components (e.g. grids with many cards)
 * from re-rendering on every keystroke, eliminating the "frozen input"
 * feeling.
 */
export function DebouncedSearchInput({
  placeholder,
  debounce = 300,
  onSearch,
  defaultValue = '',
  size = 'small',
  fullWidth = false,
  sx,
}: DebouncedSearchInputProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchRef.current(value);
    }, debounce);
  };

  // Flush immediately on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter' && timerRef.current) {
      clearTimeout(timerRef.current);
      onSearchRef.current(inputValue);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <TextField
      size={size}
      fullWidth={fullWidth}
      placeholder={placeholder}
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        },
      }}
      sx={sx}
    />
  );
}

export default DebouncedSearchInput;
