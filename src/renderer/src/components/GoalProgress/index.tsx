import {
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import type {
  Goal,
  GoalProgress as GoalProgressType,
} from '@shared/interfaces/types/goal.types';
import {
  GoalProgressContainer,
  GoalHeader,
  GoalName,
  PercentageBadge,
  StyledProgressBar,
  ValuesContainer,
  ValueItem,
  ValueLabel,
  ValueAmount,
  RemainingContainer,
  RemainingText,
  RemainingValue,
  CompletedBadge,
  DeadlineInfo,
} from './styles';
import { formatCurrency } from '@renderer/utils/currency';
import { parseDateSafe } from '@renderer/utils/date';

const calculateRemainingDays = (
  deadline: Date | string | undefined,
): number | null => {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = parseDateSafe(deadline);
  if (!deadlineDate) return null;
  deadlineDate.setHours(0, 0, 0, 0);
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
export interface GoalProgressProps {
  goal: Goal | GoalProgressType;
  variant?: 'full' | 'compact';
  showName?: boolean;
  showRemaining?: boolean;
  showDeadline?: boolean;
  showCompletedBadge?: boolean;
  name?: string;
  deadline?: Date | string;
}
function isGoal(goal: Goal | GoalProgressType): goal is Goal {
  return 'name' in goal && 'progress' in goal;
}
export function GoalProgress({
  goal,
  variant = 'full',
  showName = true,
  showRemaining = true,
  showDeadline = true,
  showCompletedBadge = true,
  name,
  deadline,
}: GoalProgressProps) {
  const targetAmount = goal.targetAmount;
  const currentAmount = goal.currentAmount;
  const percentage = isGoal(goal) ? goal.progress : goal.percentage;
  const remainingAmount = isGoal(goal)
    ? goal.targetAmount - goal.currentAmount
    : goal.remainingAmount;
  const isCompleted = isGoal(goal) ? goal.progress >= 100 : goal.isCompleted;
  const goalName = isGoal(goal) ? goal.name : name;
  const goalDeadline = isGoal(goal) ? goal.deadline : deadline;
  const remainingDays = calculateRemainingDays(goalDeadline);
  const isExpired = remainingDays !== null && remainingDays < 0;
  const isUrgent =
    remainingDays !== null && remainingDays <= 30 && remainingDays >= 0;
  const isCompact = variant === 'compact';
  const renderRemainingDaysText = (): string => {
    if (remainingDays === null) return '';
    if (isExpired) return `Prazo expirado há ${Math.abs(remainingDays)} dias`;
    if (remainingDays === 0) return 'Último dia!';
    if (remainingDays === 1) return '1 dia restante';
    return `${remainingDays} dias restantes`;
  };
  return (
    <GoalProgressContainer $compact={isCompact}>
      {}
      {showName && goalName && (
        <GoalHeader>
          <GoalName $compact={isCompact}>
            {isCompleted ? (
              <TrophyIcon sx={{ fontSize: isCompact ? 14 : 16, mr: 0.5 }} />
            ) : (
              <FlagIcon sx={{ fontSize: isCompact ? 14 : 16, mr: 0.5 }} />
            )}
            {goalName}
          </GoalName>
          <PercentageBadge $percentage={percentage}>
            {percentage.toFixed(0)}%
          </PercentageBadge>
        </GoalHeader>
      )}
      {}
      <StyledProgressBar
        variant="determinate"
        value={Math.min(percentage, 100)}
        $percentage={percentage}
      />
      {}
      <ValuesContainer>
        <ValueItem $align="left">
          <ValueLabel $compact={isCompact}>Valor Atual</ValueLabel>
          <ValueAmount $variant="current" $compact={isCompact}>
            {formatCurrency(currentAmount)}
          </ValueAmount>
        </ValueItem>
        <ValueItem $align="right">
          <ValueLabel $compact={isCompact}>Valor Alvo</ValueLabel>
          <ValueAmount $variant="target" $compact={isCompact}>
            {formatCurrency(targetAmount)}
          </ValueAmount>
        </ValueItem>
      </ValuesContainer>
      {}
      {showRemaining && !isCompleted && remainingAmount > 0 && (
        <RemainingContainer $compact={isCompact}>
          <RemainingText $compact={isCompact}>Falta</RemainingText>
          <RemainingValue $compact={isCompact}>
            {formatCurrency(remainingAmount)}
          </RemainingValue>
          <RemainingText $compact={isCompact}>
            para atingir a meta
          </RemainingText>
        </RemainingContainer>
      )}
      {}
      {showDeadline && remainingDays !== null && !isCompleted && (
        <DeadlineInfo $urgent={isUrgent || isExpired} $compact={isCompact}>
          <ScheduleIcon />
          {renderRemainingDaysText()}
        </DeadlineInfo>
      )}
      {}
      {showCompletedBadge && isCompleted && (
        <CompletedBadge $compact={isCompact}>
          <CheckCircleIcon />
          Meta Atingida!
        </CompletedBadge>
      )}
    </GoalProgressContainer>
  );
}
export default GoalProgress;
