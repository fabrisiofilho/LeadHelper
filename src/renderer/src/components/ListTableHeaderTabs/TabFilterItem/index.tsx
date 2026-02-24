import { Badge, Box, Typography } from '@mui/material';
import { Loading } from '../../Loading';
import { Container, CustomTitle } from './styles';
import { IListTableTabConfig } from '@renderer/types/page/listTableHeaderTabs';
import { Show } from '@renderer/components/Show';

type Props = {
  active: boolean;
  tabConfig: IListTableTabConfig;
  onClick: () => void;
};

export function TabFilterItem({ active, tabConfig, onClick }: Readonly<Props>) {
  const {
    title,
    countConfig,
    borderColor,
    hasBadge,
    badgeColor = 'error',
  } = tabConfig;

  const renderNumber = () => {
    if (!countConfig) return;

    const { loading, bgcolor, color, number } = countConfig;

    if (loading)
      return (
        <Box
          mr="0.5rem"
          px="0.5rem"
          py="0.125rem"
          borderRadius="0.375rem"
          bgcolor={bgcolor}
        >
          <Loading loadingColor={color} size="0.6rem" />
        </Box>
      );

    return (
      <Box
        mr="0.5rem"
        px="0.5rem"
        py="0.125rem"
        borderRadius="0.375rem"
        bgcolor={bgcolor}
      >
        <Typography variant="subtitle2" fontSize="0.75rem" color={color}>
          {number}
        </Typography>
      </Box>
    );
  };

  return (
    <Container active={active} borderColor={borderColor} onClick={onClick}>
      {renderNumber()}

      <Show>
        <Show.When isTrue={!!hasBadge}>
          <Badge color={badgeColor} variant="dot">
            <CustomTitle active={active} variant="subtitle2" color="grey.600">
              {title}
            </CustomTitle>
          </Badge>
        </Show.When>

        <Show.Else>
          <CustomTitle active={active} variant="subtitle2" color="grey.600">
            {title}
          </CustomTitle>
        </Show.Else>
      </Show>
    </Container>
  );
}
