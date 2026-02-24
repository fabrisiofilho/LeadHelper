import { useMemo, useRef, useEffect } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { EventBusy as EmptyIcon } from '@mui/icons-material';
import type {
  GanttData,
  GanttItem,
} from '@shared/interfaces/config/index.types';
import {
  GanttContainer,
  GanttContent,
  RowLabelsContainer,
  RowLabelHeader,
  RowLabel,
  TimelineContainer,
  TimelineHeader,
  TimelineCell,
  TimelineRow,
  TimelineGridCell,
  GanttBar,
  BarLabel,
  EmptyState,
  TooltipContent,
  TooltipRow,
  TooltipLabel,
  TooltipValue,
} from './styles';

export interface GanttChartProps {
  data: GanttData | null;
  groupBy: 'member' | 'task';
  onItemClick?: (item: GanttItem) => void;
  cellWidth?: number;
}

interface GanttRow {
  id: string;
  label: string;
  items: GanttItem[];
}

/**
 * Format date to display string
 */
const formatDate = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/**
 * Format date for header display
 */
const formatHeaderDate = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

/**
 * Get all dates between start and end (inclusive)
 */
const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Check if a date is a weekend
 */
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Check if a date is today
 */
const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Calculate the position and width of a bar in pixels
 */
const calculateBarPosition = (
  itemStart: Date,
  itemEnd: Date,
  timelineStart: Date,
  cellWidth: number,
): { left: number; width: number } => {
  const start = new Date(itemStart);
  const end = new Date(itemEnd);
  const rangeStart = new Date(timelineStart);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  rangeStart.setHours(0, 0, 0, 0);

  const startDiff = Math.floor(
    (start.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const duration =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    left: startDiff * cellWidth,
    width: duration * cellWidth,
  };
};

/**
 * Group items by member or task
 */
const groupItems = (
  items: GanttItem[],
  groupBy: 'member' | 'task',
): GanttRow[] => {
  const groups = new Map<string, GanttRow>();

  items.forEach((item) => {
    const key =
      groupBy === 'member'
        ? `member-${item.teamMemberId}`
        : `task-${item.taskId}`;

    const label =
      groupBy === 'member'
        ? item.teamMemberName || item.name
        : item.taskTitle || item.name;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label,
        items: [],
      });
    }

    groups.get(key)!.items.push(item);
  });

  return Array.from(groups.values());
};

/**
 * Find today's index in the date range
 */
const findTodayIndex = (dates: Date[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dates.findIndex((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
};

export function GanttChart({
  data,
  groupBy,
  onItemClick,
  cellWidth = 40,
}: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate date range and rows
  const { dates, rows } = useMemo(() => {
    if (!data || !data.items.length) {
      return { dates: [], rows: [] };
    }

    const dateRange = getDateRange(data.startDate, data.endDate);
    const groupedRows = groupItems(data.items, groupBy);

    return {
      dates: dateRange,
      rows: groupedRows,
    };
  }, [data, groupBy]);

  // Scroll to today on mount
  useEffect(() => {
    if (timelineRef.current && dates.length > 0) {
      const todayIndex = findTodayIndex(dates);
      if (todayIndex >= 0) {
        const scrollPosition = todayIndex * cellWidth - 100; // Offset to show some days before
        timelineRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [dates, cellWidth]);

  // Handle empty state
  if (!data || !data.items.length) {
    return (
      <GanttContainer>
        <EmptyState>
          <EmptyIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" color="textSecondary">
            Nenhuma alocação encontrada para o período selecionado
          </Typography>
        </EmptyState>
      </GanttContainer>
    );
  }

  const handleBarClick = (item: GanttItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const renderTooltip = (item: GanttItem) => (
    <TooltipContent>
      <TooltipRow>
        <TooltipLabel>Tarefa:</TooltipLabel>
        <TooltipValue>{item.taskTitle || item.name}</TooltipValue>
      </TooltipRow>
      {item.teamMemberName && (
        <TooltipRow>
          <TooltipLabel>Membro:</TooltipLabel>
          <TooltipValue>{item.teamMemberName}</TooltipValue>
        </TooltipRow>
      )}
      <TooltipRow>
        <TooltipLabel>Início:</TooltipLabel>
        <TooltipValue>{formatDate(item.start)}</TooltipValue>
      </TooltipRow>
      <TooltipRow>
        <TooltipLabel>Fim:</TooltipLabel>
        <TooltipValue>{formatDate(item.end)}</TooltipValue>
      </TooltipRow>
      {item.sprintName && (
        <TooltipRow>
          <TooltipLabel>Sprint:</TooltipLabel>
          <TooltipValue>{item.sprintName}</TooltipValue>
        </TooltipRow>
      )}
    </TooltipContent>
  );

  return (
    <GanttContainer>
      <GanttContent>
        {/* Row Labels Column */}
        <RowLabelsContainer>
          <RowLabelHeader>
            {groupBy === 'member' ? 'Membro' : 'Tarefa'}
          </RowLabelHeader>
          {rows.map((row) => (
            <RowLabel key={row.id} title={row.label}>
              {row.label}
            </RowLabel>
          ))}
        </RowLabelsContainer>

        {/* Timeline Area */}
        <TimelineContainer ref={timelineRef}>
          {/* Timeline Header with Dates */}
          <TimelineHeader>
            {dates.map((date, index) => (
              <TimelineCell
                key={index}
                $width={cellWidth}
                $isToday={isToday(date)}
              >
                {formatHeaderDate(date)}
              </TimelineCell>
            ))}
          </TimelineHeader>

          {/* Timeline Rows with Bars */}
          {rows.map((row) => (
            <TimelineRow key={row.id}>
              {/* Grid cells for each day */}
              {dates.map((date, index) => (
                <TimelineGridCell
                  key={index}
                  $width={cellWidth}
                  $isWeekend={isWeekend(date)}
                  $isToday={isToday(date)}
                />
              ))}

              {/* Gantt bars for this row */}
              {row.items.map((item) => {
                const { left, width } = calculateBarPosition(
                  item.start,
                  item.end,
                  data.startDate,
                  cellWidth,
                );

                return (
                  <Tooltip
                    key={item.id}
                    title={renderTooltip(item)}
                    arrow
                    placement="top"
                  >
                    <GanttBar
                      $color={item.color}
                      $left={left}
                      $width={width}
                      onClick={() => handleBarClick(item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.name}, de ${formatDate(item.start)} até ${formatDate(item.end)}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleBarClick(item);
                        }
                      }}
                    >
                      <BarLabel>{item.taskTitle || item.name}</BarLabel>
                    </GanttBar>
                  </Tooltip>
                );
              })}
            </TimelineRow>
          ))}
        </TimelineContainer>
      </GanttContent>
    </GanttContainer>
  );
}

export default GanttChart;
