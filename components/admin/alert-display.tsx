'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Info } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ADMIN_ALERT_PREFERENCES_EVENT,
  DEFAULT_ADMIN_ALERT_PREFERENCES,
  getStoredAdminAlertPreferences,
  type AdminAlertPreferences,
  type AlertTonePreset,
} from '@/lib/admin-alert-preferences'
import { useNotifications } from '@/lib/notification-context'
import { cn } from '@/lib/utils'

function playAlertTone(severity: string, preset: AlertTonePreset) {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const masterGain = context.createGain()
  const compressor = context.createDynamicsCompressor()
  const now = context.currentTime

  compressor.threshold.setValueAtTime(-20, now)
  compressor.knee.setValueAtTime(10, now)
  compressor.ratio.setValueAtTime(8, now)
  compressor.attack.setValueAtTime(0.003, now)
  compressor.release.setValueAtTime(0.18, now)

  const pattern =
    preset === 'siren-pulse'
      ? severity === 'critical'
        ? [
            { frequency: 920, duration: 0.18, delay: 0, gain: 0.18, type: 'sawtooth' as const },
            { frequency: 680, duration: 0.18, delay: 0.22, gain: 0.18, type: 'sawtooth' as const },
            { frequency: 920, duration: 0.2, delay: 0.48, gain: 0.18, type: 'sawtooth' as const },
          ]
        : [
            { frequency: 840, duration: 0.14, delay: 0, gain: 0.14, type: 'triangle' as const },
            { frequency: 620, duration: 0.14, delay: 0.2, gain: 0.14, type: 'triangle' as const },
          ]
      : preset === 'soft-chime'
        ? [
            { frequency: 740, duration: 0.12, delay: 0, gain: 0.1, type: 'sine' as const },
            { frequency: 988, duration: 0.16, delay: 0.18, gain: 0.08, type: 'sine' as const },
          ]
        : severity === 'critical'
          ? [
              { frequency: 940, duration: 0.12, delay: 0, gain: 0.16, type: 'triangle' as const },
              { frequency: 760, duration: 0.12, delay: 0.16, gain: 0.16, type: 'triangle' as const },
              { frequency: 940, duration: 0.14, delay: 0.34, gain: 0.16, type: 'triangle' as const },
            ]
          : [
              { frequency: 820, duration: 0.1, delay: 0, gain: 0.13, type: 'triangle' as const },
              { frequency: 620, duration: 0.12, delay: 0.16, gain: 0.13, type: 'triangle' as const },
            ]

  masterGain.gain.setValueAtTime(
    preset === 'soft-chime' ? 0.26 : preset === 'siren-pulse' ? 0.46 : 0.34,
    now
  )
  masterGain.connect(compressor)
  compressor.connect(context.destination)

  pattern.forEach(note => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = note.type
    oscillator.frequency.setValueAtTime(note.frequency, now + note.delay)
    gain.gain.setValueAtTime(0.0001, now + note.delay)
    gain.gain.exponentialRampToValueAtTime(note.gain, now + note.delay + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration)

    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start(now + note.delay)
    oscillator.stop(now + note.delay + note.duration)
  })

  window.setTimeout(() => {
    void context.close()
  }, 1400)
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        icon: AlertCircle,
        mediaClassName: 'bg-destructive/10 text-destructive',
        badgeVariant: 'destructive' as const,
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        mediaClassName: 'bg-secondary text-secondary-foreground',
        badgeVariant: 'secondary' as const,
      }
    case 'info':
    default:
      return {
        icon: Info,
        mediaClassName: 'bg-muted text-foreground',
        badgeVariant: 'outline' as const,
      }
  }
}

export function AlertDisplay() {
  const { alerts, clearAlert } = useNotifications()
  const [activeAlertIndex, setActiveAlertIndex] = useState(0)
  const [preferences, setPreferences] = useState<AdminAlertPreferences>(
    DEFAULT_ADMIN_ALERT_PREFERENCES
  )

  const currentAlert = alerts[activeAlertIndex]

  useEffect(() => {
    setPreferences(getStoredAdminAlertPreferences())

    function handlePreferencesChanged(event: Event) {
      const detail = (event as CustomEvent<AdminAlertPreferences>).detail
      if (detail) {
        setPreferences(detail)
      } else {
        setPreferences(getStoredAdminAlertPreferences())
      }
    }

    window.addEventListener(ADMIN_ALERT_PREFERENCES_EVENT, handlePreferencesChanged)
    window.addEventListener('storage', handlePreferencesChanged)

    return () => {
      window.removeEventListener(ADMIN_ALERT_PREFERENCES_EVENT, handlePreferencesChanged)
      window.removeEventListener('storage', handlePreferencesChanged)
    }
  }, [])

  useEffect(() => {
    if (!currentAlert || !preferences.enabled) return
    playAlertTone(currentAlert.severity, preferences.tone)
  }, [currentAlert?.id, currentAlert?.severity, preferences.enabled, preferences.tone])

  useEffect(() => {
    if (activeAlertIndex >= alerts.length) {
      setActiveAlertIndex(Math.max(alerts.length - 1, 0))
    }
  }, [activeAlertIndex, alerts.length])

  if (!currentAlert) return null

  const config = getSeverityConfig(currentAlert.severity)
  const Icon = config.icon

  return (
    <AlertDialog
      open={Boolean(currentAlert)}
      onOpenChange={open => {
        if (!open && currentAlert) {
          clearAlert(currentAlert.id)
        }
      }}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogMedia className={cn('size-12 rounded-xl', config.mediaClassName)}>
            <Icon />
          </AlertDialogMedia>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <AlertDialogTitle>{currentAlert.title}</AlertDialogTitle>
            <Badge variant={config.badgeVariant}>เหตุใหม่</Badge>
          </div>

          <AlertDialogDescription className="text-sm leading-6">
            {currentAlert.message}
          </AlertDialogDescription>

          {currentAlert.description && (
            <AlertDialogDescription className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm leading-6 text-foreground">
              {currentAlert.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <AlertDialogFooter className="items-center sm:justify-between">
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
            {alerts.length > 1 ? (
              <>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setActiveAlertIndex(index => Math.max(index - 1, 0))}
                    disabled={activeAlertIndex === 0}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setActiveAlertIndex(index => Math.min(index + 1, alerts.length - 1))
                    }
                    disabled={activeAlertIndex >= alerts.length - 1}
                  >
                    <ChevronRight />
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {activeAlertIndex + 1} / {alerts.length}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">แจ้งเตือนล่าสุด</span>
            )}
          </div>

          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <AlertDialogCancel onClick={() => clearAlert(currentAlert.id)}>
              ปิด
            </AlertDialogCancel>
            {currentAlert.actionLabel && (
              <AlertDialogAction
                onClick={() => {
                  if (currentAlert.actionUrl) {
                    window.location.href = currentAlert.actionUrl
                  }
                  clearAlert(currentAlert.id)
                }}
              >
                {currentAlert.actionLabel}
              </AlertDialogAction>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
