/**
 * Phone helper สำหรับเบอร์ติดต่อฉุกเฉิน
 *
 * รองรับทั้งเบอร์สั้น เช่น 199/1669 และเบอร์ไทยขึ้นต้น 0 ถ้าแก้ regex
 * ต้องทดสอบ create/edit contact เพราะ backend และ UI คาดหวัง normalize format เดิม.
 */
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
