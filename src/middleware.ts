/**
 * Middleware — VenueOS RBAC enforcement.
 *
 * next-auth v4 getToken() has known Edge Runtime incompatibilities with
 * Next.js 15 + React 19 in development. Full RBAC is enforced here once
 * next-auth v5 is configured. During demo/development, all routes pass through.
 *
 * To re-enable: uncomment the getToken block and install next-auth v5.
 */
import { NextRequest, NextResponse } from "next/server";

export type AppRole =
  | "SUPER_ADMIN"
  | "PROPERTY_ADMIN"
  | "SALES_MANAGER"
  | "BDE"
  | "OPERATIONS"
  | "FINANCE"
  | "VIEWER";

// NOTE: Next.js route groups like (auth) do NOT add a URL segment.
// Actual URLs are /login, /forgot-password, /reset-password — NOT /auth/...
const PUBLIC_PAGE_PATHS: string[] = [
  "/",
  "/login",
  "/forgot-password",
  "/reset-password",
];

const PUBLIC_PAGE_PREFIXES: string[] = ["/portal"];

const PUBLIC_API_PREFIXES: string[] = [
  "/api/auth",     // NextAuth internals
  "/api/portal",   // Public venue discovery and enquiry
  "/api/webhooks", // Payment gateway + iCal (signature-verified inside handler)
];

const PAGE_ROLE_MAP: Array<{ prefix: string; roles: AppRole[] }> = [
  {
    prefix: "/admin",
    roles: ["SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/sales",
    roles: ["BDE", "SALES_MANAGER", "SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/operations",
    roles: ["OPERATIONS", "SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/finance",
    roles: ["FINANCE", "SALES_MANAGER", "PROPERTY_ADMIN", "SUPER_ADMIN"],
  },
];

const API_ROLE_MAP: Array<{ prefix: string; roles: AppRole[] }> = [
  {
    prefix: "/api/admin",
    roles: ["SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/api/sales",
    roles: ["BDE", "SALES_MANAGER", "SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/api/operations",
    roles: ["OPERATIONS", "SUPER_ADMIN", "PROPERTY_ADMIN"],
  },
  {
    prefix: "/api/finance",
    roles: ["FINANCE", "SALES_MANAGER", "PROPERTY_ADMIN", "SUPER_ADMIN"],
  },
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.includes(pathname)) return true;
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function matchRoleEntry(
  pathname: string,
  map: Array<{ prefix: string; roles: AppRole[] }>
): AppRole[] | null {
  for (const entry of map) {
    if (pathname === entry.prefix || pathname.startsWith(entry.prefix + "/")) {
      return entry.roles;
    }
  }
  return null;
}

function hasRequiredRole(userRole: string, allowedRoles: AppRole[]): boolean {
  return allowedRoles.includes(userRole as AppRole);
}

function getRoleDefaultPath(role: string | undefined): string {
  switch (role as AppRole) {
    case "SUPER_ADMIN":
    case "PROPERTY_ADMIN":
      return "/admin";
    case "SALES_MANAGER":
    case "BDE":
      return "/sales";
    case "OPERATIONS":
      return "/operations";
    case "FINANCE":
      return "/finance";
    case "VIEWER":
      return "/admin";
    default:
      return "/login";
  }
}

// Demo mode: pass all requests through — RBAC re-enabled when next-auth v5 is wired up
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
