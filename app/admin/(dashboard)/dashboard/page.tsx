'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Filter,
  MapPinned,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from 'recharts'

import type { IncidentMapPoint } from '@/components/admin/incident-map'
import { IncidentDetailPanel } from '@/components/admin/incident-detail-panel'
import { IncidentQueue } from '@/components/admin/incident-queue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { buildAdminApiHeaders } from '@/lib/admin-api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminI18n } from '@/lib/admin-i18n'
import { useAuth } from '@/lib/auth-context'
import { buildAdminCategoryCollections } from '@/lib/emergency-category-utils'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import { useReferenceCategories } from '@/lib/reference-categories'
import {
  getLocationDisplayName,
  useLocationLookupMaps,
  useReferenceLocations,
  type ReferenceDistrict,
  type ReferenceProvince,
} from '@/lib/reference-locations'
import type { EmergencyCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { MultiPolygon, Polygon } from 'geojson'

const API_BASE_URL = getEmergencyApiBaseUrl()
const OFFICIAL_SOURCE = 'chingchai/OpenGISData-Thailand'
const OPEN_INCIDENT_DETAIL_EVENT = 'smart-emergency:open-incident-detail'
const PENDING_INCIDENT_DETAIL_KEY = 'smart-emergency:pending-incident-detail'
type DashboardIncident = IncidentMapPoint & {
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
}

interface DashboardContact {
  id: string
  name: string
  phone: string
  category: string | null
  active: boolean
}


interface DashboardSseDebugDetail {
  status?: 'connecting' | 'connected' | 'disconnected'
  eventType?: string
  timestamp?: string
}

interface MasterLocationOption {
  key: string
  areaType: 'province' | 'district'
  label: string
  provinceCode: string | null
  province: string
  districtCode: string | null
  district: string | null
  searchable: string
}

type MapBounds = [[number, number], [number, number]]

interface DashboardAreaBoundary {
  polygon: Polygon | MultiPolygon | null
}

const IncidentMap = dynamic(
  () => import('@/components/admin/incident-map').then(mod => mod.IncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center bg-muted text-sm text-muted-foreground">
        กำลังโหลดแผนที่...
      </div>
    ),
  }
)

const chartConfig = {
  calls: {
    label: 'จำนวนเหตุ',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const severityLabels: Record<string, string> = {
  critical: 'วิกฤต',
  high: 'สูง',
  medium: 'ปานกลาง',
  low: 'ต่ำ',
}

const statusLabels: Record<string, string> = {
  open: 'เปิดอยู่',
  reported: 'แจ้งเหตุแล้ว',
  acknowledged: 'รับเรื่องแล้ว',
  coordinating: 'กำลังประสานงาน',
  dispatched: 'ส่งเจ้าหน้าที่แล้ว',
  on_scene: 'ถึงที่เกิดเหตุ',
  closed: 'ปิดเหตุ',
}

function selectLabel(label: string) {
  return (
    <span data-slot="select-value" className="flex flex-1 items-center gap-1.5 text-left">
      {label}
    </span>
  )
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase('th-TH').normalize('NFC')
}

function collectLngLatPairs(value: unknown, pairs: Array<[number, number]>) {
  if (!Array.isArray(value)) return

  if (
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    pairs.push([value[0], value[1]])
    return
  }

  value.forEach(item => collectLngLatPairs(item, pairs))
}

function getPolygonBounds(polygon: Polygon | MultiPolygon | null): MapBounds | null {
  if (!polygon) return null

  const pairs: Array<[number, number]> = []
  collectLngLatPairs(polygon.coordinates, pairs)
  if (pairs.length === 0) return null

  const lngs = pairs.map(pair => pair[0])
  const lats = pairs.map(pair => pair[1])

  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function percent(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

function buildLocationOptions(
  provinces: ReferenceProvince[],
  districts: ReferenceDistrict[],
  preferThai: boolean
): MasterLocationOption[] {
  const provinceOptions = provinces.map(province => {
    const provinceName = getLocationDisplayName(province, preferThai)
    return {
      key: `province-${province.provinceCode ?? province.id}`,
      areaType: 'province' as const,
      label: provinceName,
      provinceCode: province.provinceCode ?? null,
      province: provinceName,
      districtCode: null,
      district: null,
      searchable: normalizeText(
        [provinceName, province.nameEn ?? '', province.provinceCode ?? ''].join(' ')
      ),
    }
  })

  const districtOptions = districts.map(district => {
    const provinceName =
      (preferThai
        ? district.provinceNameTh ?? district.provinceNameEn
        : district.provinceNameEn ?? district.provinceNameTh) ??
      district.provinceCode ??
      '-'
    const districtName = getLocationDisplayName(district, preferThai)

    return {
      key: `district-${district.districtCode ?? district.id}-${district.provinceCode ?? 'na'}`,
      areaType: 'district' as const,
      label: `${districtName} ${provinceName}`,
      provinceCode: district.provinceCode ?? null,
      province: provinceName,
      districtCode: district.districtCode ?? null,
      district: districtName,
      searchable: normalizeText(
        [
          districtName,
          provinceName,
          district.nameEn ?? '',
          district.provinceNameEn ?? '',
          district.districtCode ?? '',
          district.provinceCode ?? '',
        ].join(' ')
      ),
    }
  })

  return [...districtOptions, ...provinceOptions]
}

export default function DashboardPage() {
  const { user, canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  const { language, t } = useAdminI18n()
  const preferThai = language !== 'en'
  const { categories: referenceCategories } = useReferenceCategories()
  const { provinces, districts, isLoadingProvinces, isLoadingDistricts } = useReferenceLocations({ autoSelectFirstProvince: false })
  const { provinceByCode, districtByCode } = useLocationLookupMaps()
  const { labelMap: categoryLabelMap } = useMemo(
    () => buildAdminCategoryCollections(referenceCategories, preferThai),
    [preferThai, referenceCategories]
  )
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = useMemo(() => getFilteredCategories(), [getFilteredCategories])

  const [incidents, setIncidents] = useState<DashboardIncident[]>([])
  const [contacts, setContacts] = useState<DashboardContact[]>([])
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [locationQuery, setLocationQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<MasterLocationOption | null>(null)
  const [selectedLocationBounds, setSelectedLocationBounds] = useState<MapBounds | null>(null)
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sseStatus, setSseStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [sseEventCount, setSseEventCount] = useState(0)
  const [lastSseAt, setLastSseAt] = useState<string | null>(null)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [isIncidentDetailOpen, setIsIncidentDetailOpen] = useState(false)

  const locationBoxRef = useRef<HTMLDivElement | null>(null)

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const headers = buildAdminApiHeaders(user)
      const [incidentResponse, contactResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/incidents/map-points`, { headers }),
        fetch(`${API_BASE_URL}/api/contacts`, { headers }),
      ])

      if (!incidentResponse.ok) throw new Error(t('dashboardLoadIncidentsError'))
      if (!contactResponse.ok) throw new Error(t('dashboardLoadContactsError'))

      setIncidents((await incidentResponse.json()) as DashboardIncident[])
      setContacts((await contactResponse.json()) as DashboardContact[])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('dashboardLoadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t, user])


  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  useEffect(() => {
    function handleIncidentCreated() {
      loadDashboardData()
    }

    function handleIncidentStatusUpdated() {
      loadDashboardData()
    }

    window.addEventListener('smart-emergency:incident-created', handleIncidentCreated)
    window.addEventListener(
      'smart-emergency:incident-status-updated',
      handleIncidentStatusUpdated
    )
    return () => {
      window.removeEventListener('smart-emergency:incident-created', handleIncidentCreated)
      window.removeEventListener(
        'smart-emergency:incident-status-updated',
        handleIncidentStatusUpdated
      )
    }
  }, [loadDashboardData])


  useEffect(() => {
    function handleSseStatus(event: Event) {
      const detail = (event as CustomEvent<DashboardSseDebugDetail>).detail
      if (!detail?.status) return

      setSseStatus(detail.status)
      if (detail.timestamp) {
        setLastSseAt(detail.timestamp)
      }
    }

    function handleSseEvent(event: Event) {
      const detail = (event as CustomEvent<DashboardSseDebugDetail>).detail
      setSseEventCount(count => count + 1)
      if (detail?.timestamp) {
        setLastSseAt(detail.timestamp)
      }
    }

    window.addEventListener('smart-emergency:sse-status', handleSseStatus)
    window.addEventListener('smart-emergency:sse-event', handleSseEvent)

    return () => {
      window.removeEventListener('smart-emergency:sse-status', handleSseStatus)
      window.removeEventListener('smart-emergency:sse-event', handleSseEvent)
    }
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!locationBoxRef.current?.contains(event.target as Node)) {
        setIsLocationMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!selectedLocation) {
      setSelectedLocationBounds(null)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      areaType: selectedLocation.areaType,
      source: OFFICIAL_SOURCE,
      includeGeometry: 'true',
    })

    if (selectedLocation.provinceCode) {
      params.set('provinceCode', selectedLocation.provinceCode)
    }
    if (selectedLocation.areaType === 'district' && selectedLocation.districtCode) {
      params.set('districtCode', selectedLocation.districtCode)
    }

    async function loadSelectedLocationBounds() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/areas?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Unable to load selected area bounds')

        const areas = (await response.json()) as DashboardAreaBoundary[]
        setSelectedLocationBounds(getPolygonBounds(areas[0]?.polygon ?? null))
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setSelectedLocationBounds(null)
      }
    }

    loadSelectedLocationBounds()
    return () => controller.abort()
  }, [selectedLocation])

  const roleIncidents = useMemo(() => {
    if (isSuperAdmin) return incidents
    return incidents.filter(incident =>
      allowedCategories.includes(incident.category as EmergencyCategory)
    )
  }, [allowedCategories, incidents, isSuperAdmin])

  const roleContacts = useMemo(() => {
    if (isSuperAdmin) return contacts
    return contacts.filter(contact => {
      if (!contact.category) return false
      return allowedCategories.includes(contact.category as EmergencyCategory)
    })
  }, [allowedCategories, contacts, isSuperAdmin])

  const availableCategories = useMemo(() => {
    return Array.from(new Set(roleIncidents.map(incident => incident.category))).sort() as EmergencyCategory[]
  }, [roleIncidents])

  const agencyFilters = useMemo(() => {
    if (isSuperAdmin) {
      return ['all', ...availableCategories] as Array<EmergencyCategory | 'all'>
    }

    if (agency?.category) {
      return [agency.category] as Array<EmergencyCategory | 'all'>
    }

    return availableCategories as Array<EmergencyCategory | 'all'>
  }, [agency?.category, availableCategories, isSuperAdmin])

  useEffect(() => {
    if (!agencyFilters.includes(categoryFilter)) {
      setCategoryFilter(agencyFilters[0] ?? 'all')
    }
  }, [agencyFilters, categoryFilter])

  const locationOptions = useMemo(
    () => buildLocationOptions(provinces, districts, preferThai),
    [districts, preferThai, provinces]
  )
  const isLocationLoading = isLoadingProvinces || isLoadingDistricts

  const normalizedLocationQuery = normalizeText(locationQuery)

  const filteredLocationOptions = useMemo(() => {
    const source = locationOptions
    if (normalizedLocationQuery.length === 0) return source.slice(0, 12)
    return source.filter(option => option.searchable.includes(normalizedLocationQuery)).slice(0, 20)
  }, [locationOptions, normalizedLocationQuery])

  const visibleIncidents = useMemo(() => {
    return roleIncidents.filter(incident => {
      const matchesCategory = categoryFilter === 'all' || incident.category === categoryFilter

      const provinceCode = incident.provinceCode?.trim() ?? ''
      const province = normalizeText(incident.province ?? '')
      const districtCode = incident.districtCode?.trim() ?? ''
      const district = normalizeText(incident.district ?? '')
      const areaName = normalizeText(incident.areaName ?? '')
      const locationHaystack = [areaName, district, province, provinceCode, districtCode]
        .join(' ')
        .trim()

      let matchesLocation = true

      if (selectedLocation) {
        if (selectedLocation.areaType === 'province') {
          matchesLocation =
            (selectedLocation.provinceCode != null &&
              selectedLocation.provinceCode.length > 0 &&
              provinceCode === selectedLocation.provinceCode) ||
            province.includes(normalizeText(selectedLocation.province))
        } else {
          matchesLocation =
            (((selectedLocation.provinceCode != null &&
              selectedLocation.provinceCode.length > 0 &&
              provinceCode === selectedLocation.provinceCode) ||
              province.includes(normalizeText(selectedLocation.province))) &&
              ((selectedLocation.districtCode != null &&
                selectedLocation.districtCode.length > 0 &&
                districtCode === selectedLocation.districtCode) ||
                [district, areaName].some(value =>
                  value.includes(normalizeText(selectedLocation.district ?? selectedLocation.label))
                )))
        }
      } else if (normalizedLocationQuery.length > 0) {
        matchesLocation = locationHaystack.includes(normalizedLocationQuery)
      }

      return matchesCategory && matchesLocation
    })
  }, [categoryFilter, normalizedLocationQuery, roleIncidents, selectedLocation])

  const localizedVisibleIncidents = useMemo(() => {
    return visibleIncidents.map(incident => {
      const provinceFromMaster = incident.provinceCode
        ? getLocationDisplayName(provinceByCode[incident.provinceCode], preferThai)
        : ''
      const districtFromMaster = incident.districtCode
        ? getLocationDisplayName(districtByCode[incident.districtCode], preferThai)
        : ''
      const province = provinceFromMaster || incident.province
      const district = districtFromMaster || incident.district
      const areaName =
        [district, province].filter(Boolean).join(' ') ||
        incident.areaName ||
        t('dashboardOutsideArea')

      return {
        ...incident,
        province,
        district,
        areaName,
      }
    })
  }, [districtByCode, preferThai, provinceByCode, t, visibleIncidents])

  const openIncidents = localizedVisibleIncidents.filter(incident => incident.status !== 'closed')
  const closedIncidents = localizedVisibleIncidents.filter(incident => incident.status === 'closed')
  const activeContacts = roleContacts.filter(contact => contact.active)
  const criticalIncidents = localizedVisibleIncidents.filter(incident => incident.severity === 'critical')

  const agencyDisplayName = agency ? categoryLabelMap[agency.category] ?? agency.name : t('dashboardThisAgencyFallback')
  const roleName = isSuperAdmin ? t('roleSuperAdmin') : user?.role === 'agency_admin' ? t('roleAgencyAdmin') : user?.role ?? 'agency'
  const roleLabel = isSuperAdmin ? t('dashboardAllAgenciesScope') : agencyDisplayName

  const sseStatusLabel =
    sseStatus === 'connected'
      ? 'connected'
      : sseStatus === 'disconnected'
        ? 'disconnected'
        : 'connecting'
  const sseStatusTone =
    sseStatus === 'connected'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      : sseStatus === 'disconnected'
        ? 'bg-red-500/10 text-red-300 border-red-500/30'
        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'

  const kpis = [
    {
      title: t('dashboardKpiTotalIncidents'),
      value: localizedVisibleIncidents.length.toLocaleString(),
      description: isSuperAdmin ? t('dashboardKpiAllAgenciesFiltered') : `${t('scopeOwnAgency')}${agencyDisplayName}`,
      icon: Phone,
      tone: 'bg-primary/10 text-primary',
    },
    {
      title: t('dashboardKpiOpenIncidents'),
      value: openIncidents.length.toLocaleString(),
      description: criticalIncidents.length > 0 ? `${criticalIncidents.length}${t('dashboardKpiCriticalSuffix')}` : t('dashboardKpiNoCritical'),
      icon: AlertTriangle,
      tone: 'bg-warning/10 text-warning',
    },
    {
      title: t('dashboardKpiActiveContacts'),
      value: activeContacts.length.toLocaleString(),
      description: `${t('dashboardKpiContactsPrefix')}${roleContacts.length.toLocaleString()}${t('dashboardKpiContactsSuffix')}`,
      icon: Building2,
      tone: 'bg-secondary/10 text-secondary',
    },
    {
      title: t('dashboardKpiClosureRate'),
      value: `${percent(closedIncidents.length, localizedVisibleIncidents.length)}%`,
      description: `${closedIncidents.length.toLocaleString()}${t('dashboardKpiClosedSuffix')}`,
      icon: CheckCircle2,
      tone: 'bg-success/10 text-success',
    },
  ]

  const categoryChartData = useMemo(() => {
    const counts = localizedVisibleIncidents.reduce<Record<string, number>>((acc, incident) => {
      acc[incident.category] = (acc[incident.category] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([category, calls]) => ({
        category: categoryLabelMap[category] ?? category,
        calls,
      }))
      .sort((a, b) => b.calls - a.calls)
  }, [categoryLabelMap, localizedVisibleIncidents])

  const areaChartData = useMemo(() => {
    const counts = localizedVisibleIncidents.reduce<Record<string, number>>((acc, incident) => {
      const area = incident.areaName ?? t('dashboardOutsideArea')
      acc[area] = (acc[area] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts)
      .map(([area, calls]) => ({ area, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 6)
  }, [localizedVisibleIncidents, t])

  const hourlyData = useMemo(() => {
    const buckets = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
    const counts = Object.fromEntries(buckets.map(hour => [hour, 0])) as Record<string, number>

    localizedVisibleIncidents.forEach(incident => {
      const hour = new Date(incident.createdAt).getHours()
      const bucket = Math.floor(hour / 4) * 4
      const key = `${bucket.toString().padStart(2, '0')}:00`
      counts[key] = (counts[key] ?? 0) + 1
    })

    return buckets.map(hour => ({ hour, calls: counts[hour] ?? 0 }))
  }, [localizedVisibleIncidents])

  const scopeDescription = isSuperAdmin
    ? t('dashboardScopeAllData')
    : `${t('dashboardScopeCategoryPrefix')}${allowedCategories.map(category => categoryLabelMap[category] ?? category).join(', ')}`

  function handleLocationInputChange(value: string) {
    setLocationQuery(value)
    setIsLocationMenuOpen(true)

    if (selectedLocation && value !== selectedLocation.label) {
      setSelectedLocation(null)
    }
  }

  function handleLocationSelect(option: MasterLocationOption) {
    setSelectedLocation(option)
    setLocationQuery(option.label)
    setIsLocationMenuOpen(false)
    setSelectedIncidentId(null)
    setIsIncidentDetailOpen(false)
  }

  function clearLocationSelection() {
    setSelectedLocation(null)
    setLocationQuery('')
    setIsLocationMenuOpen(false)
  }

  function openIncidentDetail(incidentId: string) {
    setSelectedIncidentId(incidentId)
    setIsIncidentDetailOpen(true)
  }

  useEffect(() => {
    function openFromEvent(event: Event) {
      const incidentId = (event as CustomEvent<{ incidentId?: string }>).detail?.incidentId
      if (!incidentId) return

      openIncidentDetail(incidentId)
    }

    const pendingIncidentId = window.sessionStorage.getItem(PENDING_INCIDENT_DETAIL_KEY)
    if (pendingIncidentId) {
      window.sessionStorage.removeItem(PENDING_INCIDENT_DETAIL_KEY)
      openIncidentDetail(pendingIncidentId)
    }

    window.addEventListener(OPEN_INCIDENT_DETAIL_EVENT, openFromEvent)
    return () => window.removeEventListener(OPEN_INCIDENT_DETAIL_EVENT, openFromEvent)
  }, [])

  return (
    <div className="space-y-6 p-4 lg:p-6">

      <Card className="border-dashed border-primary/30 bg-background/80">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">{t('dashboardRealtimeDebug')}</p>
            <p className="text-xs text-muted-foreground">
              {t('dashboardRealtimeDebugDescription')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={cn('font-mono', sseStatusTone)}>
              SSE: {sseStatusLabel}
            </Badge>
            <Badge variant="outline" className="font-mono">
              events: {sseEventCount}
            </Badge>
            <Badge variant="outline" className="font-mono">
              last: {lastSseAt ? formatDateTime(lastSseAt) : '-'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">
                    {isSuperAdmin ? t('dashboardAllAgenciesCommand') : agencyDisplayName}
                  </h1>
                  <Badge variant={isSuperAdmin ? 'default' : 'outline'}>{roleName}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{scopeDescription}</p>
              </div>
            </div>
            <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('dashboardReload')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="mt-2 text-3xl font-semibold">{isLoading ? '-' : kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.description}</p>
                </div>
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg', kpi.tone)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPinned className="h-4 w-4" />
              {t('dashboardMapTitle')}
            </CardTitle>
            <CardDescription>
              {t('dashboardMapDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-b border-border/60 px-4 pb-4 pt-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl bg-muted p-1 lg:w-auto">
                  {agencyFilters.map(filter => {
                    const isActive = categoryFilter === filter
                    const label = filter === 'all' ? t('dashboardFilterAll') : categoryLabelMap[filter] ?? filter

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setCategoryFilter(filter)}
                        className={cn(
                          'inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition',
                          isActive
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div ref={locationBoxRef} className="relative w-full lg:max-w-[430px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={locationQuery}
                    onChange={event => handleLocationInputChange(event.target.value)}
                    onFocus={() => setIsLocationMenuOpen(true)}
                    placeholder={t('dashboardSearchAreaPlaceholder')}
                    className="h-10 rounded-full bg-background pl-9 pr-10"
                  />
                  {(locationQuery.length > 0 || selectedLocation) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearLocationSelection}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full"
                      aria-label={t('dashboardClearSearch')}
                    >
                      <X data-icon="inline-start" />
                    </Button>
                  )}

                  {isLocationMenuOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
                      <div className="max-h-[320px] overflow-y-auto py-2">
                        {isLocationLoading ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {t('dashboardLoadingLocations')}
                          </div>
                        ) : filteredLocationOptions.length > 0 ? (
                          filteredLocationOptions.map(option => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => handleLocationSelect(option)}
                              className={cn(
                                'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/70',
                                selectedLocation?.key === option.key && 'bg-muted'
                              )}
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{option.label}</p>
                                <p className="text-xs text-muted-foreground">
                                  {option.areaType === 'province' ? t('dashboardProvince') : t('dashboardDistrict')}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-muted-foreground">
                            {t('dashboardNoMatchingArea')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="relative h-[460px] overflow-hidden">
              <IncidentMap
                incidents={localizedVisibleIncidents}
                selectedIncidentId={selectedIncidentId}
                selectedAreaBounds={selectedLocationBounds}
                categoryLabels={categoryLabelMap}
                onSelectIncident={openIncidentDetail}
                useCurrentLocation
              />
              <div className="pointer-events-none absolute right-4 top-4 max-w-[min(260px,calc(100%-2rem))] rounded-md border bg-background/95 px-4 py-3 text-sm shadow-sm">
                <p className="font-medium">
                  {t('dashboardVisibleIncidentsPrefix')}{localizedVisibleIncidents.length.toLocaleString()}{t('dashboardVisibleIncidentsSuffix')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboardScopeTotalPrefix')}{roleIncidents.length.toLocaleString()}{t('dashboardVisibleIncidentsSuffix')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <IncidentQueue
          incidents={localizedVisibleIncidents}
          selectedIncidentId={selectedIncidentId}
          categoryLabels={categoryLabelMap}
          isLoading={isLoading}
          onSelect={openIncidentDetail}
        />
      </div>

      <IncidentDetailPanel
        incidentId={selectedIncidentId}
        open={isIncidentDetailOpen}
        user={user}
        categoryLabels={categoryLabelMap}
        onOpenChange={setIsIncidentDetailOpen}
        onStatusUpdated={loadDashboardData}
      />

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">{t('dashboardAdditionalViews')}</CardTitle>
              <CardDescription>{t('dashboardAdditionalViewsDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="gap-4">
            <TabsList className="w-full bg-muted">
              <TabsTrigger value="overview" className="min-w-0 flex-1">
                {t('dashboardOverviewTab')}
              </TabsTrigger>
              <TabsTrigger value="trend" className="min-w-0 flex-1">
                {t('dashboardTrendTab')}
              </TabsTrigger>
              <TabsTrigger value="areas" className="min-w-0 flex-1">
                {t('dashboardAreasTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_320px]">
                <div className="rounded-xl border p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">{t('dashboardCategoryChartTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('dashboardCategoryChartDescription')}</p>
                  </div>
                  <ChartContainer config={chartConfig} className="h-[260px]">
                    <BarChart data={categoryChartData} layout="vertical">
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" width={90} tick={{ fontSize: 12 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="calls" fill="var(--chart-1)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold">{t('dashboardAreaHighlightsTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('dashboardAreaHighlightsDescription')}</p>
                  </div>
                  <div className="space-y-3">
                    {areaChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('dashboardNoAreaData')}</p>
                    ) : (
                      areaChartData.slice(0, 4).map(item => (
                        <div key={item.area} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                          <p className="min-w-0 truncate text-sm font-medium">{item.area}</p>
                          <Badge variant="outline">{item.calls} {t('dashboardIncidentUnit')}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trend">
              <div className="rounded-xl border p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">{t('dashboardTrendTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('dashboardTrendDescription')}</p>
                </div>
                <ChartContainer config={chartConfig} className="h-[280px]">
                  <LineChart data={hourlyData}>
                    <XAxis dataKey="hour" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="calls"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={{ fill: 'var(--chart-1)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </TabsContent>

            <TabsContent value="areas">
              <div className="rounded-xl border p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold">{t('dashboardAreasTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('dashboardAreasDescription')}</p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {areaChartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('dashboardNoAreaData')}</p>
                  ) : (
                    areaChartData.map(item => (
                      <div key={item.area} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                        <p className="min-w-0 truncate text-sm font-medium">{item.area}</p>
                        <Badge variant="outline">{item.calls} {t('dashboardIncidentUnit')}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
