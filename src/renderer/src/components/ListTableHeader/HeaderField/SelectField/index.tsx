import type { BaseTextFieldProps } from '@mui/material';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select, { type SelectChangeEvent } from '@mui/material/Select';

export type SelectItem = {
  id: number | string;
  name: string;
};

type SelectProps = {
  label: string;
  items: SelectItem[];
  value: SelectItem[];
  defaultValueName?: string;
  onChange: (selectedItem: SelectItem | null) => void;
  size?: BaseTextFieldProps['size'];
  disabled?: boolean;
};

const itemToValue = (item: SelectItem) => JSON.stringify(item);

const valueToItem = (value: string) => JSON.parse(value);

export function SelectField({
  onChange,
  value,
  label,
  items,
  defaultValueName,
  size,
  disabled = false,
}: Readonly<SelectProps>) {
  const defaultItem = {
    id: '',
    name: defaultValueName ?? 'Todos',
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;

    if (value) {
      const item = valueToItem(value);

      if (item?.id === '') {
        onChange(null);
        return;
      }

      onChange(valueToItem(value));
    }
  };

  return (
    <FormControl fullWidth>
      <InputLabel id={`${label}-select-label`}>{label}</InputLabel>
      <Select
        label={label}
        input={<OutlinedInput label={label} />}
        size={size}
        onChange={handleChange}
        value={itemToValue(value?.length ? value[0] : defaultItem)}
        defaultValue={itemToValue(defaultItem)}
        disabled={disabled}
      >
        {[defaultItem, ...items].map((item) => (
          <MenuItem key={item.id} value={itemToValue(item)}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
