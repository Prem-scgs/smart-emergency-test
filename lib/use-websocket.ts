'use client'

import { useEffect, useRef } from 'react'
import { Alert, Notification, WebSocketEvent } from './types'

const EVENTS_URL = 'http://localhost:4000/api/events'

interface IncidentEventPayload {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  areaName?: string | null
  province?: string | null
  district?: string | null
  createdAt: string
}

interface UseWebSocketOptions {
  onNotification?: (notification: Notification) => void
  onAlert?: (alert: Alert) => void
  onEvent?: (event: WebSocketEvent) => void
  enabled?: boolean
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    police: 'ตำรวจ',
    medical: 'การแพทย์',
    fire: 'ดับเพลิง',
    rescue: 'กู้ภัย',
    flood: 'ภัยพิบัติ',
    'road-accident': 'จราจร',
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

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onNotification, onAlert, onEvent, enabled = true } = options
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    const eventSource = new EventSource(EVENTS_URL)
    eventSourceRef.current = eventSource

    const handleIncidentCreated = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as IncidentEventPayload
        const timestamp = new Date(payload.createdAt)
        const agencyId = payload.category
        const areaText = buildAreaText(payload)
        const categoryText = categoryLabel(payload.category)

        onNotification?.({
          id: `incident-${payload.id}`,
          type: 'new-incident',
          title: 'มีเหตุใหม่เข้าระบบ',
          message: `${categoryText} - ${areaText}`,
          agencyId,
          category: payload.category as Notification['category'],
          incidentId: payload.id,
          read: false,
          timestamp,
          actionUrl: '/admin/dashboard',
        })

        if (payload.severity === 'high' || payload.severity === 'critical') {
          onAlert?.({
            id: `alert-${payload.id}`,
            severity: payload.severity === 'critical' ? 'critical' : 'warning',
            title: payload.severity === 'critical' ? 'เหตุวิกฤตใหม่' : 'เหตุเร่งด่วนใหม่',
            message: `${categoryText} ในพื้นที่ ${areaText}`,
            description: `ระดับความรุนแรง ${severityLabel(payload.severity)} สถานะ ${payload.status}`,
            agencyId,
            category: payload.category as Alert['category'],
            timestamp,
            dismissible: true,
            actionLabel: 'ดูรายละเอียด',
            actionUrl: '/admin/dashboard',
          })
        }

        onEvent?.({
          type: 'new-incident',
          data: payload,
          timestamp,
          agencyId,
        })
      } catch (error) {
        console.error('[smart-emergency] failed to parse incident event', error)
      }
    }

    eventSource.addEventListener('incident.created', handleIncidentCreated as EventListener)
    eventSource.onerror = () => {
      console.error('[smart-emergency] event stream disconnected')
    }

    return () => {
      eventSource.removeEventListener('incident.created', handleIncidentCreated as EventListener)
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [enabled, onAlert, onEvent, onNotification])

  return {
    isConnected: eventSourceRef.current?.readyState === 1,
  }
}
