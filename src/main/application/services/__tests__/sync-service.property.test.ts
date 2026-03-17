import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveSprintByIterationPath,
  type SprintPathEntry,
} from '@main/infrastructure/utils/iteration-path';

/**
 * Feature: leadhelper-restructure, Property 1: resolução de sprint por iteration path
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * Para qualquer work item com um iterationPath e qualquer conjunto de sprints
 * com iterationPath definido, resolveSprintByIterationPath deve retornar a sprint
 * cujo iterationPath é o prefixo mais longo correspondente ao iterationPath do
 * work item. Se nenhuma sprint corresponder, deve retornar null.
 */

// ============================================================
// Reference implementation
// ============================================================

function normalizeRef(path: string): string {
  return path.replace(/^\\+/, '').trim().toLowerCase();
}

/**
 * Reference implementation — brute-force longest prefix match.
 * Finds the sprint whose normalized iterationPath is the longest prefix
 * of the normalized task iterationPath.
 */
function resolveSprintRef(
  iterationPath: string | undefined,
  sprints: SprintPathEntry[],
): number | null {
  if (!iterationPath) return null;

  const normalizedTask = normalizeRef(iterationPath);

  let bestId: number | null = null;
  let bestLen = -1;

  for (const sprint of sprints) {
    if (!sprint.iterationPath) continue;
    const sp = normalizeRef(sprint.iterationPath);

    const isExact = normalizedTask === sp;
    const isPrefix = normalizedTask.startsWith(sp + '\\');

    if ((isExact || isPrefix) && sp.length > bestLen) {
      bestLen = sp.length;
      bestId = sprint.id;
    }
  }

  return bestId;
}

// ============================================================
// Arbitraries
// ============================================================

/** Generate a path segment (alphanumeric + spaces, no backslashes) */
const segmentArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .map((s) => s.replace(/[\\]/g, 'x').trim())
  .filter((s) => s.length > 0);

/** Generate a backslash-separated iteration path with 1-4 segments */
const iterationPathArb = fc
  .array(segmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join('\\'));

/** Create a SprintPathEntry with given id and iteration path */
function makeSprint(
  id: number,
  iterationPath: string | undefined,
): SprintPathEntry {
  return { id, iterationPath };
}

/** Generate a set of sprints with unique ids and random iteration paths */
const sprintsArb = fc
  .array(iterationPathArb, { minLength: 0, maxLength: 8 })
  .map((paths) => paths.map((path, i) => makeSprint(i + 1, path)));

/**
 * Generate a scenario where the task path is guaranteed to match one sprint.
 * Either exact match or a child path (sprint path + "\\" + extra segments).
 */
const matchingScenarioArb = fc
  .array(iterationPathArb, { minLength: 1, maxLength: 6 })
  .chain((sprintPaths) => {
    const sprints = sprintPaths.map((p, i) => makeSprint(i + 1, p));
    return fc.integer({ min: 0, max: sprintPaths.length - 1 }).chain((idx) => {
      const basePath = sprintPaths[idx];
      return fc
        .array(segmentArb, { minLength: 0, maxLength: 2 })
        .map((extraSegments) => {
          const taskPath =
            extraSegments.length === 0
              ? basePath
              : basePath + '\\' + extraSegments.join('\\');
          return { taskPath, sprints };
        });
    });
  });

/**
 * Generate a scenario where the task path does NOT match any sprint.
 */
const nonMatchingScenarioArb = sprintsArb.chain((sprints) =>
  fc.constant('zzz_unrelated\\path\\no\\match').map((taskPath) => ({
    taskPath,
    sprints,
  })),
);

// ============================================================
// Property 1 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 1: resolução de sprint por iteration path', () => {
  it('returns the same result as the reference implementation for any input', () => {
    fc.assert(
      fc.property(
        fc.option(iterationPathArb, { nil: undefined }),
        sprintsArb,
        (iterationPath, sprints) => {
          const actual = resolveSprintByIterationPath(iterationPath, sprints);
          const expected = resolveSprintRef(iterationPath, sprints);
          expect(actual).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns a matching sprint id when a match exists (exact or hierarchical)', () => {
    fc.assert(
      fc.property(matchingScenarioArb, ({ taskPath, sprints }) => {
        const result = resolveSprintByIterationPath(taskPath, sprints);

        // Must return a sprint id (not null)
        expect(result).not.toBeNull();

        // The returned sprint must be a valid prefix of the task path
        const matched = sprints.find((s) => s.id === result)!;
        const normalizedTask = normalizeRef(taskPath);
        const normalizedSprint = normalizeRef(matched.iterationPath!);
        const isExact = normalizedTask === normalizedSprint;
        const isPrefix = normalizedTask.startsWith(normalizedSprint + '\\');
        expect(isExact || isPrefix).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('always returns the longest matching prefix (most specific sprint)', () => {
    fc.assert(
      fc.property(matchingScenarioArb, ({ taskPath, sprints }) => {
        const result = resolveSprintByIterationPath(taskPath, sprints);
        if (result === null) return;

        const matched = sprints.find((s) => s.id === result)!;
        const matchedPath = normalizeRef(matched.iterationPath!);

        // No other sprint should have a longer matching prefix
        for (const other of sprints) {
          if (!other.iterationPath || other.id === result) continue;
          const otherPath = normalizeRef(other.iterationPath);
          const normalizedTask = normalizeRef(taskPath);
          const otherMatches =
            normalizedTask === otherPath ||
            normalizedTask.startsWith(otherPath + '\\');
          if (otherMatches) {
            expect(matchedPath.length).toBeGreaterThanOrEqual(otherPath.length);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when no sprint matches', () => {
    fc.assert(
      fc.property(nonMatchingScenarioArb, ({ taskPath, sprints }) => {
        const result = resolveSprintByIterationPath(taskPath, sprints);
        const expected = resolveSprintRef(taskPath, sprints);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when iterationPath is undefined', () => {
    fc.assert(
      fc.property(sprintsArb, (sprints) => {
        const result = resolveSprintByIterationPath(undefined, sprints);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('normalization is case-insensitive and trims leading backslashes', () => {
    fc.assert(
      fc.property(iterationPathArb, sprintsArb, (basePath, sprints) => {
        const variations = [
          basePath,
          '\\' + basePath,
          '\\\\' + basePath,
          basePath.toUpperCase(),
          '\\' + basePath.toUpperCase(),
        ];

        const results = variations.map((v) =>
          resolveSprintByIterationPath(v, sprints),
        );

        // All variations should produce the same result
        for (const r of results) {
          expect(r).toBe(results[0]);
        }
      }),
      { numRuns: 100 },
    );
  });
});

import {
  resolveTeamByAreaPath,
  type TeamAreaPathEntry,
} from '@main/infrastructure/utils/area-path';

/**
 * Feature: leadhelper-restructure, Property 2: resolução de time por area path
 *
 * Validates: Requirements 1.6
 *
 * Para qualquer work item com um areaPath e qualquer conjunto de times
 * com azureAreaPath definido, resolveTeamByAreaPath deve retornar o time
 * cujo azureAreaPath é o prefixo mais longo correspondente ao areaPath do
 * work item. Se nenhum time corresponder, deve retornar null.
 */

// ============================================================
// Reference implementation
// ============================================================

function normalizeAreaRef(path: string): string {
  return path.replace(/^\\+/, '').trim().toLowerCase();
}

/**
 * Reference implementation — brute-force longest prefix match for area paths.
 * Supports semicolon-separated paths in team's azureAreaPath.
 */
function resolveTeamRef(
  areaPath: string | undefined,
  teams: TeamAreaPathEntry[],
): number | null {
  if (!areaPath) return null;

  const normalizedTask = normalizeAreaRef(areaPath);

  // Expand semicolon-separated paths
  const entries: { id: number; path: string }[] = [];
  for (const team of teams) {
    if (!team.azureAreaPath) continue;
    const paths = team.azureAreaPath
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of paths) {
      entries.push({ id: team.id, path: p.replace(/^\\+/, '').trim() });
    }
  }

  let bestId: number | null = null;
  let bestLen = -1;

  for (const entry of entries) {
    const entryLower = entry.path.toLowerCase();

    const isExact = normalizedTask === entryLower;
    const isPrefix = normalizedTask.startsWith(entryLower + '\\');

    if ((isExact || isPrefix) && entryLower.length > bestLen) {
      bestLen = entryLower.length;
      bestId = entry.id;
    }
  }

  return bestId;
}

// ============================================================
// Arbitraries for Property 2
// ============================================================

/** Generate a path segment (alphanumeric + spaces, no backslashes or semicolons) */
const areaSegmentArb = fc
  .string({ minLength: 1, maxLength: 15 })
  .map((s) => s.replace(/[\\;]/g, 'x').trim())
  .filter((s) => s.length > 0);

/** Generate a backslash-separated area path with 1-4 segments */
const areaPathArb = fc
  .array(areaSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => segments.join('\\'));

/** Create a TeamAreaPathEntry with given id and area path (optionally semicolon-separated) */
function makeTeam(
  id: number,
  azureAreaPath: string | undefined,
): TeamAreaPathEntry {
  return { id, azureAreaPath };
}

/** Generate a single area path or semicolon-separated area paths for a team */
const teamAreaPathArb = fc
  .array(areaPathArb, { minLength: 1, maxLength: 3 })
  .map((paths) => paths.join(';'));

/** Generate a set of teams with unique ids and random area paths */
const teamsArb = fc
  .array(teamAreaPathArb, { minLength: 0, maxLength: 8 })
  .map((paths) => paths.map((path, i) => makeTeam(i + 1, path)));

/**
 * Generate a scenario where the task area path is guaranteed to match one team.
 * Either exact match or a child path (team path + "\\" + extra segments).
 */
const matchingTeamScenarioArb = fc
  .array(areaPathArb, { minLength: 1, maxLength: 6 })
  .chain((teamPaths) => {
    const teams = teamPaths.map((p, i) => makeTeam(i + 1, p));
    return fc.integer({ min: 0, max: teamPaths.length - 1 }).chain((idx) => {
      const basePath = teamPaths[idx];
      return fc
        .array(areaSegmentArb, { minLength: 0, maxLength: 2 })
        .map((extraSegments) => {
          const taskPath =
            extraSegments.length === 0
              ? basePath
              : basePath + '\\' + extraSegments.join('\\');
          return { taskPath, teams };
        });
    });
  });

/**
 * Generate a scenario where the task area path does NOT match any team.
 */
const nonMatchingTeamScenarioArb = teamsArb.chain((teams) =>
  fc.constant('zzz_unrelated\\area\\no\\match').map((taskPath) => ({
    taskPath,
    teams,
  })),
);

/**
 * Generate a scenario with semicolon-separated paths where a match exists.
 */
const semicolonMatchScenarioArb = fc
  .array(areaPathArb, { minLength: 2, maxLength: 4 })
  .chain((paths) => {
    // Create a team with semicolon-separated paths
    const semiPath = paths.join(';');
    const teams = [makeTeam(1, semiPath)];
    // Pick one of the paths to match against
    return fc.integer({ min: 0, max: paths.length - 1 }).chain((idx) => {
      const basePath = paths[idx];
      return fc
        .array(areaSegmentArb, { minLength: 0, maxLength: 2 })
        .map((extraSegments) => {
          const taskPath =
            extraSegments.length === 0
              ? basePath
              : basePath + '\\' + extraSegments.join('\\');
          return { taskPath, teams };
        });
    });
  });

// ============================================================
// Property 2 Tests
// ============================================================

describe('Feature: leadhelper-restructure, Property 2: resolução de time por area path', () => {
  it('returns the same result as the reference implementation for any input', () => {
    fc.assert(
      fc.property(
        fc.option(areaPathArb, { nil: undefined }),
        teamsArb,
        (areaPath, teams) => {
          const actual = resolveTeamByAreaPath(areaPath, teams);
          const expected = resolveTeamRef(areaPath, teams);
          expect(actual).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns a matching team id when a match exists (exact or hierarchical)', () => {
    fc.assert(
      fc.property(matchingTeamScenarioArb, ({ taskPath, teams }) => {
        const result = resolveTeamByAreaPath(taskPath, teams);

        // Must return a team id (not null)
        expect(result).not.toBeNull();

        // The returned team must have a valid prefix of the task path
        const matched = teams.find((t) => t.id === result)!;
        const normalizedTask = normalizeAreaRef(taskPath);

        // Expand semicolon-separated paths for the matched team
        const matchedPaths = matched.azureAreaPath!
          .split(';')
          .map((p) => p.replace(/^\\+/, '').trim().toLowerCase());

        const hasValidPrefix = matchedPaths.some((mp) => {
          return normalizedTask === mp || normalizedTask.startsWith(mp + '\\');
        });
        expect(hasValidPrefix).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('always returns the longest matching prefix (most specific team)', () => {
    fc.assert(
      fc.property(matchingTeamScenarioArb, ({ taskPath, teams }) => {
        const result = resolveTeamByAreaPath(taskPath, teams);
        if (result === null) return;

        const matched = teams.find((t) => t.id === result)!;
        const normalizedTask = normalizeAreaRef(taskPath);

        // Get the longest matching path from the matched team
        const matchedPaths = matched.azureAreaPath!
          .split(';')
          .map((p) => p.replace(/^\\+/, '').trim().toLowerCase());

        const matchedLen = Math.max(
          ...matchedPaths
            .filter(
              (mp) =>
                normalizedTask === mp ||
                normalizedTask.startsWith(mp + '\\'),
            )
            .map((mp) => mp.length),
        );

        // No other team should have a longer matching prefix
        for (const other of teams) {
          if (!other.azureAreaPath || other.id === result) continue;
          const otherPaths = other.azureAreaPath
            .split(';')
            .map((p) => p.replace(/^\\+/, '').trim().toLowerCase());

          for (const op of otherPaths) {
            const otherMatches =
              normalizedTask === op || normalizedTask.startsWith(op + '\\');
            if (otherMatches) {
              expect(matchedLen).toBeGreaterThanOrEqual(op.length);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when no team matches', () => {
    fc.assert(
      fc.property(nonMatchingTeamScenarioArb, ({ taskPath, teams }) => {
        const result = resolveTeamByAreaPath(taskPath, teams);
        const expected = resolveTeamRef(taskPath, teams);
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when areaPath is undefined', () => {
    fc.assert(
      fc.property(teamsArb, (teams) => {
        const result = resolveTeamByAreaPath(undefined, teams);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('supports semicolon-separated paths in team azureAreaPath', () => {
    fc.assert(
      fc.property(semicolonMatchScenarioArb, ({ taskPath, teams }) => {
        const result = resolveTeamByAreaPath(taskPath, teams);
        const expected = resolveTeamRef(taskPath, teams);
        expect(result).toBe(expected);
        // Should find a match since we constructed the scenario to match
        expect(result).not.toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('normalization is case-insensitive and trims leading backslashes', () => {
    fc.assert(
      fc.property(areaPathArb, teamsArb, (basePath, teams) => {
        const variations = [
          basePath,
          '\\' + basePath,
          '\\\\' + basePath,
          basePath.toUpperCase(),
          '\\' + basePath.toUpperCase(),
        ];

        const results = variations.map((v) =>
          resolveTeamByAreaPath(v, teams),
        );

        // All variations should produce the same result
        for (const r of results) {
          expect(r).toBe(results[0]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
