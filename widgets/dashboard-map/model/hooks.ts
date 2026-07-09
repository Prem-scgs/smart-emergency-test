'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPolygonBounds, type AreaMapBounds } from '@/entities/area'
import { buildAdminApiHeaders } from '@/shared/api/admin-api'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'
import type { AdminUser } from '@/shared/auth'
import type { DashboardLocationOption } from '../lib/helpers'
import type { DashboardAreaBoundary, DashboardContact, DashboardIncident } from './types'

const API_BASE_URL = getEmergencyApiBaseUrl()
const OFFICIAL_SOURCE = 'chingchai/OpenGISData-Thailand'
const OPEN_INCIDENT_DETAIL_EVENT = 'smart-emergency:open-incident-detail'
const PENDING_INCIDENT_DETAIL_KEY = 'smart-emergency:pending-incident-detail'

interface UseDashboardMapDataInput {
  user: AdminUser | null
  loadIncidentsError: string
  loadContactsError: string
  loadError: string
}

export function useDashboardMapData({
  user,
  loadIncidentsError,
  loadContactsError,
  loadError,
}: UseDashboardMapDataInput) {
  const [incidents, setIncidents] = useState<DashboardIncident[]>([])
  const [contacts, setContacts] = useState<DashboardContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * โหลดข้อมูลที่ map/queue ใช้ร่วมกัน
   *
   * endpoint map-points คืน incident แบบเบาสำหรับ marker/popup ส่วน contacts ใช้ทำ marker หน่วยงาน
   * reload นี้ถูกเรียกทั้งตอน mount และตอน realtime event เพื่อให้ queue/map/detail เห็นข้อมูลชุดเดียวกัน
   */
  const reload = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const headers = buildAdminApiHeaders(user)
      const [incidentResponse, contactResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/incidents/map-points`, { headers }),
        fetch(`${API_BASE_URL}/api/contacts`, { headers }),
      ])

      if (!incidentResponse.ok) throw new Error(loadIncidentsError)
      if (!contactResponse.ok) throw new Error(loadContactsError)

      setIncidents((await incidentResponse.json()) as DashboardIncident[])
      setContacts((await contactResponse.json()) as DashboardContact[])
    } catch (mapLoadError) {
      setError(mapLoadError instanceof Error ? mapLoadError.message : loadError)
    } finally {
      setIsLoading(false)
    }
  }, [loadContactsError, loadError, loadIncidentsError, user])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    window.addEventListener('smart-emergency:incident-created', reload)
    window.addEventListener('smart-emergency:incident-status-updated', reload)
    return () => {
      window.removeEventListener('smart-emergency:incident-created', reload)
      window.removeEventListener('smart-emergency:incident-status-updated', reload)
    }
  }, [reload])

  return {
    incidents,
    contacts,
    isLoading,
    error,
    reload,
  }
}

export function useDashboardIncidentDetailController() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null)
  const [isIncidentDetailOpen, setIsIncidentDetailOpen] = useState(false)

  const openIncidentDetail = useCallback((incidentId: string) => {
    setSelectedIncidentId(incidentId)
    setIsIncidentDetailOpen(true)
  }, [])

  const closeIncidentDetail = useCallback(() => {
    setIsIncidentDetailOpen(false)
  }, [])

  const clearSelectedIncident = useCallback(() => {
    setSelectedIncidentId(null)
    setIsIncidentDetailOpen(false)
  }, [])

  /**
   * รับคำสั่งเปิด detail จาก alert/notification
   *
   * ถ้า alert ถูกกดจากหน้าอื่น navigation helper จะฝาก incidentId ไว้ใน sessionStorage
   * hook นี้เป็นคนหยิบมาเปิด panel เมื่อกลับเข้าหน้า dashboard
   */
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
  }, [openIncidentDetail])

  return {
    selectedIncidentId,
    setSelectedIncidentId,
    isIncidentDetailOpen,
    setIsIncidentDetailOpen,
    openIncidentDetail,
    closeIncidentDetail,
    clearSelectedIncident,
  }
}

export function useSelectedDashboardAreaBounds(selectedLocation: DashboardLocationOption | null) {
  const [selectedLocationBounds, setSelectedLocationBounds] = useState<AreaMapBounds | null>(null)
  const activeRequestRef = useRef<DashboardLocationOption | null>(null)

  /**
   * โหลด geometry ของจังหวัด/อำเภอที่เลือกเพื่อให้ IncidentMap fit bounds ได้
   *
   * ใช้ activeRequestRef กัน response เก่าที่มาช้ากว่า selection ล่าสุด
   */
  useEffect(() => {
    if (!selectedLocation) {
      activeRequestRef.current = null
      setSelectedLocationBounds(null)
      return
    }

    const controller = new AbortController()
    const params = new URLSearchParams({
      areaType: selectedLocation.areaType,
      source: OFFICIAL_SOURCE,
      includeGeometry: 'true',
    })

    activeRequestRef.current = selectedLocation

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
        if (activeRequestRef.current !== selectedLocation) return

        setSelectedLocationBounds(getPolygonBounds(areas[0]?.polygon ?? null))
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setSelectedLocationBounds(null)
      }
    }

    loadSelectedLocationBounds()
    return () => controller.abort()
  }, [selectedLocation])

  return selectedLocationBounds
}
