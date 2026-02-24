import { Typography, Tooltip } from '@mui/material';
import { useTheme as useStyledTheme } from 'styled-components';
import type { CategoryExpense } from '@shared/interfaces/types/transaction.types';
import {
  ChartContainer,
  CategoryItem,
  CategoryBar,
  CategoryInfo,
  CategoryColorIndicator,
  CategoryItemWithColor,
  EmptyChartState,
} from './styles';
export interface CategoryChartProps {
  data: CategoryExpense[];
  maxHeight?: number;
  emptyMessage?: string;
  formatCurrency?: (value: number) => string;
  onCategoryClick?: (category: CategoryExpense) => void;
  showColorIndicator?: boolean;
  showTooltip?: boolean;
}
const defaultFormatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
export function CategoryChart({
  data,
  maxHeight = 300,
  emptyMessage = 'Nenhuma despesa registrada',
  formatCurrency = defaultFormatCurrency,
  onCategoryClick,
  showColorIndicator = true,
  showTooltip = true,
}: CategoryChartProps) {
  const theme = useStyledTheme();
  const CATEGORY_COLORS = [
    theme.COLORS.primary,
    theme.COLORS.secondary,
    theme.COLORS.success,
    theme.COLORS.warn,
    theme.COLORS.error,
    theme.COLORS.info,
    theme.COLORS.primary_300,
    theme.COLORS.secondary_300,
    theme.COLORS.success_300,
    theme.COLORS.warn_300,
  ];
  const getCategoryColor = (index: number): string => {
    return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
  };
  if (!data || data.length === 0) {
    return (
      <EmptyChartState>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </EmptyChartState>
    );
  }
  const sortedData = [...data].sort((a, b) => b.totalAmount - a.totalAmount);
  return (
    <ChartContainer $maxHeight={maxHeight}>
      {sortedData.map((category, index) => {
        const color = getCategoryColor(index);
        const content = (
          <CategoryItem
            key={category.categoryId}
            onClick={() => onCategoryClick?.(category)}
            sx={{
              cursor: onCategoryClick ? 'pointer' : 'default',
              '&:hover': onCategoryClick
                ? {
                    backgroundColor: theme.COLORS.surfaceAlt,
                    borderRadius: '0.5rem',
                    padding: '0.5rem',
                    margin: '-0.5rem',
                    marginBottom: '0.5rem',
                  }
                : {},
            }}
          >
            <CategoryInfo>
              <CategoryItemWithColor>
                {showColorIndicator && (
                  <CategoryColorIndicator $color={color} />
                )}
                <Typography
                  variant="body2"
                  fontWeight={500}
                  noWrap
                  sx={{ flex: 1, minWidth: 0 }}
                >
                  {category.categoryName}
                </Typography>
              </CategoryItemWithColor>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {formatCurrency(category.totalAmount)} (
                {category.percentage.toFixed(1)}%)
              </Typography>
            </CategoryInfo>
            <CategoryBar $percentage={category.percentage} $color={color} />
          </CategoryItem>
        );
        if (showTooltip) {
          return (
            <Tooltip
              key={category.categoryId}
              title={`${category.categoryName}: ${formatCurrency(category.totalAmount)} (${category.percentage.toFixed(1)}% do total)`}
              placement="top"
              arrow
            >
              {content}
            </Tooltip>
          );
        }
        return content;
      })}
    </ChartContainer>
  );
}
