/**
 * Sprint Parser — maps Azure DevOps Classification Nodes (Iterations) to ParsedSprint.
 *
 * Pure functions — no I/O, just data transformation.
 * Flattens the iteration tree recursively and ignores nodes without startDate or finishDate.
 */

export interface AzureIterationNode {
  id: number;
  name: string;
  path: string;
  attributes?: {
    startDate?: string;
    finishDate?: string;
  };
  children?: AzureIterationNode[];
}

export interface ParsedSprint {
  name: string;
  startDate: Date;
  endDate: Date;
  iterationPath: string;
}

/**
 * Parses a single Azure iteration node into a ParsedSprint.
 * Returns null if the node lacks startDate or finishDate (e.g. root iterations without dates).
 */
export function parseSprint(node: AzureIterationNode): ParsedSprint | null {
  const startDate = node.attributes?.startDate;
  const finishDate = node.attributes?.finishDate;

  if (!startDate || !finishDate) {
    return null;
  }

  return {
    name: node.name,
    startDate: new Date(startDate),
    endDate: new Date(finishDate),
    iterationPath: node.path,
  };
}

/**
 * Parses multiple Azure iteration nodes, filtering out nodes without dates.
 */
export function parseSprintMany(nodes: AzureIterationNode[]): ParsedSprint[] {
  return nodes.reduce<ParsedSprint[]>((acc, node) => {
    const parsed = parseSprint(node);
    if (parsed) {
      acc.push(parsed);
    }
    return acc;
  }, []);
}

/**
 * Recursively flattens an iteration tree into a flat array of nodes.
 * Includes the root node and all descendants.
 */
export function flattenIterationTree(
  root: AzureIterationNode,
): AzureIterationNode[] {
  const result: AzureIterationNode[] = [root];

  if (root.children) {
    for (const child of root.children) {
      result.push(...flattenIterationTree(child));
    }
  }

  return result;
}
