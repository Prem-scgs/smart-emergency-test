'use client'

import { useEffect, useMemo, useState } from 'react'
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup, useMap } from '@/components/ui/map'
import { useAdminI18n } from '@/shared/i18n/admin'
import { getIncidentTrackingStatusMeta, type IncidentWorkflowStatus } from '@/entities/incident'
import { cn } from '@/lib/utils'
import { getIncidentMapDisplayNumber } from '../lib/helpers'

export interface IncidentMapPoint {
  id: string
  caseNumber?: string | null
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  latitude: number
  longitude: number
  markerColor: string
  areaName: string | null
  areaColor: string | null
  createdAt: string
}

export interface IncidentMapProps {
  incidents: IncidentMapPoint[]
  selectedIncidentId?: string | null
  selectedAreaBounds?: [[number, number], [number, number]] | null
  categoryLabels?: Record<string, string>
  onSelectIncident?: (incidentId: string) => void
  useCurrentLocation?: boolean
}

const DEFAULT_CENTER: [number, number] = [100.533, 13.7465]

const workflowStatuses = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

function MapViewport({
  selectedIncident,
  selectedAreaBounds,
  userLocation,
}: {
  selectedIncident: IncidentMapPoint | null
  selectedAreaBounds: [[number, number], [number, number]] | null
  userLocation: [number, number] | null
}) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    if (selectedIncident) {
      map.flyTo({
        center: [selectedIncident.longitude, selectedIncident.latitude],
        zoom: 15.5,
        duration: 650,
      })
      return
    }

    if (selectedAreaBounds) {
      map.fitBounds(selectedAreaBounds, {
        padding: 44,
        maxZoom: 13,
        duration: 650,
      })
      return
    }

    if (userLocation) {
      map.easeTo({
        center: userLocation,
        zoom: 13,
        duration: 650,
      })
    }
  }, [isLoaded, map, selectedAreaBounds, selectedIncident, userLocation])

  return null
}

export function IncidentMap({
  incidents,
  selectedIncidentId = null,
  selectedAreaBounds = null,
  categoryLabels = {},
  onSelectIncident,
  useCurrentLocation = false,
}: IncidentMapProps) {
  const { language, t } = useAdminI18n()
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const center: [number, number] = incidents[0]
    ? [incidents[0].longitude, incidents[0].latitude]
    : DEFAULT_CENTER
  const selectedIncident = useMemo(
    () => incidents.find(incident => incident.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  )

  useEffect(() => {
    if (!useCurrentLocation || typeof navigator === 'undefined' || !navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation([position.coords.longitude, position.coords.latitude])
      },
      () => {
        setUserLocation(null)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 5_000,
      }
    )
  }, [useCurrentLocation])

  function getStatusLabel(status: string) {
    if (status === 'open') return t('incidentStatusOpen')
    if (!workflowStatuses.has(status as IncidentWorkflowStatus)) return status
    const meta = getIncidentTrackingStatusMeta(status as IncidentWorkflowStatus)
    return language === 'en' ? meta.label : meta.labelTh
  }

  return (
    <Map
      center={center}
      zoom={14}
      className="isolate z-0 h-full w-full overflow-hidden rounded-[inherit]"
      minZoom={4}
      maxZoom={18}
    >
      <MapControls position="top-left" showZoom showCompass />
      <MapViewport
        selectedIncident={selectedIncident}
        selectedAreaBounds={selectedAreaBounds}
        userLocation={userLocation}
      />
      {userLocation && (
        <MapMarker longitude={userLocation[0]} latitude={userLocation[1]}>
          <MarkerContent>
            <span className="block size-4 rounded-full border-2 border-background bg-sky-500 shadow-lg ring-4 ring-sky-500/25" />
          </MarkerContent>
        </MapMarker>
      )}
      {incidents.map((incident) => (
        <MapMarker
          key={incident.id}
          longitude={incident.longitude}
          latitude={incident.latitude}
          onClick={() => onSelectIncident?.(incident.id)}
        >
          <MarkerContent>
            <span
              className={cn(
                'block rounded-full border-2 border-background shadow-lg ring-ring/40',
                selectedIncidentId === incident.id ? 'size-6 ring-4' : 'size-5 ring-2'
              )}
              style={{ backgroundColor: incident.markerColor }}
            />
          </MarkerContent>
          <MarkerPopup>
            <div className="flex min-w-44 flex-col gap-1 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
              <p className="font-medium">{categoryLabels[incident.category] ?? incident.category}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {language === 'en' ? 'Case' : 'หมายเลขเหตุ'}: {getIncidentMapDisplayNumber(incident)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('incidentMapStatusLabel')}: {getStatusLabel(incident.status)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('incidentMapAreaLabel')}: {incident.areaName ?? t('dashboardOutsideArea')}
              </p>
            </div>
          </MarkerPopup>
        </MapMarker>
      ))}
    </Map>
  )
}
