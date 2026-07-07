import { Check, Circle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { useAdminI18n } from '@/shared/i18n/admin'
import {
  buildIncidentTrackingSteps,
  type IncidentTrackingHistoryEntry,
  type IncidentWorkflowStatus,
} from '@/entities/incident'
import { cn } from '@/lib/utils'

interface IncidentStatusTimelineProps {
  status: IncidentWorkflowStatus
  history: IncidentTrackingHistoryEntry[]
}

export function IncidentStatusTimeline({ status, history }: IncidentStatusTimelineProps) {
  const { language, t } = useAdminI18n()
  const steps = buildIncidentTrackingSteps(status, history)

  return (
    <ol className="flex flex-col gap-3">
      {steps.map(step => (
        <li key={step.status} className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border',
              step.isCompleted || step.isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground'
            )}
          >
            {step.isCompleted ? <Check /> : <Circle />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {language === 'en' ? step.label : step.labelTh}
              </p>
              {step.isActive ? <Badge variant="secondary">{t('incidentTimelineCurrent')}</Badge> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'en' ? step.descriptionEn : step.description}
            </p>
            {step.timestamp ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {step.timestamp.toLocaleString(language === 'en' ? 'en-US' : 'th-TH')}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
