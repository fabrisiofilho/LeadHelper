import { Typography, Box } from '@mui/material';
import { useTheme as useStyledTheme } from 'styled-components';
import type { IncomeVsExpense } from '@shared/interfaces/types/report.types';
import {
  ChartContainer,
  BarChartContainer,
  LegendContainer,
  LegendItem,
  LegendColorBox,
  EmptyChartState,
  PeriodHeader,
  ComparisonBarsContainer,
  ComparisonRow,
  ComparisonLabel,
  ComparisonBarWrapper,
  ComparisonValue,
} from './styles';
const MONTH_NAMES = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];
const MONTH_NAMES_FULL = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
export interface IncomeExpenseChartProps {
  data: IncomeVsExpense[];
  maxHeight?: number;
  emptyMessage?: string;
  formatCurrency?: (value: number) => string;
  showLegend?: boolean;
  showBalance?: boolean;
  useFullMonthNames?: boolean;
  incomeColor?: string;
  expenseColor?: string;
  incomeLabel?: string;
  expenseLabel?: string;
}
const defaultFormatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
export function IncomeExpenseChart({
  data,
  maxHeight = 350,
  emptyMessage = 'Nenhum dado disponível',
  formatCurrency = defaultFormatCurrency,
  showLegend = true,
  showBalance = true,
  useFullMonthNames = false,
  incomeColor,
  expenseColor,
  incomeLabel = 'Receitas',
  expenseLabel = 'Despesas',
}: IncomeExpenseChartProps) {
  const theme = useStyledTheme();
  const finalIncomeColor = incomeColor || theme.COLORS.success;
  const finalExpenseColor = expenseColor || theme.COLORS.error;
  if (!data || data.length === 0) {
    return (
      <EmptyChartState>
        <Typography variant="body2" color="text.secondary">
          {emptyMessage}
        </Typography>
      </EmptyChartState>
    );
  }
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1,
  );
  const getMonthName = (month: number): string => {
    const monthIndex = month - 1;
    return useFullMonthNames
      ? MONTH_NAMES_FULL[monthIndex]
      : MONTH_NAMES[monthIndex];
  };
  return (
    <Box>
      <ChartContainer $maxHeight={maxHeight}>
        {data.map((item) => {
          const monthName = getMonthName(item.month);
          const incomePercentage = (item.income / maxValue) * 100;
          const expensePercentage = (item.expense / maxValue) * 100;
          return (
            <BarChartContainer key={`${item.year}-${item.month}`}>
              <PeriodHeader>
                <Typography variant="caption" fontWeight={600}>
                  {monthName}/{item.year}
                </Typography>
                {showBalance && (
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    sx={{
                      color: item.balance >= 0 ? 'success.main' : 'error.main',
                    }}
                  >
                    {item.balance >= 0 ? '+' : ''}
                    {formatCurrency(item.balance)}
                  </Typography>
                )}
              </PeriodHeader>
              <ComparisonBarsContainer>
                <ComparisonRow>
                  <ComparisonLabel>
                    <Typography variant="caption" color="text.secondary">
                      {incomeLabel}
                    </Typography>
                  </ComparisonLabel>
                  <ComparisonBarWrapper>
                    <Box
                      sx={{
                        width: `${incomePercentage}%`,
                        height: '100%',
                        backgroundColor: finalIncomeColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </ComparisonBarWrapper>
                  <ComparisonValue>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(item.income)}
                    </Typography>
                  </ComparisonValue>
                </ComparisonRow>
                <ComparisonRow>
                  <ComparisonLabel>
                    <Typography variant="caption" color="text.secondary">
                      {expenseLabel}
                    </Typography>
                  </ComparisonLabel>
                  <ComparisonBarWrapper>
                    <Box
                      sx={{
                        width: `${expensePercentage}%`,
                        height: '100%',
                        backgroundColor: finalExpenseColor,
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </ComparisonBarWrapper>
                  <ComparisonValue>
                    <Typography variant="caption" color="text.secondary">
                      {formatCurrency(item.expense)}
                    </Typography>
                  </ComparisonValue>
                </ComparisonRow>
              </ComparisonBarsContainer>
            </BarChartContainer>
          );
        })}
      </ChartContainer>
      {showLegend && (
        <LegendContainer>
          <LegendItem>
            <LegendColorBox $color={finalIncomeColor} />
            <Typography variant="caption" color="text.secondary">
              {incomeLabel}
            </Typography>
          </LegendItem>
          <LegendItem>
            <LegendColorBox $color={finalExpenseColor} />
            <Typography variant="caption" color="text.secondary">
              {expenseLabel}
            </Typography>
          </LegendItem>
        </LegendContainer>
      )}
    </Box>
  );
}
