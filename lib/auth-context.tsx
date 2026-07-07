'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { EmergencyCategory } from '@/entities/incident'
import type { AdminUser, AdminRole, Agency, AuthState } from '@/shared/auth'
import { ROLE_PERMISSIONS } from '@/shared/auth'

const ADMIN_USER_STORAGE_KEY = 'admin_user'

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

interface AuthContextType extends AuthState {
  login: (email: string, password: string, role: AdminRole, agencyId?: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
  canViewAllAgencies: () => boolean
  getUserAgency: () => Agency | undefined
  getFilteredCategories: () => EmergencyCategory[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function restoreStoredAdminUser(raw: string | null): AdminUser | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Omit<AdminUser, 'lastLogin'> & { lastLogin?: string | Date }
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
      // Session เก่าอาจมีแค่ agencyId ทำให้ viewer ไม่ส่ง category scope ไป backend
      // ต้องเติม agency กลับมาเพื่อให้ read-only detail ใช้สิทธิ์ตามหมวดได้ถูกต้อง
      agency,
      lastLogin: parsed.lastLogin ? new Date(parsed.lastLogin) : new Date(),
    }
  } catch {
    return null
  }
}

function loadStoredAuthState(): AuthState {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    setAuthState(loadStoredAuthState())
  }, [])

  const login = useCallback(async (
    email: string, 
    password: string, 
    role: AdminRole, 
    agencyId?: string
  ): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const agency = agencyId ? AGENCIES.find(a => a.id === agencyId) : undefined
    
    const user: AdminUser = {
      id: `user-${Date.now()}`,
      email,
      name: role === 'super_admin' ? 'ผู้ดูแลระบบสูงสุด' : `ผู้ดูแล${agency?.nameTh || ''}`,
      role,
      agencyId,
      agency,
      permissions: ROLE_PERMISSIONS[role],
      lastLogin: new Date(),
    }

    setAuthState({
      user,
      isAuthenticated: true,
      isLoading: false,
    })

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ADMIN_USER_STORAGE_KEY, JSON.stringify(user))
    }

    return true
  }, [])

  const logout = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_USER_STORAGE_KEY)
    }
  }, [])

  const hasPermission = useCallback((permission: string): boolean => {
    if (!authState.user) return false
    return authState.user.permissions.includes(permission)
  }, [authState.user])

  const canViewAllAgencies = useCallback((): boolean => {
    return hasPermission('dashboard.all-agencies')
  }, [hasPermission])

  const getUserAgency = useCallback((): Agency | undefined => {
    return authState.user?.agency
  }, [authState.user])

  const getFilteredCategories = useCallback((): EmergencyCategory[] => {
    if (canViewAllAgencies()) {
      return ['police', 'medical', 'fire', 'rescue', 'flood', 'road-accident']
    }
    const agency = getUserAgency()
    return agency ? [agency.category] : []
  }, [canViewAllAgencies, getUserAgency])

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        hasPermission,
        canViewAllAgencies,
        getUserAgency,
        getFilteredCategories,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
