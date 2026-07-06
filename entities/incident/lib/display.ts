const MOBILE_CALL_SYSTEM_DESCRIPTION_PATTERN =
  /^Call (?:initiated|completed) via mobile app to .+/i

export function getIncidentDisplayNumber(
  incident: { id: string; caseNumber?: string | null }
) {
  return incident.caseNumber ?? incident.id.slice(0, 8)
}

export function isMobileCallSystemDescription(description: string | null | undefined) {
  return MOBILE_CALL_SYSTEM_DESCRIPTION_PATTERN.test(description?.trim() ?? '')
}

export function getUserFacingIncidentDescription(description: string | null | undefined) {
  const normalized = description?.trim()
  if (!normalized) return null
  return isMobileCallSystemDescription(normalized) ? null : normalized
}
