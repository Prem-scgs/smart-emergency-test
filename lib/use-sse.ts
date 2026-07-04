'use client'

import { useEffect, useRef } from 'react'
import { buildAdminApiHeaders, buildAdminEventsUrl } from './admin-api'
import { getEmergencyApiBaseUrl, getEmergencyApiEventsBaseUrl } from './emergency-api-url'
import { Alert, Notification, SseEvent, type AdminUser } from './types'

interface IncidentEventPayload {
  id: string
  caseNumber?: string
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

interface RecentIncidentsPayload {
  cursor: string
  created: IncidentEventPayload[]
  statusUpdated: Array<{
    id: string
    category: string
    status: string
    statusVersion: number
    updatedAt: string
  }>
}

export interface IncidentStatusUpdatedPayload {
  id: string
  category: string
  fromStatus: string
  status: string
  statusVersion: number
  note: string | null
  updatedAt: string
}

interface UseSseOptions {
  onNotification?: (notification: Notification) => void
  onAlert?: (alert: Alert) => void
  onEvent?: (event: SseEvent) => void
  enabled?: boolean
  user?: AdminUser | null
}

type SseDebugStatus = 'connecting' | 'connected' | 'disconnected'

const POLLING_FALLBACK_INTERVAL_MS = 3000

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

function buildApiUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '')

  if (/^https?:\/\//i.test(base)) {
    return new URL(path, base).toString()
  }

  return `${base}${path}`
}

function isIncidentEventPayload(payload: unknown): payload is IncidentEventPayload {
  if (!payload || typeof payload !== 'object') return false

  const incident = payload as Partial<IncidentEventPayload>
  return (
    typeof incident.id === 'string' &&
    typeof incident.category === 'string' &&
    typeof incident.severity === 'string' &&
    typeof incident.status === 'string' &&
    typeof incident.createdAt === 'string'
  )
}

function isRecentIncidentsPayload(payload: unknown): payload is RecentIncidentsPayload {
  if (!payload || typeof payload !== 'object') return false

  const recent = payload as Partial<RecentIncidentsPayload>
  return (
    typeof recent.cursor === 'string' &&
    Array.isArray(recent.created) &&
    Array.isArray(recent.statusUpdated)
  )
}

export function parseIncidentStatusUpdatedPayload(data: string): IncidentStatusUpdatedPayload {
  const payload = JSON.parse(data) as Partial<IncidentStatusUpdatedPayload>

  if (
    typeof payload.id !== 'string' ||
    typeof payload.category !== 'string' ||
    typeof payload.fromStatus !== 'string' ||
    typeof payload.status !== 'string' ||
    typeof payload.statusVersion !== 'number' ||
    typeof payload.updatedAt !== 'string' ||
    (payload.note !== null && typeof payload.note !== 'string')
  ) {
    throw new Error('Invalid incident status event')
  }

  return payload as IncidentStatusUpdatedPayload
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
    incidentId: payload.caseNumber ?? payload.id,
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
    incidentId: payload.caseNumber ?? payload.id,
    timestamp,
    dismissible: true,
    actionLabel: 'ดูรายละเอียด',
    actionUrl: '/admin/dashboard',
  }

  return { notification, alert }
}

export function useSse(options: UseSseOptions = {}) {
  const { onNotification, onAlert, onEvent, enabled = true, user = null } = options
  const eventSourceRef = useRef<EventSource | null>(null)
  const connectionStateRef = useRef<SseDebugStatus | null>(null)
  const seenIncidentIdsRef = useRef<Set<string>>(new Set())
  const seenStatusVersionsRef = useRef<Set<string>>(new Set())
  const pollingCursorRef = useRef(new Date().toISOString())
  const isPollingRef = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    let isDisposed = false
    seenIncidentIdsRef.current = new Set()
    seenStatusVersionsRef.current = new Set()
    pollingCursorRef.current = new Date().toISOString()
    isPollingRef.current = false
    const eventSource = new EventSource(buildAdminEventsUrl(getEmergencyApiEventsBaseUrl(), user))
    eventSourceRef.current = eventSource

    const setDebugStatus = (status: SseDebugStatus) => {
      if (connectionStateRef.current === status) {
        return
      }

      connectionStateRef.current = status
      emitSseDebugStatus(status)
    }

    const handleIncidentPayload = (payload: IncidentEventPayload, source: 'sse' | 'poll') => {
      if (seenIncidentIdsRef.current.has(payload.id)) {
        return
      }

      seenIncidentIdsRef.current.add(payload.id)

      if (source === 'poll') {
        emitSseDebugEvent('incident.created.poll')
      }

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
    }

    const handleIncidentCreated = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as IncidentEventPayload
        handleIncidentPayload(payload, 'sse')
        emitSseDebugEvent('incident.created')
      } catch (error) {
        console.error('[smart-emergency] failed to parse incident event', error)
      }
    }

    const pollLatestIncidents = async () => {
      if (isPollingRef.current) {
        return
      }

      isPollingRef.current = true
      try {
        const searchParams = new URLSearchParams({
          since: pollingCursorRef.current,
          limit: '50',
        })
        const response = await fetch(
          buildApiUrl(getEmergencyApiBaseUrl(), `/api/incidents/recent?${searchParams.toString()}`),
          {
            headers: buildAdminApiHeaders(user),
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as unknown
        if (!isRecentIncidentsPayload(payload)) {
          return
        }

        const newIncidents = payload.created
          .filter(isIncidentEventPayload)
          .filter((incident) => !seenIncidentIdsRef.current.has(incident.id))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

        for (const incident of newIncidents) {
          handleIncidentPayload(incident, 'poll')
        }

        for (const statusUpdate of payload.statusUpdated) {
          const versionKey = `${statusUpdate.id}:${statusUpdate.statusVersion}`
          if (seenStatusVersionsRef.current.has(versionKey)) {
            continue
          }

          seenStatusVersionsRef.current.add(versionKey)
          window.dispatchEvent(
            new CustomEvent('smart-emergency:incident-status-updated', {
              detail: statusUpdate,
            })
          )
          emitSseDebugEvent('incident.status_updated.poll')
        }

        pollingCursorRef.current = payload.cursor
      } catch (error) {
        if (!isDisposed) {
          console.error('[smart-emergency] polling fallback failed', error)
        }
      } finally {
        isPollingRef.current = false
      }
    }

    const handleIncidentStatusUpdated = (event: MessageEvent<string>) => {
      try {
        const payload = parseIncidentStatusUpdatedPayload(event.data)
        const versionKey = `${payload.id}:${payload.statusVersion}`
        if (seenStatusVersionsRef.current.has(versionKey)) {
          return
        }

        seenStatusVersionsRef.current.add(versionKey)
        window.dispatchEvent(
          new CustomEvent('smart-emergency:incident-status-updated', {
            detail: payload,
          })
        )
        emitSseDebugEvent('incident.status_updated')
      } catch (error) {
        console.error('[smart-emergency] failed to parse incident status event', error)
      }
    }

    setDebugStatus('connecting')

    eventSource.onopen = () => {
      setDebugStatus('connected')
    }

    eventSource.addEventListener('incident.created', handleIncidentCreated as EventListener)
    eventSource.addEventListener(
      'incident.status_updated',
      handleIncidentStatusUpdated as EventListener
    )

    eventSource.onerror = () => {
      if (isDisposed) {
        return
      }

      // Native EventSource already reconnects by itself and honors `retry:` from the server.
      setDebugStatus('disconnected')
      console.error('[smart-emergency] event stream disconnected, waiting for automatic reconnect...')
    }

    void pollLatestIncidents()
    const pollingFallbackInterval = window.setInterval(() => {
      void pollLatestIncidents()
    }, POLLING_FALLBACK_INTERVAL_MS)

    return () => {
      isDisposed = true
      window.clearInterval(pollingFallbackInterval)
      eventSource.removeEventListener('incident.created', handleIncidentCreated as EventListener)
      eventSource.removeEventListener(
        'incident.status_updated',
        handleIncidentStatusUpdated as EventListener
      )
      eventSource.close()

      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null
      }
    }
  }, [enabled, onAlert, onEvent, onNotification, user?.role, user?.agency?.category])

  return {
    isConnected: eventSourceRef.current?.readyState === 1,
  }
}
