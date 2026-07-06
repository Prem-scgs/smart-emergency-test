import type { ComponentType } from 'react'
import type { AreaPolygon } from '@/entities/area'
import type { IncidentMapPoint } from '../ui/incident-map'

export type DashboardIncident = IncidentMapPoint & {
  provinceCode?: string | null
  province?: string | null
  districtCode?: string | null
  district?: string | null
}

export interface DashboardContact {
  id: string
  name: string
  phone: string
  category: string | null
  active: boolean
}

export interface DashboardAreaBoundary {
  polygon: AreaPolygon | null
}

export interface DashboardKpiItem {
  title: string
  value: string
  description: string
  icon: ComponentType<{ className?: string }>
  tone: string
}

export interface DashboardChartCallRow {
  calls: number
}

export interface DashboardCategoryChartRow extends DashboardChartCallRow {
  category: string
}

export interface DashboardAreaChartRow extends DashboardChartCallRow {
  area: string
}

export interface DashboardHourlyChartRow extends DashboardChartCallRow {
  hour: string
}
