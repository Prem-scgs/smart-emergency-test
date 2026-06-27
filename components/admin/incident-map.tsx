'use client'

import 'leaflet/dist/leaflet.css'

import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { useAdminI18n } from '@/lib/admin-i18n'
import { getIncidentTrackingStatusMeta, type IncidentWorkflowStatus } from '@/lib/incident-tracking'

export interface IncidentMapPoint {
  id: string
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

interface IncidentMapProps {
  incidents: IncidentMapPoint[]
  selectedIncidentId?: string | null
  categoryLabels?: Record<string, string>
  onSelectIncident?: (incidentId: string) => void
}

const DEFAULT_CENTER: [number, number] = [13.7465, 100.533]

const workflowStatuses = new Set<IncidentWorkflowStatus>([
  'reported',
  'acknowledged',
  'coordinating',
  'dispatched',
  'on_scene',
  'closed',
])

export function IncidentMap({
  incidents,
  selectedIncidentId = null,
  categoryLabels = {},
  onSelectIncident,
}: IncidentMapProps) {
  const { language, t } = useAdminI18n()
  const center: [number, number] = incidents[0]
    ? [incidents[0].latitude, incidents[0].longitude]
    : DEFAULT_CENTER

  function getStatusLabel(status: string) {
    if (status === 'open') return t('incidentStatusOpen')
    if (!workflowStatuses.has(status as IncidentWorkflowStatus)) return status
    const meta = getIncidentTrackingStatusMeta(status as IncidentWorkflowStatus)
    return language === 'en' ? meta.label : meta.labelTh
  }

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      className="isolate z-0 h-full w-full"
      style={{ minHeight: 420 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((incident) => (
        <CircleMarker
          key={incident.id}
          center={[incident.latitude, incident.longitude]}
          radius={selectedIncidentId === incident.id ? 12 : 9}
          pathOptions={{
            color: incident.markerColor,
            fillColor: incident.markerColor,
            fillOpacity: 0.9,
            weight: selectedIncidentId === incident.id ? 4 : 2,
          }}
          eventHandlers={{
            click: () => onSelectIncident?.(incident.id),
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-medium">{categoryLabels[incident.category] ?? incident.category}</p>
              <p>{t('incidentMapStatusLabel')}: {getStatusLabel(incident.status)}</p>
              <p>{t('incidentMapAreaLabel')}: {incident.areaName ?? t('dashboardOutsideArea')}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
