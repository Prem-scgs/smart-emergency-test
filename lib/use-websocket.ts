'use client'

import { useEffect, useRef } from 'react'
import { buildAdminEventsUrl } from './admin-api'
import { Alert, Notification, WebSocketEvent, type AdminUser } from './types'

interface IncidentEventPayload {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  areaName?: string | null
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
  createdAt: string
}

interface UseWebSocketOptions {
  onNotification?: (notification: Notification) => void
  onAlert?: (alert: Alert) => void
  onEvent?: (event: WebSocketEvent) => void
  enabled?: boolean
  user?: AdminUser | null
}

type SseDebugStatus = 'connecting' | 'connected' | 'disconnected'

function emitSseDebugStatus(status: SseDebugStatus) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('smart-emergency:sse-status', {
      detail: {
        status,
        timestamp: new Date().toISOString(),
      },
    })
  )
}

function emitSseDebugEvent(eventType: string) {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent('smart-emergency:sse-event', {
      detail: {
        eventType,
        timestamp: new Date().toISOString(),
      },
    })
  )
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    police: 'ตำรวจ',
    medical: 'แพทย์',
    fire: 'ดับเพลิง',
    rescue: 'กู้ภัย',
    flood: 'น้ำท่วม',
    'road-accident': 'อุบัติเหตุทางถนน',
  }

  return labels[category] ?? category
}

function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    critical: 'วิกฤต',
    high: 'สูง',
    medium: 'ปานกลาง',
    low: 'ต่ำ',
  }

  return labels[severity] ?? severity
}

function buildAreaText(payload: IncidentEventPayload) {
  if (payload.areaName) return payload.areaName
  if (payload.district && payload.province) return `${payload.district} ${payload.province}`
  return payload.province ?? 'ไม่ระบุพื้นที่'
}

function alertSeverityForIncident(severity: IncidentEventPayload['severity']): Alert['severity'] {
  if (severity === 'critical') return 'critical'
  if (severity === 'high') return 'warning'
  return 'info'
}

export function buildRealtimeIncidentArtifacts(payload: IncidentEventPayload): {
  notification: Notification
  alert: Alert
} {
  const timestamp = new Date(payload.createdAt)
  const agencyId = payload.category
  const areaText = buildAreaText(payload)
  const categoryText = categoryLabel(payload.category)
  const alertSeverity = alertSeverityForIncident(payload.severity)

  const notification: Notification = {
    id: `incident-${payload.id}`,
    type: 'new-incident',
    title: 'มีเหตุใหม่เข้าระบบ',
    message: `${categoryText} - ${areaText}`,
    agencyId,
    category: payload.category as Notification['category'],
    incidentId: payload.id,
    provinceCode: payload.provinceCode ?? undefined,
    districtCode: payload.districtCode ?? undefined,
    province: payload.province ?? undefined,
    district: payload.district ?? undefined,
    read: false,
    timestamp,
    actionUrl: '/admin/dashboard',
  }

  const alert: Alert = {
    id: `alert-${payload.id}`,
    severity: alertSeverity,
    title:
      alertSeverity === 'critical'
        ? 'เหตุวิกฤตใหม่'
        : alertSeverity === 'warning'
          ? 'มีเหตุเร่งด่วนใหม่'
          : 'มีเหตุแจ้งเข้าใหม่',
    message: `${categoryText} ในพื้นที่ ${areaText}`,
    description: `ระดับความรุนแรง ${severityLabel(payload.severity)} สถานะ ${payload.status}`,
    agencyId,
    category: payload.category as Alert['category'],
    timestamp,
    dismissible: true,
    actionLabel: 'ดูรายละเอียด',
    actionUrl: '/admin/dashboard',
  }

  return { notification, alert }
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onNotification, onAlert, onEvent, enabled = true, user = null } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    let isDisposed = false

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const connect = () => {
      if (isDisposed) return

      clearReconnectTimer()
      emitSseDebugStatus('connecting')

      const eventSource = new EventSource(buildAdminEventsUrl('http://localhost:4000', user))
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        emitSseDebugStatus('connected')
      }

      const handleIncidentCreated = (event: MessageEvent<string>) => {
        try {
          const payload = JSON.parse(event.data) as IncidentEventPayload
          const { notification, alert } = buildRealtimeIncidentArtifacts(payload)

          onNotification?.(notification)
          onAlert?.(alert)
          onEvent?.({
            type: 'new-incident',
            data: payload,
            timestamp: notification.timestamp,
            agencyId: notification.agencyId,
          })

          window.dispatchEvent(
            new CustomEvent('smart-emergency:incident-created', {
              detail: payload,
            })
          )
          emitSseDebugEvent('incident.created')
        } catch (error) {
          console.error('[smart-emergency] failed to parse incident event', error)
        }
      }

      eventSource.addEventListener('incident.created', handleIncidentCreated as EventListener)

      eventSource.onerror = () => {
        eventSource.removeEventListener('incident.created', handleIncidentCreated as EventListener)
        eventSource.close()

        if (eventSourceRef.current === eventSource) {
          eventSourceRef.current = null
        }

        if (!isDisposed) {
          emitSseDebugStatus('disconnected')
          console.error('[smart-emergency] event stream disconnected, reconnecting...')
          reconnectTimerRef.current = window.setTimeout(() => {
            connect()
          }, 2000)
        }
      }
    }

    connect()

    return () => {
      isDisposed = true
      clearReconnectTimer()
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [enabled, onAlert, onEvent, onNotification, user])

  return {
    isConnected: eventSourceRef.current?.readyState === 1,
  }
}
