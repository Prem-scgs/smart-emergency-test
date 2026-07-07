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
  openIncidentDetailFromAlert,
  playAlertTone,
  type AdminAlertPreferences,
} from '@/features/incident-alert'
import { useNotifications } from '@/features/incident-alert/model/notification-context'
import { useAdminI18n } from '@/lib/admin-i18n'
import { cn } from '@/lib/utils'

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
  const { t } = useAdminI18n()
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
    playAlertTone(preferences.tone)
  }, [currentAlert?.id, preferences.enabled, preferences.tone])

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
            <Badge variant={config.badgeVariant}>{t('alertNewIncidentBadge')}</Badge>
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
              <span className="text-xs text-muted-foreground">{t('alertLatest')}</span>
            )}
          </div>

          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <AlertDialogCancel onClick={() => clearAlert(currentAlert.id)}>
              {t('alertClose')}
            </AlertDialogCancel>
            {currentAlert.actionLabel && (
              <AlertDialogAction
                onClick={() => {
                  const incidentId = currentAlert.incidentId
                  const actionUrl = currentAlert.actionUrl

                  clearAlert(currentAlert.id)

                  window.setTimeout(() => {
                    if (incidentId) {
                      openIncidentDetailFromAlert(incidentId)
                    } else if (actionUrl) {
                      window.location.href = actionUrl
                    }
                  }, 0)
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
