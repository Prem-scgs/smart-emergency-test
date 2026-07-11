export type MockAdminScope =
  | { role: "super_admin" }
  | { role: "agency_admin"; category: string }
  | { role: "viewer"; category: string };

/**
 * Compatibility scope shape ที่ route เดิมใช้กรองข้อมูล admin
 *
 * `admin-boundary` จะลบ header จาก browser แล้วเติม role/category ที่อ่านจาก JWT + DB เท่านั้น
 * ชื่อ helper ยังมีคำว่า Mock เพื่อเลี่ยง refactor query ทั้งระบบใน release auth เดียว ห้ามเรียก helper นี้
 * ก่อนผ่าน boundary เพราะจะทำให้ browser spoof สิทธิ์ได้:
 * - super_admin เห็นทุกหมวด
 * - agency_admin/viewer ต้องมี category เพื่อจำกัดข้อมูลตามหน่วยงาน
 *
 * ถ้าเปลี่ยน shape นี้ต้องทดสอบ dashboard, contacts, GIS, reports และ tracking detail ทุก role
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
  _query: Record<string, unknown> | undefined
): MockAdminScope | null {
  return getMockAdminScope(headers);
}
