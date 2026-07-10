/**
 * Public API ของ admin contacts widget
 *
 * Route shell เรียกจากที่นี่ ส่วน CRUD/form/location selector อยู่ภายใน widget
 * เพื่อรักษา boundary ของหน้า contacts.
 */
export { default as ContactsPage } from "./ui/contacts-page"
export type { Contact, ContactFormState } from "./model/types"
