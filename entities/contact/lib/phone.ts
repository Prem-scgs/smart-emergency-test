export function normalizeContactPhone(phone: string) {
  return phone.replace(/\D/g, '')
}

export function isValidContactPhone(phone: string) {
  const normalizedPhone = normalizeContactPhone(phone)
  return /^(?:\d{3,4}|0\d{8,9})$/.test(normalizedPhone)
}

export function getContactRole(role?: string | null) {
  return role?.trim() || 'responder'
}
