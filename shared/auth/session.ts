import type { Agency, AdminRole, AdminUser, AuthState } from './types'

export const ADMIN_USER_STORAGE_KEY = 'admin_user'

const SUPPORTED_ADMIN_ROLES: AdminRole[] = ['super_admin', 'agency_admin', 'viewer']

export const AGENCIES: Agency[] = [
  {
    id: 'police',
    name: 'Police',
    nameTh: 'ตำรวจ',
    category: 'police',
    description: 'Royal Thai Police',
    icon: 'Shield',
    color: 'text-blue-600',
  },
  {
    id: 'medical',
    name: 'Medical',
    nameTh: 'การแพทย์ฉุกเฉิน',
    category: 'medical',
    description: 'Emergency Medical Services',
    icon: 'Heart',
    color: 'text-red-600',
  },
  {
    id: 'fire',
    name: 'Fire Department',
    nameTh: 'ดับเพลิง',
    category: 'fire',
    description: 'Fire and Rescue Department',
    icon: 'Flame',
    color: 'text-orange-600',
  },
  {
    id: 'rescue',
    name: 'Rescue Team',
    nameTh: 'กู้ภัย',
    category: 'rescue',
    description: 'National Rescue Team',
    icon: 'LifeBuoy',
    color: 'text-emerald-600',
  },
  {
    id: 'flood',
    name: 'Disaster Prevention',
    nameTh: 'ป้องกันภัยพิบัติ',
    category: 'flood',
    description: 'Disaster Prevention and Mitigation',
    icon: 'Waves',
    color: 'text-cyan-600',
  },
  {
    id: 'road-accident',
    name: 'Traffic Police',
    nameTh: 'จราจร',
    category: 'road-accident',
    description: 'Traffic Police Division',
    icon: 'Car',
    color: 'text-amber-600',
  },
]

function isSupportedAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && SUPPORTED_ADMIN_ROLES.includes(role as AdminRole)
}

/**
 * กู้ session admin จาก localStorage ตอนเปิดหน้าใหม่
 *
 * จุดที่ต้องระวัง:
 * - role ที่เลิกใช้แล้ว เช่น operator ต้องไม่ถูก restore เพื่อกันสิทธิ์เก่าหลุดกลับมา
 * - session เก่าบางเครื่องมีแค่ agencyId จึงต้องเติม agency object กลับมา
 * - agency object มีผลกับ API scope, viewer detail และ notification filtering
 */
export function restoreStoredAdminUser(raw: string | null): AdminUser | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Omit<AdminUser, 'lastLogin'> & { lastLogin?: string | Date }
    if (!isSupportedAdminRole(parsed.role)) {
      return null
    }

    const normalizedAgencyId = parsed.agencyId?.startsWith('agency-')
      ? parsed.agencyId.slice('agency-'.length)
      : parsed.agencyId
    const agency =
      parsed.agency ??
      AGENCIES.find(candidate =>
        candidate.id === normalizedAgencyId ||
        candidate.category === normalizedAgencyId
      )

    return {
      ...parsed,
      // Session เก่าอาจมีแค่ agencyId ต้องเติม agency กลับมาเพื่อให้ scope ตามหมวดทำงานถูกต้อง
      agency,
      lastLogin: parsed.lastLogin ? new Date(parsed.lastLogin) : new Date(),
    }
  } catch {
    return null
  }
}

export function loadStoredAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }
  }

  const user = restoreStoredAdminUser(window.localStorage.getItem(ADMIN_USER_STORAGE_KEY))

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading: false,
  }
}
