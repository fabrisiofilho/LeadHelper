import {
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { type ChangeEvent, type Ref, forwardRef } from 'react';

export const SELECT_MENU_ITEMS_MAX_HEIGHT = 300;

type ValueObject = {
  id: number;
  [key: string]: unknown;
};

type Value = number | string | boolean | ValueObject;

export type SelectInputItem = {
  value: Value;
  label: string;
  [key: string]: unknown;
};

type SelectChangeTarget = {
  target: {
    name: string | undefined;
    value: Value;
  };
};

export type SelectInputProps = TextFieldProps & {
  items: SelectInputItem[];
  loading?: boolean;
  disabled?: boolean;
  objectValue?: boolean;
  customKey?: string;
  onChange?: (event: SelectChangeTarget) => void;
};

export const SelectInput = forwardRef(function SelectInput(
  {
    customKey,
    objectValue,
    items,
    defaultValue,
    required,
    loading,
    name,
    onChange,
    onBlur,
    value,
    ...rest
  }: SelectInputProps,
  ref,
) {
  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (objectValue) {
      const objectData = {
        target: {
          name,
          value: JSON.parse(event.target.value),
        },
      };

      onChange?.(objectData);
      return;
    }

    const data = {
      target: {
        name,
        value: event.target.value,
      },
    };

    onChange?.(data);
  };

  const handleGetValue = (data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      return JSON.stringify(data);
    }

    return data as string | number | boolean | undefined;
  };

  const handleGetItemKeyAndValue = (item: SelectInputItem) => {
    if (customKey) {
      const customValue = item[customKey];
      return {
        key: customValue as string | number,
        value: customValue as string | number,
      };
    }

    if (typeof item.value === 'object') {
      return {
        key: item.value.id,
        value: JSON.stringify(item.value),
      };
    }

    return {
      key: item.value as string | number | boolean,
      value: item.value as string | number,
    };
  };

  const handleRenderLoading = () => {
    if (!loading) return;

    return (
      <Stack alignItems="center" py="1rem">
        <CircularProgress size="1.6rem" />
      </Stack>
    );
  };

  const handleRenderEmptyMessage = () => {
    if (loading || items.length > 0) return null;

    return (
      <MenuItem disabled value="">
        Nenhum item disponível
      </MenuItem>
    );
  };

  return (
    <TextField
      ref={ref as Ref<HTMLDivElement>}
      {...rest}
      select
      value={handleGetValue(value) ?? ''}
      defaultValue={handleGetValue(defaultValue) ?? ''}
      onChange={handleChange}
      onBlur={onBlur}
      slotProps={{
        select: {
          ...rest?.slotProps?.select,
          MenuProps: {
            style: {
              maxHeight: SELECT_MENU_ITEMS_MAX_HEIGHT,
            },
          },
        },
        inputLabel: {
          required,
        },
      }}
    >
      {handleRenderEmptyMessage()}

      {items.map((item: SelectInputItem) => {
        const { key, value } = handleGetItemKeyAndValue(item);

        return (
          <MenuItem key={String(key)} value={value}>
            {item.label}
          </MenuItem>
        );
      })}

      {handleRenderLoading()}
    </TextField>
  );
});
