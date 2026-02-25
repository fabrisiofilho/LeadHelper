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
  onItemClick?: (item: GanttItem) => void;
  cellWidth?: number;
}

interface GanttRow {
  id: string;
  label: string;
  items: GanttItem[];
  /** Number of sub-lanes needed to avoid overlapping bars */
  laneCount: number;
  /** Lane index assigned to each item (by item id) */
  laneMap: Map<string, number>;
}

const BAR_HEIGHT = 28;
const BAR_GAP = 4;
const ROW_PADDING = 8;

/**
 * Compute the pixel height for a row based on how many lanes it needs.
 */
function rowHeight(laneCount: number): number {
  return ROW_PADDING * 2 + laneCount * BAR_HEIGHT + (laneCount - 1) * BAR_GAP;
}

const formatDate = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const formatHeaderDate = (date: Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

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

const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

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
  return { left: startDiff * cellWidth, width: duration * cellWidth };
};

/**
 * Check if two items overlap in time.
 */
function itemsOverlap(a: GanttItem, b: GanttItem): boolean {
  const aStart = new Date(a.start).setHours(0, 0, 0, 0);
  const aEnd = new Date(a.end).setHours(0, 0, 0, 0);
  const bStart = new Date(b.start).setHours(0, 0, 0, 0);
  const bEnd = new Date(b.end).setHours(0, 0, 0, 0);
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Assign each item in a row to a lane (sub-line) so that overlapping items
 * are placed on different lanes. Uses a greedy approach.
 */
function assignLanes(items: GanttItem[]): {
  laneCount: number;
  laneMap: Map<string, number>;
} {
  const laneMap = new Map<string, number>();
  if (items.length === 0) return { laneCount: 1, laneMap };

  // Sort by start date, then by end date
  const sorted = [...items].sort((a, b) => {
    const diff = new Date(a.start).getTime() - new Date(b.start).getTime();
    if (diff !== 0) return diff;
    return new Date(a.end).getTime() - new Date(b.end).getTime();
  });

  // lanes[i] = the last item placed in lane i
  const lanes: GanttItem[] = [];

  for (const item of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (!itemsOverlap(lanes[i], item)) {
        lanes[i] = item;
        laneMap.set(item.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneMap.set(item.id, lanes.length);
      lanes.push(item);
    }
  }

  return { laneCount: Math.max(lanes.length, 1), laneMap };
}

/**
 * Group items by team member, always. Each member gets a row with sub-lanes.
 */
function groupByMember(items: GanttItem[]): GanttRow[] {
  const groups = new Map<string, { label: string; items: GanttItem[] }>();

  for (const item of items) {
    const key = `member-${item.teamMemberId}`;
    const label = item.teamMemberName || `Membro ${item.teamMemberId}`;
    if (!groups.has(key)) {
      groups.set(key, { label, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  const rows: GanttRow[] = [];
  for (const [id, group] of groups) {
    const { laneCount, laneMap } = assignLanes(group.items);
    rows.push({
      id,
      label: group.label,
      items: group.items,
      laneCount,
      laneMap,
    });
  }

  // Sort rows alphabetically by label
  rows.sort((a, b) => a.label.localeCompare(b.label));
  return rows;
}

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
  onItemClick,
  cellWidth = 40,
}: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const { dates, rows } = useMemo(() => {
    if (!data || !data.items.length) {
      return { dates: [], rows: [] };
    }
    const dateRange = getDateRange(data.startDate, data.endDate);
    const groupedRows = groupByMember(data.items);
    return { dates: dateRange, rows: groupedRows };
  }, [data]);

  // Scroll to today on mount
  useEffect(() => {
    if (timelineRef.current && dates.length > 0) {
      const todayIndex = findTodayIndex(dates);
      if (todayIndex >= 0) {
        const scrollPosition = todayIndex * cellWidth - 100;
        timelineRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [dates, cellWidth]);

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
    if (onItemClick) onItemClick(item);
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
        {/* Row Labels */}
        <RowLabelsContainer>
          <RowLabelHeader>Membro</RowLabelHeader>
          {rows.map((row) => (
            <RowLabel
              key={row.id}
              title={row.label}
              style={{ height: rowHeight(row.laneCount) }}
            >
              {row.label}
            </RowLabel>
          ))}
        </RowLabelsContainer>

        {/* Timeline */}
        <TimelineContainer ref={timelineRef}>
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

          {rows.map((row) => (
            <TimelineRow
              key={row.id}
              style={{ height: rowHeight(row.laneCount) }}
            >
              {/* Grid cells */}
              {dates.map((date, index) => (
                <TimelineGridCell
                  key={index}
                  $width={cellWidth}
                  $isWeekend={isWeekend(date)}
                  $isToday={isToday(date)}
                />
              ))}

              {/* Bars positioned in their assigned lanes */}
              {row.items.map((item) => {
                const { left, width } = calculateBarPosition(
                  item.start,
                  item.end,
                  data.startDate,
                  cellWidth,
                );
                const lane = row.laneMap.get(item.id) ?? 0;
                const top = ROW_PADDING + lane * (BAR_HEIGHT + BAR_GAP);

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
                      style={{ top, height: BAR_HEIGHT }}
                      onClick={() => handleBarClick(item)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.taskTitle || item.name}, ${item.teamMemberName || ''}, de ${formatDate(item.start)} até ${formatDate(item.end)}`}
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
