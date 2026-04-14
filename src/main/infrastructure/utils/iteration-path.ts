/**
 * Módulo utilitário puro para resolução de iteration paths.
 *
 * Contém a lógica de normalização e resolução de sprint por iteration path,
 * extraída do SyncService para facilitar testes de propriedade.
 */

// ============================================================
// Types
// ============================================================

export interface SprintPathEntry {
  id: number;
  iterationPath?: string;
}

// ============================================================
// Functions
// ============================================================

/**
 * Normalizes an iteration path by:
 * - Removing leading backslashes
 * - Trimming whitespace
 * - Converting to lowercase
 */
export function normalizeIterationPath(path: string): string {
  return path.replace(/^\\+/, '').trim().toLowerCase();
}

/**
 * Resolves a work item's iteration path to the best matching sprint.
 *
 * Rules:
 * 1. Exact match: normalized task path === normalized sprint path
 * 2. Hierarchical match: task path starts with sprint path + backslash separator
 *    (task is inside the sprint's iteration)
 * 3. Returns the longest matching prefix (most specific sprint)
 *
 * @returns The sprint id of the best match, or null if no match found.
 */
export function resolveSprintByIterationPath(
  iterationPath: string | undefined,
  sprints: SprintPathEntry[],
): number | null {
  if (!iterationPath) {
    return null;
  }

  const normalizedTaskPath = normalizeIterationPath(iterationPath);

  // 1. Exact match first
  const exactMatch = sprints.find(
    (s) =>
      s.iterationPath &&
      normalizeIterationPath(s.iterationPath) === normalizedTaskPath,
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  // 2. Hierarchical match: task path starts with sprint path
  // Sort by path length descending to match the most specific sprint first
  const sortedSprints = [...sprints]
    .filter((s) => s.iterationPath)
    .sort(
      (a, b) => (b.iterationPath?.length ?? 0) - (a.iterationPath?.length ?? 0),
    );

  for (const sprint of sortedSprints) {
    const sprintPath = normalizeIterationPath(sprint.iterationPath!);

    // Task path must START with sprint path (task is inside sprint)
    // Add backslash to ensure we match complete segments
    const sprintPathWithSeparator = sprintPath + '\\';
    if (
      normalizedTaskPath.startsWith(sprintPathWithSeparator) ||
      normalizedTaskPath === sprintPath
    ) {
      return sprint.id;
    }
  }

  // No match found
  return null;
}
