import { describe, it, expect, vi } from 'vitest';

// Mock the logger before any imports
vi.mock('@main/infrastructure/log/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the repository modules to avoid TypeORM initialization
vi.mock('../../repositories/team-member-repository', () => ({
  TeamMemberRepository: vi.fn(),
}));
vi.mock('../../repositories/task-repository', () => ({
  TaskRepository: vi.fn(),
}));
vi.mock('../../repositories/sprint-repository', () => ({
  SprintRepository: vi.fn(),
}));
vi.mock('../../repositories/team-repository', () => ({
  TeamRepository: vi.fn(),
}));
vi.mock('../../repositories/team-member-allocation-repository', () => ({
  TeamMemberAllocationRepository: vi.fn(),
}));
vi.mock('../../repositories/task-local-priority-repository', () => ({
  TaskLocalPriorityRepository: vi.fn(),
}));
vi.mock('../team-member-allocation-service', () => ({
  TeamMemberAllocationService: vi.fn(),
}));
vi.mock('../../repositories/task-update-repository', () => ({
  TaskUpdateRepository: vi.fn(),
}));
vi.mock('@main/infrastructure/utils/business-hours', () => ({
  calculateBusinessHours: vi.fn().mockReturnValue(0),
}));

import { findCurrentSprint } from '../dashboard-service';

/**
 * Unit tests for findCurrentSprint — the pure function used by
 * DashboardService.getCurrentSprintForTeam.
 *
 * Validates: Requirements 3.2
 * Property 7: For any set of sprints and any reference date, the current sprint
 * is the one whose startDate <= referenceDate and endDate >= referenceDate.
 * If multiple sprints satisfy the condition for the same team, the most recent
 * (by startDate) should be selected. If none satisfies, the result should be null.
 */

interface SprintLike {
  id: number;
  startDate: Date;
  endDate: Date;
  teamId?: number;
}

function makeSprint(
  id: number,
  start: string,
  end: string,
  teamId?: number,
): SprintLike {
  return {
    id,
    startDate: new Date(start),
    endDate: new Date(end),
    teamId,
  };
}

describe('findCurrentSprint', () => {
  it('returns null when sprints array is empty', () => {
    const result = findCurrentSprint([], new Date('2024-06-15'));
    expect(result).toBeNull();
  });

  it('returns the sprint that contains the reference date', () => {
    const sprints = [
      makeSprint(1, '2024-06-01', '2024-06-14', 10),
      makeSprint(2, '2024-06-15', '2024-06-28', 10),
      makeSprint(3, '2024-06-29', '2024-07-12', 10),
    ];

    const result = findCurrentSprint(sprints, new Date('2024-06-20'), 10);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('returns null when no sprint contains the reference date', () => {
    const sprints = [
      makeSprint(1, '2024-06-01', '2024-06-14', 10),
      makeSprint(2, '2024-06-29', '2024-07-12', 10),
    ];

    const result = findCurrentSprint(sprints, new Date('2024-06-20'), 10);
    expect(result).toBeNull();
  });

  it('returns the sprint when reference date equals startDate (boundary)', () => {
    const sprints = [makeSprint(1, '2024-06-15', '2024-06-28', 10)];

    const result = findCurrentSprint(sprints, new Date('2024-06-15'), 10);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });

  it('returns the sprint when reference date equals endDate (boundary)', () => {
    const sprints = [makeSprint(1, '2024-06-15', '2024-06-28', 10)];

    const result = findCurrentSprint(sprints, new Date('2024-06-28'), 10);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });

  it('selects the most recent sprint by startDate when multiple match', () => {
    const sprints = [
      makeSprint(1, '2024-06-01', '2024-06-30', 10),
      makeSprint(2, '2024-06-15', '2024-07-15', 10),
    ];

    const result = findCurrentSprint(sprints, new Date('2024-06-20'), 10);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('filters by teamId when provided', () => {
    const sprints = [
      makeSprint(1, '2024-06-01', '2024-06-30', 10),
      makeSprint(2, '2024-06-01', '2024-06-30', 20),
    ];

    const result = findCurrentSprint(sprints, new Date('2024-06-15'), 20);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('returns null when no sprint matches the given teamId', () => {
    const sprints = [makeSprint(1, '2024-06-01', '2024-06-30', 10)];

    const result = findCurrentSprint(sprints, new Date('2024-06-15'), 99);
    expect(result).toBeNull();
  });

  it('ignores teamId filter when teamId is undefined', () => {
    const sprints = [
      makeSprint(1, '2024-06-01', '2024-06-30', 10),
      makeSprint(2, '2024-06-15', '2024-06-30', 20),
    ];

    const result = findCurrentSprint(sprints, new Date('2024-06-20'));
    expect(result).not.toBeNull();
    expect(result!.id).toBe(2);
  });

  it('handles sprints with undefined teamId — filtered by teamId', () => {
    const sprints = [makeSprint(1, '2024-06-01', '2024-06-30', undefined)];

    const result = findCurrentSprint(sprints, new Date('2024-06-15'), 10);
    expect(result).toBeNull();
  });

  it('handles sprints with undefined teamId — no teamId filter', () => {
    const sprints = [makeSprint(1, '2024-06-01', '2024-06-30', undefined)];

    const result = findCurrentSprint(sprints, new Date('2024-06-15'));
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });
});
