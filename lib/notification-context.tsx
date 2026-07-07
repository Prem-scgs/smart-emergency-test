'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  canUserSeeAlert,
  canUserSeeNotification,
  type Alert,
  type Notification,
} from '@/features/incident-alert'
import { useSse } from '@/lib/use-sse'
import { useAuth } from '@/lib/auth-context'
import { useAdminI18n } from '@/lib/admin-i18n'
import { getLocationDisplayName, useLocationLookupMaps } from '@/lib/reference-locations'
import type { IncidentEventPayload } from '@/lib/use-sse'

interface NotificationContextType {
  notifications: Notification[]
  alerts: Alert[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  addAlert: (alert: Alert) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAlert: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { language } = useAdminI18n()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])

  const filteredNotifications = notifications.filter(notif => canUserSeeNotification(user, notif))

  const filteredAlerts = alerts.filter(alert => canUserSeeAlert(user, alert))

  const unreadCount = filteredNotifications.filter(n => !n.read).length

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 100))
  }, [])

  const addAlert = useCallback((alert: Alert) => {
    setAlerts(prev => [alert, ...prev])
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif => (notif.id === id ? { ...notif, read: true } : notif))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
  }, [])

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  const clearAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setAlerts([])
  }, [])

  const formatIncidentAreaText = useCallback(
    (payload: IncidentEventPayload) => {
      const preferThai = language === 'th'
      const province = payload.provinceCode ? provinceByCode[payload.provinceCode] : undefined
      const district = payload.districtCode ? districtByCode[payload.districtCode] : undefined
      const provinceLabel = getLocationDisplayName(province, preferThai) || payload.province || ''
      const districtLabel = getLocationDisplayName(district, preferThai) || payload.district || ''

      // alert popup ต้องใช้ master location ตามภาษาปัจจุบัน ไม่ใช้ชื่ออังกฤษที่ mobile เคยส่งมาเป็นหลัก
      return [districtLabel, provinceLabel].filter(Boolean).join(' ') || null
    },
    [districtByCode, language, provinceByCode]
  )

  // Setup SSE connection
  useSse({
    onNotification: addNotification,
    onAlert: addAlert,
    formatAreaText: formatIncidentAreaText,
    enabled: !isLoading && isAuthenticated && !!user,
    user,
    language,
  })

  const value: NotificationContextType = {
    notifications: filteredNotifications,
    alerts: filteredAlerts,
    unreadCount,
    addNotification,
    addAlert,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAlert,
    clearAll,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
