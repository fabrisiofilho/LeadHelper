/**
 * Member Parser — maps Azure DevOps AssignedTo fields to ParsedMember.
 *
 * Pure functions — no I/O, just data transformation.
 * Extracts displayName, uniqueName (email) and id (azureUniqueId).
 * Deduplicates members by email (uniqueName).
 */

export interface AzureAssignedTo {
  displayName: string;
  uniqueName: string; // email
  id?: string; // azure unique id
}

export interface ParsedMember {
  name: string;
  email: string;
  azureUniqueId?: string;
}

/**
 * Parses a single Azure AssignedTo object into a ParsedMember.
 */
export function parseMember(assignedTo: AzureAssignedTo): ParsedMember {
  return {
    name: assignedTo.displayName,
    email: assignedTo.uniqueName,
    azureUniqueId: assignedTo.id,
  };
}

/**
 * Parses multiple Azure AssignedTo objects into ParsedMember[].
 */
export function parseMemberMany(
  assignedToList: AzureAssignedTo[],
): ParsedMember[] {
  return assignedToList.map(parseMember);
}

/**
 * Deduplicates members by email (case-insensitive).
 * Keeps the first occurrence of each email.
 */
export function deduplicateMembers(members: ParsedMember[]): ParsedMember[] {
  const seen = new Map<string, ParsedMember>();

  for (const member of members) {
    const key = member.email.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, member);
    }
  }

  return Array.from(seen.values());
}
