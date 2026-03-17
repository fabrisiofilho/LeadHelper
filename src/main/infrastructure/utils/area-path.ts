/**
 * Módulo utilitário puro para resolução de area paths.
 *
 * Contém a lógica de normalização e resolução de time por area path,
 * extraída do SyncService para facilitar testes de propriedade.
 */

// ============================================================
// Types
// ============================================================

export interface TeamAreaPathEntry {
  id: number;
  azureAreaPath?: string;
}

// ============================================================
// Functions
// ============================================================

/**
 * Normalizes an area path by:
 * - Removing leading backslashes
 * - Trimming whitespace
 * - Converting to lowercase
 */
export function normalizeAreaPath(path: string): string {
  return path.replace(/^\\+/, '').trim().toLowerCase();
}

/**
 * Resolves a work item's area path to the best matching team.
 *
 * Rules:
 * 1. Supports semicolon-separated paths in team's azureAreaPath
 * 2. Exact match: normalized task path === normalized team path
 * 3. Hierarchical match: task path starts with team path + backslash separator
 * 4. Returns the team with the longest matching prefix (most specific team)
 *
 * @returns The team id of the best match, or null if no match found.
 */
export function resolveTeamByAreaPath(
  areaPath: string | undefined,
  teams: TeamAreaPathEntry[],
): number | null {
  if (!areaPath) {
    return null;
  }

  const normalizedAreaPath = areaPath.replace(/^\\+/, '').trim().toLowerCase();

  // Build entries from teams with azureAreaPath (supports ";" separated paths)
  const entries: { id: number; path: string }[] = [];
  for (const team of teams) {
    if (!team.azureAreaPath) continue;
    const paths = team.azureAreaPath
      .split(';')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of paths) {
      const normalized = p.replace(/^\\+/, '').trim();
      entries.push({ id: team.id, path: normalized });
    }
  }

  // Sort by path length descending so longest (most specific) prefix is checked first
  const sorted = [...entries].sort((a, b) => b.path.length - a.path.length);

  for (const entry of sorted) {
    const entryLower = entry.path.toLowerCase();

    // Exact match
    if (normalizedAreaPath === entryLower) {
      return entry.id;
    }

    // Hierarchical match: task areaPath starts with team's azureAreaPath + separator
    const prefix = entryLower + '\\';
    if (normalizedAreaPath.startsWith(prefix)) {
      return entry.id;
    }
  }

  // No match found
  return null;
}
