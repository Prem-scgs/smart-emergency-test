/**
 * Scope helper ของ contact management
 *
 * ล็อกกติกาเดิม: super_admin จัดการได้ทุกหมวด, agency_admin จัดการได้เฉพาะ
 * category ของหน่วยตัวเอง และ viewer ไม่ควรได้ action create/edit/delete.
 */
export interface ContactScopeInput {
  isSuperAdmin: boolean
  role?: string | null
  agencyCategory?: string | null
}

export function canManageContactForScope(
  scope: ContactScopeInput,
  contact: { category?: string | null }
) {
  if (scope.isSuperAdmin) return true
  return scope.role === 'agency_admin' && Boolean(scope.agencyCategory) && contact.category === scope.agencyCategory
}

export function getInitialContactCategory(
  isSuperAdmin: boolean,
  agencyCategory: string | null | undefined,
  fallbackCategory: string
) {
  return isSuperAdmin ? fallbackCategory : agencyCategory ?? fallbackCategory
}

export function getEffectiveContactCategory(
  isSuperAdmin: boolean,
  formCategory: string,
  agencyCategory: string | null | undefined
) {
  return isSuperAdmin ? formCategory : agencyCategory ?? null
}
