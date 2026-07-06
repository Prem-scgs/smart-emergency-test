export type MockAdminScope =
  | { role: "super_admin" }
  | { role: "agency_admin"; category: string }
  | { role: "viewer"; category: string };

export function isCategoryScopedAdmin(scope: MockAdminScope | null | undefined) {
  return scope?.role === "agency_admin" || scope?.role === "viewer";
}

export function isViewerScope(
  scope: MockAdminScope | null | undefined
): scope is Extract<MockAdminScope, { role: "viewer" }> {
  return scope?.role === "viewer";
}

export function getMockAdminScope(headers: Record<string, unknown> | undefined): MockAdminScope | null {
  const roleHeader = headers?.["x-admin-role"];
  const categoryHeader = headers?.["x-admin-category"];

  const role = typeof roleHeader === "string" ? roleHeader.trim() : "";
  const category = typeof categoryHeader === "string" ? categoryHeader.trim() : "";

  if (role === "super_admin") {
    return { role: "super_admin" };
  }

  if ((role === "agency_admin" || role === "viewer") && category.length > 0) {
    return { role, category };
  }

  return null;
}

export function getMockAdminScopeFromRequest(
  headers: Record<string, unknown> | undefined,
  query: Record<string, unknown> | undefined
): MockAdminScope | null {
  const headerScope = getMockAdminScope(headers);
  if (headerScope) {
    return headerScope;
  }

  const role = typeof query?.role === "string" ? query.role.trim() : "";
  const category = typeof query?.category === "string" ? query.category.trim() : "";

  if (role === "super_admin") {
    return { role: "super_admin" };
  }

  if ((role === "agency_admin" || role === "viewer") && category.length > 0) {
    return { role, category };
  }

  return null;
}
