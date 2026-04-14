import type { TeamMemberRole } from '@shared/interfaces/config/index.types';

/**
 * Fixed color per role — all members with the same role share the same avatar color.
 */
export const ROLE_COLORS: Record<TeamMemberRole, string> = {
  developer: '#2563EB',
  analyst: '#7C3AED',
  qa: '#16A34A',
  tech_lead: '#D97706',
  devops: '#0891B2',
  designer: '#DC2626',
  product_owner: '#6D28D9',
};

/** Fallback for unknown roles */
const FALLBACK_COLOR = '#64748B';

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
