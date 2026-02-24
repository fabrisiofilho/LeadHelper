import { Stack } from '@mui/material';
import { Tab } from './Tab';

type TabItem = {
  id: number | string;
  name: string;
};

type Props = {
  items: TabItem[];
  value: string | number;
  onChange: (value: TabItem) => void;
};

export function TabsField({ items, value, onChange }: Readonly<Props>) {
  const handleOnChange = (item: TabItem) => {
    return () => onChange(item);
  };

  return (
    <Stack direction="row">
      {items.map((item) => (
        <Tab
          key={item.id}
          active={item.id === value}
          onClick={handleOnChange(item)}
        >
          {item.name}
        </Tab>
      ))}
    </Stack>
  );
}
