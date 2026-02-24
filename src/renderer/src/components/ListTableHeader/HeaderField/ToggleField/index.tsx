import { Stack } from '@mui/material';
import { ToggleButton } from './ToggleButton';

type ToggleItem = {
  id: number | string;
  name: string;
};

type Props = {
  items: ToggleItem[];
  value: ToggleItem[];
  onChange: (value: ToggleItem[]) => void;
};

export function ToggleField({ items, value, onChange }: Readonly<Props>) {
  const isActive = (item: ToggleItem) => {
    return value.some((val) => val.id === item.id);
  };

  const handleOnChange = (item: ToggleItem) => {
    if (isActive(item)) {
      const newList = value.filter((val) => val.id !== item.id);

      return () => onChange(newList);
    }

    return () => onChange([...value, item]);
  };

  return (
    <Stack direction="row">
      {items.map((item) => (
        <ToggleButton
          key={item.id}
          active={isActive(item)}
          onClick={handleOnChange(item)}
        >
          {item.name}
        </ToggleButton>
      ))}
    </Stack>
  );
}
