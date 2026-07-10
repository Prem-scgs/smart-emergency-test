import { SettingsPage } from "@/widgets/admin-settings"

/**
 * Settings route shell
 *
 * Personal preferences, organization settings, share channels และ health snapshot
 * อยู่ใน `widgets/admin-settings` เพื่อให้ route ไม่ผูกกับ API หรือ browser storage โดยตรง.
 */
export default function Page() {
  return <SettingsPage />
}
