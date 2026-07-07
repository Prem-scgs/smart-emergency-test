'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { EmergencyCategory } from '@/entities/incident'
import { ROLE_PERMISSIONS, type AdminRole, type AdminUser, type Agency, type AuthState } from './types'
import { ADMIN_USER_STORAGE_KEY, AGENCIES, loadStoredAuthState } from './session'

interface AuthContextType extends AuthState {
  login: (email: string, password: string, role: AdminRole, agencyId?: string) => Promise<boolean>
  logout: () => void
  hasPermission: (permission: string) => boolean
  canViewAllAgencies: () => boolean
  getUserAgency: () => Agency | undefined
  getFilteredCategories: () => EmergencyCategory[]
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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
