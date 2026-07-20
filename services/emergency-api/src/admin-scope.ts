export type MockAdminScope =
  | { role: "super_admin" }
  | { role: "agency_admin"; category: string }
  | { role: "viewer"; category: string };

/**
 * Scope ฝั่ง backend สำหรับ demo/admin mock auth
 *
 * ตอนนี้ backend ยังไม่ได้ใช้ real auth token จึงรับสิทธิ์จาก header/query:
 * - super_admin เห็นทุกหมวด
 * - agency_admin/viewer ต้องมี category เพื่อจำกัดข้อมูลตามหน่วยงาน
 *
 * ถ้าเปลี่ยนเป็น real auth ภายหลัง ต้องให้ endpoint เดิมยังได้ scope shape เดิม
 * ไม่อย่างนั้น dashboard, contacts, GIS และ tracking detail จะเห็นข้อมูลผิดหมวดได้
 */
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
