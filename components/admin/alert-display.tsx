'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

import { useNotifications } from '@/lib/notification-context'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

function playAlertTone(severity: string) {
  if (typeof window === 'undefined') return

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) return

  const context = new AudioContextClass()
  const pattern =
    severity === 'critical'
      ? [
          { frequency: 880, duration: 0.16, delay: 0 },
          { frequency: 880, duration: 0.16, delay: 0.22 },
          { frequency: 660, duration: 0.22, delay: 0.44 },
        ]
      : [
          { frequency: 720, duration: 0.14, delay: 0 },
          { frequency: 540, duration: 0.18, delay: 0.2 },
        ]

  const now = context.currentTime

  pattern.forEach(note => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(0.0001, now + note.delay)
    gain.gain.exponentialRampToValueAtTime(0.16, now + note.delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now + note.delay)
    oscillator.stop(now + note.delay + note.duration)
  })

  window.setTimeout(() => {
    void context.close()
  }, 1200)
}

export function AlertDisplay() {
  const { alerts, clearAlert } = useNotifications()
  const [activeAlertIndex, setActiveAlertIndex] = useState(0)

  const currentAlert = alerts[activeAlertIndex]

  useEffect(() => {
    if (!currentAlert) return
    playAlertTone(currentAlert.severity)
  }, [currentAlert?.id, currentAlert?.severity])

  useEffect(() => {
    if (activeAlertIndex >= alerts.length) {
      setActiveAlertIndex(Math.max(alerts.length - 1, 0))
    }
  }, [activeAlertIndex, alerts.length])

  if (!currentAlert) return null

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-red-600 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-800',
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
          borderColor: 'border-amber-200 dark:border-amber-800',
        }
      case 'info':
      default:
        return {
          icon: Info,
          color: 'text-blue-600 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-800',
        }
    }
  }

  const config = getSeverityConfig(currentAlert.severity)
  const Icon = config.icon

  return (
    <AlertDialog
      open={!!currentAlert}
      onOpenChange={open => {
        if (!open) {
          clearAlert(currentAlert.id)
        }
      }}
    >
      <AlertDialogContent className={`border-2 ${config.borderColor}`}>
        <div className="flex items-start gap-4">
          <Icon className={`mt-1 h-6 w-6 shrink-0 ${config.color}`} />
          <div className="flex-1">
            <AlertDialogHeader className="p-0">
              <AlertDialogTitle className="text-lg">{currentAlert.title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm">
                {currentAlert.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {currentAlert.description && (
              <p className="mt-3 rounded bg-muted/50 p-3 text-sm text-muted-foreground">
                {currentAlert.description}
              </p>
            )}
          </div>
          {currentAlert.dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="-mt-1 h-6 w-6"
              onClick={() => {
                clearAlert(currentAlert.id)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel
            onClick={() => {
              clearAlert(currentAlert.id)
            }}
          >
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
        </AlertDialogFooter>

        {alerts.length > 1 && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            แจ้งเตือน {activeAlertIndex + 1} จาก {alerts.length}
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
