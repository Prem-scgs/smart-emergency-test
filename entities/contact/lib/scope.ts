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
