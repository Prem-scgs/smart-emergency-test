'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EmergencyCategory } from '@/entities/incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { ROLE_PERMISSIONS, type AdminRole, type AdminUser, type Agency, type AuthState } from './types'
import {
  clearAdminAccessToken,
  getStoredAdminAccessToken,
  saveAdminAccessToken,
} from './session'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
  canViewAllAgencies: () => boolean
  getUserAgency: () => Agency | undefined
  getFilteredCategories: () => EmergencyCategory[]
}

interface ApiAdminUser {
  id: string
  email: string
  displayName: string
  role: AdminRole
  agencyId: string | null
  active: boolean
  agency?: {
    id: string
    name: string
    category: EmergencyCategory
  } | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapAuthenticatedUser(profile: ApiAdminUser): AdminUser {
  const agency = profile.agency
    ? {
        id: profile.agency.id,
        name: profile.agency.name,
        nameTh: profile.agency.name,
        category: profile.agency.category,
        description: profile.agency.name,
        icon: 'Building2',
        color: 'text-muted-foreground',
      }
    : undefined

  return {
    id: profile.id,
    email: profile.email,
    name: profile.displayName,
    role: profile.role,
    agencyId: profile.agencyId ?? undefined,
    agency,
    permissions: ROLE_PERMISSIONS[profile.role],
    lastLogin: new Date(),
  }
}

/**
 * Real admin auth provider
 *
 * JWT ถูกเก็บใน sessionStorage แต่ profile/permission ต้องโหลดจาก API ทุกครั้งที่เปิดหน้าใหม่
 * เพื่อให้การ deactivate หรือเปลี่ยน role มีผลทันทีหลัง request ถัดไป ไม่เชื่อข้อมูลจาก browser เอง
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  const clearSession = useCallback(() => {
    clearAdminAccessToken()
    setAuthState({ user: null, isAuthenticated: false, isLoading: false })
  }, [])

  useEffect(() => {
    const accessToken = getStoredAdminAccessToken()
    if (!accessToken) {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
      return
    }

    const controller = new AbortController()
    void fetch(`${getEmergencyApiBaseUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error('Admin session is no longer valid')
        const payload = (await response.json()) as { user: ApiAdminUser }
        setAuthState({
          user: mapAuthenticatedUser(payload.user),
          isAuthenticated: true,
          isLoading: false,
        })
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        clearSession()
      })

    return () => controller.abort()
  }, [clearSession])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setAuthState(previous => ({ ...previous, isLoading: true }))
    try {
      const response = await fetch(`${getEmergencyApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false })
        return false
      }

      const payload = (await response.json()) as { token: string; user: ApiAdminUser }
      saveAdminAccessToken(payload.token)
      setAuthState({
        user: mapAuthenticatedUser(payload.user),
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    } catch {
      setAuthState({ user: null, isAuthenticated: false, isLoading: false })
      return false
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  const hasPermission = useCallback((permission: string) => (
    authState.user?.permissions.includes(permission) ?? false
  ), [authState.user])

  const canViewAllAgencies = useCallback(
    () => hasPermission('dashboard.all-agencies'),
    [hasPermission],
  )

  const getUserAgency = useCallback(() => authState.user?.agency, [authState.user])

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
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
