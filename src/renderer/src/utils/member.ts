import type { TeamMemberRole } from '@shared/interfaces/config/index.types';

/**
 * Fixed color per role — all members with the same role share the same avatar color.
 */
export const ROLE_COLORS: Record<TeamMemberRole, string> = {
  developer: '#1976d2',
  analyst: '#9c27b0',
  qa: '#2e7d32',
  tech_lead: '#ed6c02',
  devops: '#0288d1',
  designer: '#d32f2f',
  product_owner: '#7b1fa2',
};

/** Fallback for unknown roles */
const FALLBACK_COLOR = '#455a64';

export function getRoleColor(role?: string): string {
  if (!role) return FALLBACK_COLOR;
  return ROLE_COLORS[role as TeamMemberRole] ?? FALLBACK_COLOR;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}
