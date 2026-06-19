'use client'

import 'leaflet/dist/leaflet.css'

import { getEmergencyCategoryLabel } from '@/lib/emergency-category-utils'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'

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
  onSelectIncident?: (incidentId: string) => void
}

const DEFAULT_CENTER: [number, number] = [13.7465, 100.533]

const statusLabels: Record<string, string> = {
  open: 'เปิดอยู่',
  reported: 'แจ้งเหตุแล้ว',
  acknowledged: 'รับเรื่องแล้ว',
  coordinating: 'กำลังประสานงาน',
  dispatched: 'ส่งเจ้าหน้าที่แล้ว',
  on_scene: 'ถึงที่เกิดเหตุ',
  closed: 'ปิดเหตุ',
}

export function IncidentMap({
  incidents,
  selectedIncidentId = null,
  onSelectIncident,
}: IncidentMapProps) {
  const center: [number, number] = incidents[0]
    ? [incidents[0].latitude, incidents[0].longitude]
    : DEFAULT_CENTER

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
              <p className="font-medium">{getEmergencyCategoryLabel(incident.category, incident.category)}</p>
              <p>สถานะ: {statusLabels[incident.status] ?? incident.status}</p>
              <p>พื้นที่: {incident.areaName ?? 'นอกพื้นที่ที่จัดการ'}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
