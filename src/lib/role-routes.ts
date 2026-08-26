/**
 * Single source of truth for role -> dashboard path.
 */
export const ROLE_DASHBOARD_PATHS: Record<string, string> = {
  SUPER_ADMIN: "/super-admin",
  SCHOOL_ADMIN: "/school-admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  ACCOUNTANT: "/accountant",
  PARENT: "/parent",
  SERVICE_OFFICER: "/services",
};

export const ROLE_ROUTES: Record<string, string[]> = {
  "/super-admin": ["SUPER_ADMIN"],
  "/school-admin": ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  "/teacher": ["TEACHER", "SUPER_ADMIN"],
  "/student": ["STUDENT", "SUPER_ADMIN"],
  "/accountant": ["ACCOUNTANT", "SUPER_ADMIN"],
  "/parent": ["PARENT", "SUPER_ADMIN"],
  "/services": ["SERVICE_OFFICER", "ACCOUNTANT", "SUPER_ADMIN"],
};

export function roleDashboardPath(role?: string | null): string | null {
  if (!role) return null;
  return ROLE_DASHBOARD_PATHS[role] ?? null;
}
