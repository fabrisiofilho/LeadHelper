import { Stack } from '@mui/material';
import { TabFilterItem } from './TabFilterItem';
import { IListTableTabConfig } from '@renderer/types/page/listTableHeaderTabs';

type ListTableHeaderProps = {
  tabsConfig: IListTableTabConfig[];
  currentTab: string;
  onChange: (id: string) => void;
};

export function ListTableHeaderTabs({
  tabsConfig,
  currentTab,
  onChange,
}: Readonly<ListTableHeaderProps>) {
  if (!tabsConfig) return null;

  return (
    <Stack direction="row" bgcolor="grey.100" px="1.5rem" overflow="auto">
      {tabsConfig.map((tabConfig) => (
        <TabFilterItem
          key={tabConfig.id}
          active={tabConfig.id === currentTab}
          tabConfig={tabConfig}
          onClick={() => onChange(tabConfig.id)}
        />
      ))}
    </Stack>
  );
}
