type RoleUser = { role?: string | null; roleId?: number | string | null } | null | undefined;

// Database IDs are identifiers, not role codes. Trust the backend's role code.
export function checkIsAdmin(user: RoleUser): boolean {
  const role = user?.role?.trim().toUpperCase();
  return role === "ADMIN" || role === "ROLE_ADMIN";
}

export function checkIsModerator(user: RoleUser): boolean {
  const role = user?.role?.trim().toUpperCase();
  return role === "MODERATOR" || role === "ROLE_MODERATOR";
}
