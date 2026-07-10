import type { Contact, ContactFormState } from "../model/types"

/**
 * Form mapper ของ contacts page
 *
 * ใช้แปลง API contact เข้า dialog form และตั้ง default สำหรับ create flow
 * ถ้าแก้ default category/active/is24Hours ต้องทดสอบ permission และ create/edit.
 */
export const emptyForm: ContactFormState = {
  name: "",
  phone: "",
  category: "fire",
  is24Hours: true,
  active: true,
}

export function toForm(contact: Contact): ContactFormState {
  return {
    name: contact.name,
    phone: contact.phone,
    category: contact.category ?? "fire",
    is24Hours: contact.is24Hours,
    active: contact.active,
  }
}
