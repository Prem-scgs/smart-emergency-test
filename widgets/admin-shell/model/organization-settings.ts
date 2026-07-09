import { useEffect, useState } from 'react'

import { buildAdminApiHeaders } from '@/shared/api/admin-api'
import type { AdminUser } from '@/shared/auth'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'

const API_BASE_URL = getEmergencyApiBaseUrl()

export const ORGANIZATION_SETTINGS_UPDATED_EVENT = 'smart-emergency:organization-settings-updated'

export interface OrganizationSettings {
  systemName: string
  organizationName: string
  timezone: string
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  systemName: 'Smart Emergency',
  organizationName: 'ศูนย์บัญชาการเหตุฉุกเฉิน',
  timezone: 'Asia/Bangkok',
}

/**
 * โหลดชื่อระบบ/องค์กรที่แสดงใน admin shell
 *
 * Settings page จะยิง event `smart-emergency:organization-settings-updated` หลัง save สำเร็จ
 * เพื่อให้ header/sidebar refresh โดยไม่ต้อง reload ทั้งหน้า
 */
export function useOrganizationSettings(user: AdminUser | null, isAuthenticated: boolean) {
  const [organizationSettings, setOrganizationSettings] = useState(DEFAULT_ORGANIZATION_SETTINGS)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    let cancelled = false

    async function loadOrganizationSettings() {
      if (!user) return

      try {
        const response = await fetch(API_BASE_URL + '/api/admin/organization-settings', {
          headers: buildAdminApiHeaders(user),
        })
        if (!response.ok) throw new Error('organization settings unavailable')
        const data = (await response.json()) as { settings: OrganizationSettings }
        if (!cancelled) {
          setOrganizationSettings(data.settings)
        }
      } catch {
        if (!cancelled) {
          setOrganizationSettings(DEFAULT_ORGANIZATION_SETTINGS)
        }
      }
    }

    void loadOrganizationSettings()
    window.addEventListener(ORGANIZATION_SETTINGS_UPDATED_EVENT, loadOrganizationSettings)

    return () => {
      cancelled = true
      window.removeEventListener(ORGANIZATION_SETTINGS_UPDATED_EVENT, loadOrganizationSettings)
    }
  }, [isAuthenticated, user])

  return organizationSettings
}
