'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, Filter, CheckCircle2, Clock, PhoneMissed, PhoneOff, XCircle, ChevronRight, ArrowLeft, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLocationDisplayName, useLocationLookupMaps } from '@/shared/location'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/shared/reference'
import { getOrCreateReporterSessionId } from '@/features/mobile-incident'
import { getUserFacingIncidentDescription } from '@/entities/incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import { getMobileIncidentDisplayNumber } from '@/shared/realtime/mobile-tracking'
import type { EmergencyCategory } from '@/entities/incident'
import type { CallStatus } from '@/entities/call'
import { useMobileI18n, type MobileI18nKey } from '@/shared/i18n/mobile'
import { cn } from '@/shared/utils'

interface IncidentHistoryItem { id: string; caseNumber?: string | null; category: EmergencyCategory; severity: 'low' | 'medium' | 'high' | 'critical'; status: string; description: string | null; agencyName: string | null; provinceCode?: string | null; province: string | null; districtCode?: string | null; district: string | null; callStatus: CallStatus | null; createdAt: string }
interface IncidentHistoryScreenProps { onBack: () => void; onViewTracking?: (incidentId: string, category: EmergencyCategory) => void }

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; labelKey: MobileI18nKey }> = {
  connected: { icon: CheckCircle2, color: 'text-success', labelKey: 'callConnected' }, busy: { icon: Clock, color: 'text-warning', labelKey: 'callBusy' }, 'no-answer': { icon: PhoneMissed, color: 'text-muted-foreground', labelKey: 'callNoAnswer' }, 'wrong-number': { icon: PhoneOff, color: 'text-destructive', labelKey: 'callWrongNumber' }, cancelled: { icon: XCircle, color: 'text-muted-foreground', labelKey: 'callCancelled' },
}

export function IncidentHistoryScreen({ onBack, onViewTracking }: IncidentHistoryScreenProps) {
  const { categories } = useReferenceCategories()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const { language, locale, t } = useMobileI18n()
  const preferThai = language === 'th'
  const [filter, setFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')
  const [historyItems, setHistoryItems] = useState<IncidentHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void (async () => { try { setIsLoading(true); setError(null); const response = await fetch(getEmergencyApiBaseUrl() + '/api/incidents/history?sessionId=' + encodeURIComponent(getOrCreateReporterSessionId())); if (!response.ok) throw new Error(t('historyLoadFailed')); setHistoryItems((await response.json()) as IncidentHistoryItem[]) } catch (loadError) { setError(loadError instanceof Error ? loadError.message : t('historyLoadFailed')) } finally { setIsLoading(false) } })() }, [t])

  const filteredLogs = useMemo(() => historyItems.filter(log => (filter === 'all' || log.category === filter) && (statusFilter === 'all' || (log.callStatus ?? 'cancelled') === statusFilter)), [filter, historyItems, statusFilter])
  const dateOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: language === 'en' }
  const getHistoryLocationLabel = (log: IncidentHistoryItem) => { const province = log.provinceCode ? provinceByCode[log.provinceCode] : undefined; const district = log.districtCode ? districtByCode[log.districtCode] : undefined; return [getLocationDisplayName(district, preferThai) || log.district || '', getLocationDisplayName(province, preferThai) || log.province || ''].filter(Boolean).join(', ') || t('historyUnknownLocation') }

  return <div className="flex flex-col min-h-screen bg-background safe-area-inset">
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b"><div className="flex items-center gap-3 p-4"><Button variant="ghost" size="icon" onClick={onBack} aria-label={t('incidentBack')}><ArrowLeft className="h-5 w-5" /></Button><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><History className="h-5 w-5 text-primary" /></div><div><h1 className="font-semibold text-foreground">{t('historyTitle')}</h1><p className="text-xs text-muted-foreground">{t('historyRecords', { count: filteredLogs.length })}</p></div></div></div>
    <div className="p-4 border-b"><div className="flex gap-2"><Select value={filter} onValueChange={value => setFilter(value as EmergencyCategory | 'all')}><SelectTrigger className="flex-1"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder={t('historyCategoryPlaceholder')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('historyAllCategories')}</SelectItem>{categories.map(category => <SelectItem key={category.id} value={category.id}>{getCategoryDisplayLabel(category, preferThai)}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={value => setStatusFilter(value as CallStatus | 'all')}><SelectTrigger className="flex-1"><SelectValue placeholder={t('historyStatusPlaceholder')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('historyAllStatuses')}</SelectItem>{(Object.keys(statusConfig) as CallStatus[]).map(status => <SelectItem key={status} value={status}>{t(statusConfig[status].labelKey)}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="flex-1 overflow-auto"><div className="p-4 space-y-3">{isLoading ? <div className="text-center py-12 text-muted-foreground">{t('historyLoading')}</div> : error ? <div className="text-center py-12 text-destructive">{error}</div> : filteredLogs.length === 0 ? <div className="text-center py-12"><History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">{t('historyEmpty')}</p></div> : filteredLogs.map(log => { const category = categories.find(item => item.id === log.category); const resolvedStatus = log.callStatus ?? 'cancelled'; const StatusIcon = statusConfig[resolvedStatus].icon; return <Card key={log.id} className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => onViewTracking?.(log.id, log.category)}><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><Badge variant="secondary" className={cn('text-xs', category?.bgColor, category?.color)}>{getCategoryDisplayLabel(category, preferThai) || log.category}</Badge><Badge variant="outline" className={cn('text-xs', statusConfig[resolvedStatus].color)}><StatusIcon className="h-3 w-3 mr-1" />{t(statusConfig[resolvedStatus].labelKey)}</Badge></div><h3 className="font-medium text-foreground">{log.agencyName ?? t('historyEmergencyDesk')}</h3><p className="mt-1 text-xs font-medium text-muted-foreground">{t('historyCase', { caseNumber: getMobileIncidentDisplayNumber(log) })}</p><div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(log.createdAt).toLocaleDateString(locale, dateOptions)}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(log.createdAt).toLocaleTimeString(locale, timeOptions)}</span></div><div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{getHistoryLocationLabel(log)}</div>{getUserFacingIncidentDescription(log.description) ? <p className="text-xs text-muted-foreground mt-2 italic">{getUserFacingIncidentDescription(log.description)}</p> : null}</div><ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" /></div></CardContent></Card> })}</div></div>
  </div>
}
