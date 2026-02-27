/**
 * Team Parser — maps Azure DevOps Classification Nodes (Areas) to ParsedTeam.
 *
 * Pure functions — no I/O, just data transformation.
 * Flattens the area paths tree recursively.
 * Maps `name` to `team.name` and `path` to `team.azureAreaPath`.
 */

export interface AzureAreaNode {
  id: number;
  name: string;
  path: string;
  children?: AzureAreaNode[];
}

export interface ParsedTeam {
  name: string;
  azureAreaPath: string;
}

/**
 * Parses a single Azure area node into a ParsedTeam.
 */
export function parseTeam(node: AzureAreaNode): ParsedTeam {
  return {
    name: node.name,
    azureAreaPath: node.path,
  };
}

/**
 * Parses multiple Azure area nodes into ParsedTeam[].
 */
export function parseTeamMany(nodes: AzureAreaNode[]): ParsedTeam[] {
  return nodes.map(parseTeam);
}

/**
 * Recursively flattens an area tree into a flat array of nodes.
 * Includes the root node and all descendants.
 */
export function flattenAreaTree(root: AzureAreaNode): AzureAreaNode[] {
  const result: AzureAreaNode[] = [root];

  if (root.children) {
    for (const child of root.children) {
      result.push(...flattenAreaTree(child));
    }
  }

  return result;
}
