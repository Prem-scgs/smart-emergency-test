'use client'

export {
  CONTACT_COVERAGE_OPTIONS,
  getContactCoverageFromValues,
  getContactCoverageKind,
  getContactCoverageState,
  type ContactCoverage,
  type ContactCoverageState,
} from '../entities/contact/model/coverage.ts'
export {
  getContactDisplayCategoryLabel,
  getSelectOptionLabel,
} from '../entities/contact/lib/display.ts'
export {
  getContactRole,
  isValidContactPhone,
  normalizeContactPhone,
} from '../entities/contact/lib/phone.ts'
export {
  canManageContactForScope,
  getEffectiveContactCategory,
  getInitialContactCategory,
  type ContactScopeInput,
} from '../entities/contact/lib/scope.ts'
