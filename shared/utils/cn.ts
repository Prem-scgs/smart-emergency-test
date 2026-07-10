import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * รวม className แบบ Tailwind-safe
 *
 * `clsx` จัดการ conditional class ส่วน `tailwind-merge` กัน class conflict
 * เช่น `p-2` กับ `p-4` เพื่อให้ UI primitive และ widgets compose class ได้ปลอดภัย.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
