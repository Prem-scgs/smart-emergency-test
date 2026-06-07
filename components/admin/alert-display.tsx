'use client'

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
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function AlertDisplay() {
  const { alerts, clearAlert } = useNotifications()
  const [activeAlertIndex, setActiveAlertIndex] = useState(0)

  const currentAlert = alerts[activeAlertIndex]

  if (!currentAlert) return null

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: AlertCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-800',
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950/30',
          borderColor: 'border-amber-200 dark:border-amber-800',
        }
      case 'info':
      default:
        return {
          icon: Info,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
        }
    }
  }

  const config = getSeverityConfig(currentAlert.severity)
  const Icon = config.icon

  return (
    <AlertDialog open={!!currentAlert} onOpenChange={(open) => {
      if (!open) {
        clearAlert(currentAlert.id)
        if (alerts.length > 1) {
          setActiveAlertIndex(Math.min(activeAlertIndex, alerts.length - 2))
        }
      }
    }}>
      <AlertDialogContent className={`border-2 ${config.borderColor}`}>
        <div className="flex items-start gap-4">
          <Icon className={`h-6 w-6 ${config.color} flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <AlertDialogHeader className="p-0">
              <AlertDialogTitle className="text-lg">{currentAlert.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-sm mt-2">
                {currentAlert.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {currentAlert.description && (
              <p className="text-sm text-muted-foreground mt-3 p-3 rounded bg-muted/50">
                {currentAlert.description}
              </p>
            )}
          </div>
          {currentAlert.dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={() => {
                clearAlert(currentAlert.id)
                if (alerts.length > 1) {
                  setActiveAlertIndex(Math.min(activeAlertIndex, alerts.length - 2))
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={() => {
            clearAlert(currentAlert.id)
            if (alerts.length > 1) {
              setActiveAlertIndex(Math.min(activeAlertIndex, alerts.length - 2))
            }
          }}>
            ปิด
          </AlertDialogCancel>
          {currentAlert.actionLabel && (
            <AlertDialogAction onClick={() => {
              if (currentAlert.actionUrl) {
                window.location.href = currentAlert.actionUrl
              }
              clearAlert(currentAlert.id)
            }}>
              {currentAlert.actionLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>

        {/* Alert counter */}
        {alerts.length > 1 && (
          <div className="text-xs text-center text-muted-foreground mt-2">
            แจ้งเตือน {activeAlertIndex + 1} จาก {alerts.length}
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
