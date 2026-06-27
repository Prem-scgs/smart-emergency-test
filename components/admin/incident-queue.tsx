'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAdminI18n, type AdminI18nKey, type AdminLanguage } from '@/lib/admin-i18n'
import { getIncidentTrackingStatusMeta, type IncidentWorkflowStatus } from '@/lib/incident-tracking'
import { cn } from '@/lib/utils'

export interface IncidentQueueItem {
  id: string
  category: string
  status: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  areaName?: string | null
  district?: string | null
  province?: string | null
  createdAt: string
}

interface IncidentQueueProps {
  incidents: IncidentQueueItem[]
  selectedIncidentId: string | null
  categoryLabels: Record<string, string>
  isLoading?: boolean
  onSelect: (incidentId: string) => void
}

const WORKFLOW_STATUSES = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

function statusLabel(
  status: string,
  language: AdminLanguage,
  t: (key: AdminI18nKey) => string
) {
  if (WORKFLOW_STATUSES.has(status as IncidentWorkflowStatus)) {
    const meta = getIncidentTrackingStatusMeta(status as IncidentWorkflowStatus)
    return language === 'en' ? meta.label : meta.labelTh
  }
  return status === 'open' ? t('incidentStatusOpen') : status
}

function locationLabel(incident: IncidentQueueItem, fallback: string) {
  return (
    incident.areaName ||
    [incident.district, incident.province].filter(Boolean).join(' ') ||
    fallback
  )
}

export function IncidentQueue({
  incidents,
  selectedIncidentId,
  categoryLabels,
  isLoading = false,
  onSelect,
}: IncidentQueueProps) {
  const { language, t } = useAdminI18n()

  return (
    <Card className="min-h-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t('incidentQueueTitle')}</CardTitle>
            <CardDescription>{t('incidentQueueDescription')}</CardDescription>
          </div>
          <Badge variant="secondary">
            {incidents.length.toLocaleString()} {t('incidentQueueCaseUnit')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[460px]">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t('incidentQueueLoading')}</p>
          ) : incidents.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">{t('incidentQueueEmpty')}</p>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {incidents.map(incident => (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() => onSelect(incident.id)}
                  className={cn(
                    'flex w-full flex-col gap-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted',
                    selectedIncidentId === incident.id && 'bg-muted'
                  )}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <p className="text-sm font-medium">
                      {categoryLabels[incident.category] ?? incident.category}
                    </p>
                    <Badge variant={incident.status === 'closed' ? 'outline' : 'secondary'}>
                      {statusLabel(incident.status, language, t)}
                    </Badge>
                  </div>
                  <p className="w-full truncate text-xs text-muted-foreground">
                    {locationLabel(incident, t('incidentNoArea'))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(incident.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'th-TH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
