'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  MapPin,
  MapPinned,
  Phone,
  RefreshCw,
  Search,
  Shield,
  X,
} from 'lucide-react'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AdminI18nKey, AdminLanguage } from '@/shared/i18n/admin'
import type { EmergencyCategory } from '@/entities/incident'
import type { Agency, AdminUser } from '@/shared/auth'
import { cn } from '@/shared/utils'
import {
  buildDashboardLocationOptions,
  filterDashboardLocationOptions,
  normalizeDashboardMapText,
  type DashboardReferenceDistrict,
  type DashboardReferenceProvince,
  type DashboardLocationOption,
} from '../lib/helpers'
import {
  useDashboardIncidentDetailController,
  useDashboardMapData,
  useSelectedDashboardAreaBounds,
} from '../model/hooks'
import { buildDashboardMapViewModel } from '../model/view-model'
import { IncidentDetailPanel } from './incident-detail-panel'
import type { IncidentMapPoint } from './incident-map'
import { IncidentQueue } from './incident-queue'

const IncidentMap = dynamic(
  () => import('./incident-map').then(mod => mod.IncidentMap),
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

interface DashboardMapSectionProps {
  user: AdminUser | null
  isSuperAdmin: boolean
  agency: Agency | undefined
  allowedCategories: EmergencyCategory[]
  categoryLabelMap: Record<string, string>
  language: AdminLanguage
  t: (key: AdminI18nKey) => string
  provinces: DashboardReferenceProvince[]
  districts: DashboardReferenceDistrict[]
  provinceByCode: Record<string, DashboardReferenceProvince>
  districtByCode: Record<string, DashboardReferenceDistrict>
  isLocationLoading: boolean
}

export function DashboardMapSection({
  user,
  isSuperAdmin,
  agency,
  allowedCategories,
  categoryLabelMap,
  language,
  t,
  provinces,
  districts,
  provinceByCode,
  districtByCode,
  isLocationLoading,
}: DashboardMapSectionProps) {
  const preferThai = language !== 'en'
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [locationQuery, setLocationQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<DashboardLocationOption | null>(null)
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false)
  const locationBoxRef = useRef<HTMLDivElement | null>(null)

  const { incidents, contacts, isLoading, error, reload } = useDashboardMapData({
    user,
    loadIncidentsError: t('dashboardLoadIncidentsError'),
    loadContactsError: t('dashboardLoadContactsError'),
    loadError: t('dashboardLoadError'),
  })
  const {
    selectedIncidentId,
    isIncidentDetailOpen,
    setIsIncidentDetailOpen,
    openIncidentDetail,
    clearSelectedIncident,
  } = useDashboardIncidentDetailController()
  const selectedLocationBounds = useSelectedDashboardAreaBounds(selectedLocation)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!locationBoxRef.current?.contains(event.target as Node)) {
        setIsLocationMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const locationOptions = useMemo(
    () => buildDashboardLocationOptions(provinces, districts, preferThai),
    [districts, preferThai, provinces]
  )

  const normalizedLocationQuery = normalizeDashboardMapText(locationQuery)
  const filteredLocationOptions = useMemo(
    () => filterDashboardLocationOptions(locationOptions, normalizedLocationQuery),
    [locationOptions, normalizedLocationQuery]
  )

  const agencyDisplayName = agency
    ? categoryLabelMap[agency.category] ?? agency.name
    : t('dashboardThisAgencyFallback')
  const roleName = isSuperAdmin
    ? t('roleSuperAdmin')
    : user?.role === 'agency_admin'
      ? t('roleAgencyAdmin')
      : user?.role ?? 'agency'
  const scopeDescription = isSuperAdmin
    ? t('dashboardScopeAllData')
    : `${t('dashboardScopeCategoryPrefix')}${allowedCategories.map(category => categoryLabelMap[category] ?? category).join(', ')}`

  const viewModel = useMemo(
    () =>
      buildDashboardMapViewModel({
        incidents,
        contacts,
        isSuperAdmin,
        allowedCategories,
        categoryFilter,
        normalizedLocationQuery,
        selectedLocation,
        provinceByCode,
        districtByCode,
        preferThai,
        outsideAreaLabel: t('dashboardOutsideArea'),
        categoryLabelMap,
        agencyDisplayName,
        scopeOwnAgencyLabel: t('scopeOwnAgency'),
        allAgenciesFilteredLabel: t('dashboardKpiAllAgenciesFiltered'),
        kpiLabels: {
          totalIncidents: t('dashboardKpiTotalIncidents'),
          openIncidents: t('dashboardKpiOpenIncidents'),
          activeContacts: t('dashboardKpiActiveContacts'),
          closureRate: t('dashboardKpiClosureRate'),
          criticalSuffix: t('dashboardKpiCriticalSuffix'),
          noCritical: t('dashboardKpiNoCritical'),
          contactsPrefix: t('dashboardKpiContactsPrefix'),
          contactsSuffix: t('dashboardKpiContactsSuffix'),
          closedSuffix: t('dashboardKpiClosedSuffix'),
        },
        icons: {
          phone: Phone,
          alert: AlertTriangle,
          building: Building2,
          check: CheckCircle2,
        },
      }),
    [
      agencyDisplayName,
      allowedCategories,
      categoryFilter,
      categoryLabelMap,
      contacts,
      districtByCode,
      incidents,
      isSuperAdmin,
      normalizedLocationQuery,
      preferThai,
      provinceByCode,
      selectedLocation,
      t,
    ]
  )

  const agencyFilters = useMemo(() => {
    if (isSuperAdmin) {
      return ['all', ...viewModel.availableCategories] as Array<EmergencyCategory | 'all'>
    }

    if (agency?.category) {
      return [agency.category] as Array<EmergencyCategory | 'all'>
    }

    return viewModel.availableCategories as Array<EmergencyCategory | 'all'>
  }, [agency?.category, isSuperAdmin, viewModel.availableCategories])

  useEffect(() => {
    if (!agencyFilters.includes(categoryFilter)) {
      setCategoryFilter(agencyFilters[0] ?? 'all')
    }
  }, [agencyFilters, categoryFilter])

  function handleLocationInputChange(value: string) {
    setLocationQuery(value)
    setIsLocationMenuOpen(true)

    if (selectedLocation && value !== selectedLocation.label) {
      setSelectedLocation(null)
    }
  }

  function handleLocationSelect(option: DashboardLocationOption) {
    setSelectedLocation(option)
    setLocationQuery(option.label)
    setIsLocationMenuOpen(false)
    clearSelectedIncident()
  }

  function clearLocationSelection() {
    setSelectedLocation(null)
    setLocationQuery('')
    setIsLocationMenuOpen(false)
  }

  return (
    <>
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
            <Button variant="outline" onClick={reload} disabled={isLoading}>
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
        {viewModel.kpis.map(kpi => (
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
            <CardDescription>{t('dashboardMapDescription')}</CardDescription>
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
                incidents={viewModel.localizedVisibleIncidents as IncidentMapPoint[]}
                selectedIncidentId={selectedIncidentId}
                selectedAreaBounds={selectedLocationBounds}
                categoryLabels={categoryLabelMap}
                onSelectIncident={openIncidentDetail}
                useCurrentLocation
              />
              <div className="pointer-events-none absolute right-4 top-4 max-w-[min(260px,calc(100%-2rem))] rounded-md border bg-background/95 px-4 py-3 text-sm shadow-sm">
                <p className="font-medium">
                  {t('dashboardVisibleIncidentsPrefix')}{viewModel.localizedVisibleIncidents.length.toLocaleString()}{t('dashboardVisibleIncidentsSuffix')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboardScopeTotalPrefix')}{viewModel.roleIncidents.length.toLocaleString()}{t('dashboardVisibleIncidentsSuffix')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <IncidentQueue
          incidents={viewModel.localizedVisibleIncidents}
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
        onStatusUpdated={reload}
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
                    <BarChart data={viewModel.categoryChartData} layout="vertical">
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
                    {viewModel.areaChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('dashboardNoAreaData')}</p>
                    ) : (
                      viewModel.areaChartData.slice(0, 4).map(item => (
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
                  <LineChart data={viewModel.hourlyData}>
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
                  {viewModel.areaChartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('dashboardNoAreaData')}</p>
                  ) : (
                    viewModel.areaChartData.map(item => (
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
    </>
  )
}
