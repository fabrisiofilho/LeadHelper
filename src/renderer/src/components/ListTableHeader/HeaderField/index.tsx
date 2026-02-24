import { SelectCheckboxFilterField } from '@renderer/components/ListTableHeader/HeaderField/SelectCheckboxFilterField';
import { useResponsiveCurrentSize } from '@renderer/hooks/responsiveCurrentSize';
import { useResponsiveSize } from '@renderer/hooks/responsiveSize';
import type { IListTableFilters } from '@renderer/types/page/listTableFilters';
import type {
  IListTableFilterItem,
  IListTableHeaderField,
} from '@renderer/types/page/listTableHeaderFilters';
import { Button, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { DatePickerField } from './DatePickerField';
import { SelectField } from './SelectField';
import { TabsField } from './TabsField';
import { ToggleField } from './ToggleField';
import { formatDateToShow } from '@renderer/utils/date';

type Props<T> = {
  isLastItem: boolean;
  headerField: IListTableHeaderField<T>;
  filters: IListTableFilters<T>;
  handleChangeFilters: (key: string, items: IListTableFilterItem[]) => void;
};

export function HeaderField<T>({
  isLastItem,
  filters,
  headerField,
  handleChangeFilters,
}: Readonly<Props<T>>) {
  const [openTooltip, setOpenTooltip] = useState(false);

  const responsiveSize = useResponsiveSize(
    'small',
    headerField.size ?? 'medium',
  );

  const muiSize = responsiveSize === 'large' ? 'medium' : responsiveSize;

  const isMobile = useResponsiveCurrentSize() === 'xs';

  const { id, variant } = headerField;

  if (id === 'search') return <></>;

  const currentWidth = isMobile ? 'auto' : headerField.width;

  const value = filters[id];

  const renderField = () => {
    switch (variant) {
      case 'date':
        return (
          <DatePickerField
            label={headerField.label}
            value={value?.[0].name ? value[0].name : null}
            handleChange={(value) => {
              handleChangeFilters(String(id), [
                {
                  id: String(id),
                  name: value ? value.toString() : '',
                },
              ]);
            }}
            maxDate={headerField.maxDate}
            minDate={headerField.minDate}
          />
        );

      case 'button':
        return (
          <Button
            variant="outlined"
            size="large"
            disabled={headerField.disabled}
            onClick={headerField.onClick}
          >
            <Typography variant="body2" fontWeight={600} noWrap>
              {headerField.label}
            </Typography>
          </Button>
        );

      case 'tab':
        return (
          <TabsField
            items={headerField.items}
            value={value?.[0]?.id ?? headerField.items[0]?.id ?? ''}
            onChange={(newValue) => {
              handleChangeFilters(String(id), [newValue]);
            }}
          />
        );

      case 'toggle':
        return (
          <ToggleField
            items={headerField.items}
            value={value ?? []}
            onChange={(newValue) => {
              handleChangeFilters(String(id), newValue);
            }}
          />
        );

      case 'select':
        return (
          <SelectField
            defaultValueName={headerField.defaultValueName}
            label={headerField.label}
            items={headerField.items}
            size={muiSize}
            value={value ?? []}
            disabled={headerField.disabled}
            onChange={(item) => {
              if (item) {
                handleChangeFilters(String(id), [item]);
                return;
              }

              handleChangeFilters(String(id), []);
            }}
          />
        );

      case 'selectCheckbox':
        return (
          <SelectCheckboxFilterField
            label={headerField.label}
            items={headerField.items}
            size={muiSize}
            value={value ?? []}
            onChange={(items) => handleChangeFilters(String(id), items)}
          />
        );
    }
  };

  const formatTooltipValue = (value: string) => {
    const isDate = new Date(value)?.getDate?.();
    if (isDate) return formatDateToShow(value);

    return value;
  };

  const handleGetTooltipTitle = () => {
    if (['button', 'tab', 'toggle'].includes(variant)) return '';

    if (!value) {
      return 'Todos';
    }

    return value.map((item) => formatTooltipValue(item.name)).join(', ');
  };

  return (
    <Tooltip
      open={openTooltip}
      arrow
      onClick={() => setOpenTooltip(false)}
      disableFocusListener
      placement="top"
      title={handleGetTooltipTitle()}
      onMouseEnter={() => setOpenTooltip(true)}
      onMouseLeave={() => setOpenTooltip(false)}
    >
      <Stack
        flex={headerField.flex}
        width={headerField.width}
        maxWidth={currentWidth ?? { xs: '100%', sm: '10rem', md: '12rem' }}
        minWidth={{ xs: 'auto', sm: '8rem' }}
        justifyContent="center"
      >
        {renderField()}
      </Stack>
    </Tooltip>
  );
}
