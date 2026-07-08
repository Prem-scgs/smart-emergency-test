import type { Contact, ContactFormState } from "../model/types"

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

