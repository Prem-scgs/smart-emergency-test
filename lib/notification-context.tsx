'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Notification } from '@/lib/types'
import { useWebSocket } from '@/lib/use-websocket'
import { useAuth } from '@/lib/auth-context'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Filter notifications based on user role and agency
  const filteredNotifications = notifications.filter(notif => {
    if (!user) return false
    
    // Superadmin sees all
    if (user.role === 'superadmin') return true
    
    // Agency admin/operator/viewer only see their agency's notifications
    if (notif.agencyId && user.agencyId) {
      return notif.agencyId === user.agencyId
    }
    
    return false
  })

  const unreadCount = filteredNotifications.filter(n => !n.read).length

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 100))
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

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Setup WebSocket
  useWebSocket({
    onNotification: addNotification,
    enabled: !!user && user.isAuthenticated !== false,
  })

  const value: NotificationContextType = {
    notifications: filteredNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
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
