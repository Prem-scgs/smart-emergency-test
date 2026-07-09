import type { ComponentType } from 'react'
import type { EmergencyCategory } from '@/entities/incident'
import type {
  DashboardAreaChartRow,
  DashboardCategoryChartRow,
  DashboardContact,
  DashboardHourlyChartRow,
  DashboardIncident,
  DashboardKpiItem,
} from './types.ts'
import type { DashboardLocationOption } from '../lib/helpers.ts'
import {
  filterDashboardMapIncidents,
  localizeDashboardMapIncidents,
} from '../lib/helpers.ts'
import type {
  DashboardReferenceDistrict,
  DashboardReferenceProvince,
} from '../lib/helpers.ts'

interface KpiIcons {
  phone: ComponentType<{ className?: string }>
  alert: ComponentType<{ className?: string }>
  building: ComponentType<{ className?: string }>
  check: ComponentType<{ className?: string }>
}

interface DashboardMapViewModelInput {
  incidents: DashboardIncident[]
  contacts: DashboardContact[]
  isSuperAdmin: boolean
  allowedCategories: EmergencyCategory[]
  categoryFilter: EmergencyCategory | 'all'
  normalizedLocationQuery: string
  selectedLocation: DashboardLocationOption | null
  provinceByCode: Record<string, DashboardReferenceProvince>
  districtByCode: Record<string, DashboardReferenceDistrict>
  preferThai: boolean
  outsideAreaLabel: string
  categoryLabelMap: Record<string, string>
  agencyDisplayName: string
  scopeOwnAgencyLabel: string
  allAgenciesFilteredLabel: string
  kpiLabels: {
    totalIncidents: string
    openIncidents: string
    activeContacts: string
    closureRate: string
    criticalSuffix: string
    noCritical: string
    contactsPrefix: string
    contactsSuffix: string
    closedSuffix: string
  }
  icons: KpiIcons
}

export interface DashboardMapViewModel {
  roleIncidents: DashboardIncident[]
  roleContacts: DashboardContact[]
  visibleIncidents: DashboardIncident[]
  localizedVisibleIncidents: DashboardIncident[]
  availableCategories: EmergencyCategory[]
  kpis: DashboardKpiItem[]
  categoryChartData: DashboardCategoryChartRow[]
  areaChartData: DashboardAreaChartRow[]
  hourlyData: DashboardHourlyChartRow[]
}

export function percent(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

/**
 * รวมข้อมูล dashboard ให้ UI ใช้ render ได้ตรงกันทั้ง KPI, chart, queue และ map
 *
 * จุดสำคัญ:
 * - role filtering ทำก่อน location/category filtering เพื่อกัน agency_admin/viewer เห็นข้อมูลข้ามหมวด
 * - location labels ถูก localize จาก master reference ก่อนส่งให้ chart/map
 * - output ตัวเดียวกันช่วยให้ queue/map/detail เปิดเคสเดียวกันจากข้อมูลชุดเดียว
 */
export function buildDashboardMapViewModel({
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
  outsideAreaLabel,
  categoryLabelMap,
  agencyDisplayName,
  scopeOwnAgencyLabel,
  allAgenciesFilteredLabel,
  kpiLabels,
  icons,
}: DashboardMapViewModelInput): DashboardMapViewModel {
  const roleIncidents = isSuperAdmin
    ? incidents
    : incidents.filter(incident =>
        allowedCategories.includes(incident.category as EmergencyCategory)
      )

  const roleContacts = isSuperAdmin
    ? contacts
    : contacts.filter(contact => {
        if (!contact.category) return false
        return allowedCategories.includes(contact.category as EmergencyCategory)
      })

  const availableCategories = Array.from(
    new Set(roleIncidents.map(incident => incident.category))
  ).sort() as EmergencyCategory[]

  const visibleIncidents = filterDashboardMapIncidents(
    roleIncidents,
    categoryFilter,
    normalizedLocationQuery,
    selectedLocation
  )

  const localizedVisibleIncidents = localizeDashboardMapIncidents(
    visibleIncidents,
    provinceByCode,
    districtByCode,
    preferThai,
    outsideAreaLabel
  )

  const openIncidents = localizedVisibleIncidents.filter(incident => incident.status !== 'closed')
  const closedIncidents = localizedVisibleIncidents.filter(incident => incident.status === 'closed')
  const activeContacts = roleContacts.filter(contact => contact.active)
  const criticalIncidents = localizedVisibleIncidents.filter(incident => incident.severity === 'critical')

  const kpis: DashboardKpiItem[] = [
    {
      title: kpiLabels.totalIncidents,
      value: localizedVisibleIncidents.length.toLocaleString(),
      description: isSuperAdmin ? allAgenciesFilteredLabel : `${scopeOwnAgencyLabel}${agencyDisplayName}`,
      icon: icons.phone,
      tone: 'bg-primary/10 text-primary',
    },
    {
      title: kpiLabels.openIncidents,
      value: openIncidents.length.toLocaleString(),
      description: criticalIncidents.length > 0 ? `${criticalIncidents.length}${kpiLabels.criticalSuffix}` : kpiLabels.noCritical,
      icon: icons.alert,
      tone: 'bg-warning/10 text-warning',
    },
    {
      title: kpiLabels.activeContacts,
      value: activeContacts.length.toLocaleString(),
      description: `${kpiLabels.contactsPrefix}${roleContacts.length.toLocaleString()}${kpiLabels.contactsSuffix}`,
      icon: icons.building,
      tone: 'bg-secondary/10 text-secondary',
    },
    {
      title: kpiLabels.closureRate,
      value: `${percent(closedIncidents.length, localizedVisibleIncidents.length)}%`,
      description: `${closedIncidents.length.toLocaleString()}${kpiLabels.closedSuffix}`,
      icon: icons.check,
      tone: 'bg-success/10 text-success',
    },
  ]

  const categoryCounts = localizedVisibleIncidents.reduce<Record<string, number>>((acc, incident) => {
    acc[incident.category] = (acc[incident.category] ?? 0) + 1
    return acc
  }, {})

  const categoryChartData = Object.entries(categoryCounts)
    .map(([category, calls]) => ({
      category: categoryLabelMap[category] ?? category,
      calls,
    }))
    .sort((a, b) => b.calls - a.calls)

  const areaCounts = localizedVisibleIncidents.reduce<Record<string, number>>((acc, incident) => {
    const area = incident.areaName ?? outsideAreaLabel
    acc[area] = (acc[area] ?? 0) + 1
    return acc
  }, {})

  const areaChartData = Object.entries(areaCounts)
    .map(([area, calls]) => ({ area, calls }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 6)

  const buckets = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
  const hourlyCounts = Object.fromEntries(buckets.map(hour => [hour, 0])) as Record<string, number>

  localizedVisibleIncidents.forEach(incident => {
    const hour = new Date(incident.createdAt).getHours()
    const bucket = Math.floor(hour / 4) * 4
    const key = `${bucket.toString().padStart(2, '0')}:00`
    hourlyCounts[key] = (hourlyCounts[key] ?? 0) + 1
  })

  return {
    roleIncidents,
    roleContacts,
    visibleIncidents,
    localizedVisibleIncidents,
    availableCategories,
    kpis,
    categoryChartData,
    areaChartData,
    hourlyData: buckets.map(hour => ({ hour, calls: hourlyCounts[hour] ?? 0 })),
  }
}
