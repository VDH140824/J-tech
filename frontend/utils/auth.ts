export function checkIsAdmin(user: { role?: string | null; roleId?: number | string | null } | null | undefined): boolean {
  if (!user) return false;
  const normalizedRole = user.role?.trim().toUpperCase();
  const normalizedRoleId = String(user.roleId ?? "");
  return normalizedRoleId === "1" || normalizedRole === "ADMIN" || normalizedRole === "ROLE_ADMIN";
}

export function checkIsModerator(user: { role?: string | null; roleId?: number | string | null } | null | undefined): boolean {
  if (!user) return false;
  const normalizedRole = user.role?.trim().toUpperCase();
  const normalizedRoleId = String(user.roleId ?? "");
  return normalizedRoleId === "2" || normalizedRole === "MODERATOR" || normalizedRole === "ROLE_MODERATOR";
}
