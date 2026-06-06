'use client'

import { useEffect, useCallback, useRef } from 'react'
import { Notification, WebSocketEvent } from './types'

interface UseWebSocketOptions {
  onNotification?: (notification: Notification) => void
  onEvent?: (event: WebSocketEvent) => void
  enabled?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onNotification, onEvent, enabled = true } = options
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectingRef = useRef(false)

  const connect = useCallback(() => {
    if (isConnectingRef.current || !enabled) return
    
    isConnectingRef.current = true
    
    try {
      // For demo: simulate WebSocket with mock events
      // In production, replace with actual WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      
      // For now, we'll simulate WebSocket events
      simulateWebSocketEvents()
    } catch (error) {
      console.error('[v0] WebSocket connection error:', error)
      scheduleReconnect()
    }
  }, [enabled])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    isConnectingRef.current = false
  }, [])

  const scheduleReconnect = useCallback(() => {
    reconnectTimeoutRef.current = setTimeout(() => {
      isConnectingRef.current = false
      connect()
    }, 3000)
  }, [connect])

  const simulateWebSocketEvents = () => {
    // Simulate receiving notifications
    const mockNotifications: Notification[] = [
      {
        id: `notif-${Date.now()}`,
        type: 'new-incident',
        title: 'แจ้งเหตุฉุกเฉินใหม่',
        message: 'มีการแจ้งเหตุฉุกเฉินประเภทการแพทย์ที่ Pathum Wan',
        category: 'medical',
        incidentId: `INC-${Date.now()}`,
        read: false,
        timestamp: new Date(),
        agencyId: 'medical-1'
      },
      {
        id: `notif-${Date.now() + 1}`,
        type: 'incident-update',
        title: 'ทีมกู้ภัยกำลังเดินทาง',
        message: 'ทีมกู้ภัยได้รับเรื่องและกำลังเดินทางไปยังจุดเกิดเหตุ ETA 5 นาที',
        read: false,
        timestamp: new Date(Date.now() + 60000),
      }
    ]

    // Simulate events at intervals
    const eventIntervals: NodeJS.Timeout[] = []
    
    mockNotifications.forEach((notif, idx) => {
      const interval = setTimeout(() => {
        if (onNotification) {
          onNotification(notif)
        }
        if (onEvent) {
          onEvent({
            type: notif.type,
            data: notif,
            timestamp: notif.timestamp,
            agencyId: notif.agencyId
          })
        }
      }, (idx + 1) * 2000)
      
      eventIntervals.push(interval)
    })

    // Cleanup on disconnect
    return () => {
      eventIntervals.forEach(interval => clearTimeout(interval))
    }
  }

  useEffect(() => {
    if (enabled) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}
