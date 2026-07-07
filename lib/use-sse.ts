'use client'

import { useEffect, useRef } from 'react'
import { buildAdminApiHeaders, buildAdminEventsUrl } from '../shared/api/admin-api.ts'
import type { AdminLanguage } from './admin-i18n'
import { getEmergencyApiBaseUrl, getEmergencyApiEventsBaseUrl } from '@/shared/config/emergency-api'
import {
  buildRealtimeApiUrl,
  isIncidentEventPayload,
  isRecentIncidentsPayload,
  parseIncidentStatusUpdatedPayload,
  POLLING_FALLBACK_INTERVAL_MS,
  type IncidentEventPayload,
  type SseDebugStatus,
} from '@/shared/realtime/incident-events'
import {
  buildRealtimeIncidentArtifacts,
  shouldCreateActionableAlert,
  type Alert,
  type Notification,
  type SseEvent,
} from '@/features/incident-alert'
import type { AdminUser } from '@/shared/auth'

export type { IncidentEventPayload } from '@/shared/realtime/incident-events'
export { buildRealtimeIncidentArtifacts } from '@/features/incident-alert'

interface UseSseOptions {
  onNotification?: (notification: Notification) => void
  onAlert?: (alert: Alert) => void
  onEvent?: (event: SseEvent) => void
  formatAreaText?: (payload: IncidentEventPayload, language: AdminLanguage) => string | null | undefined
  enabled?: boolean
  user?: AdminUser | null
  language?: AdminLanguage
}

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

export function useSse(options: UseSseOptions = {}) {
  const {
    onNotification,
    onAlert,
    onEvent,
    formatAreaText,
    enabled = true,
    user = null,
    language = 'th',
  } = options
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

      const areaText = formatAreaText?.(payload, language)
      const { notification, alert } = buildRealtimeIncidentArtifacts(payload, language, areaText)

      // viewer ต้องเห็นข้อมูลสดแบบ passive เท่านั้น ไม่เด้ง popup/sound/actionable notification
      if (shouldCreateActionableAlert(user)) {
        onNotification?.(notification)
        onAlert?.(alert)
      }
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
          buildRealtimeApiUrl(getEmergencyApiBaseUrl(), `/api/incidents/recent?${searchParams.toString()}`),
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
  }, [
    enabled,
    formatAreaText,
    language,
    onAlert,
    onEvent,
    onNotification,
    user?.role,
    user?.agency?.category,
  ])

  return {
    isConnected: eventSourceRef.current?.readyState === 1,
  }
}
