'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  History,
  Filter,
  CheckCircle2,
  Clock,
  PhoneMissed,
  PhoneOff,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Calendar,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLocationDisplayName, useLocationLookupMaps } from '@/lib/reference-locations'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/lib/reference-categories'
import { getOrCreateReporterSessionId } from '@/lib/reporter-session'
import { getUserFacingIncidentDescription } from '@/entities/incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { getMobileIncidentDisplayNumber } from '@/lib/mobile-tracking'
import { CallStatus, EmergencyCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

interface IncidentHistoryItem {
  id: string
  caseNumber?: string | null
  category: EmergencyCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  description: string | null
  agencyName: string | null
  provinceCode?: string | null
  province: string | null
  districtCode?: string | null
  district: string | null
  callStatus: CallStatus | null
  createdAt: string
}

interface IncidentHistoryScreenProps {
  onBack: () => void
  onViewTracking?: (incidentId: string, category: EmergencyCategory) => void
}

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  connected: { icon: CheckCircle2, color: 'text-success', label: 'Connected' },
  busy: { icon: Clock, color: 'text-warning', label: 'Busy' },
  'no-answer': { icon: PhoneMissed, color: 'text-muted-foreground', label: 'No Answer' },
  'wrong-number': { icon: PhoneOff, color: 'text-destructive', label: 'Wrong Number' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
}

export function IncidentHistoryScreen({ onBack, onViewTracking }: IncidentHistoryScreenProps) {
  const { categories } = useReferenceCategories()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const [filter, setFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')
  const [historyItems, setHistoryItems] = useState<IncidentHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true)
        setError(null)
        const sessionId = getOrCreateReporterSessionId()
        const response = await fetch(getEmergencyApiBaseUrl() + '/api/incidents/history?sessionId=' + encodeURIComponent(sessionId))

        if (!response.ok) {
          throw new Error('Failed to load incident history')
        }

        setHistoryItems((await response.json()) as IncidentHistoryItem[])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load incident history')
      } finally {
        setIsLoading(false)
      }
    }

    loadHistory()
  }, [])

  const filteredLogs = useMemo(() => {
    return historyItems.filter(log => {
      if (filter !== 'all' && log.category !== filter) return false
      if (statusFilter !== 'all' && (log.callStatus ?? 'cancelled') !== statusFilter) return false
      return true
    })
  }, [filter, historyItems, statusFilter])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getHistoryLocationLabel = (log: IncidentHistoryItem) => {
    const province = log.provinceCode ? provinceByCode[log.provinceCode] : undefined
    const district = log.districtCode ? districtByCode[log.districtCode] : undefined
    const provinceLabel = getLocationDisplayName(province) || log.province || ''
    const districtLabel = getLocationDisplayName(district) || log.district || ''
    return [districtLabel, provinceLabel].filter(Boolean).join(', ') || 'Unknown location'
  }

  return (
    <div className="flex flex-col min-h-screen bg-background safe-area-inset">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Incident History</h1>
            <p className="text-xs text-muted-foreground">{filteredLogs.length} records</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={val => setFilter(val as EmergencyCategory | 'all')}>
            <SelectTrigger className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={val => setStatusFilter(val as CallStatus | 'all')}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="no-answer">No Answer</SelectItem>
              <SelectItem value="wrong-number">Wrong Number</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading history...</div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No incident history found for this device session</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const category = categories.find(c => c.id === log.category)
              const resolvedStatus = log.callStatus ?? 'cancelled'
              const StatusIcon = statusConfig[resolvedStatus].icon
              const userFacingDescription = getUserFacingIncidentDescription(log.description)

              return (
                <Card
                  key={log.id}
                  className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onViewTracking?.(log.id, log.category)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={cn('text-xs', category?.bgColor, category?.color)}>
                            {getCategoryDisplayLabel(category, false) || log.category}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs', statusConfig[resolvedStatus].color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[resolvedStatus].label}
                          </Badge>
                        </div>

                        <h3 className="font-medium text-foreground">{log.agencyName ?? 'Emergency desk'}</h3>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          Case: {getMobileIncidentDisplayNumber(log)}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {getHistoryLocationLabel(log)}
                        </div>

                        {userFacingDescription ? (
                          <p className="text-xs text-muted-foreground mt-2 italic">{userFacingDescription}</p>
                        ) : null}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
