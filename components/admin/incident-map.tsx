'use client'

import 'leaflet/dist/leaflet.css'

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
}

const DEFAULT_CENTER: [number, number] = [13.7465, 100.533]

const categoryLabels: Record<string, string> = {
  police: 'ตำรวจ',
  medical: 'การแพทย์',
  fire: 'ดับเพลิง',
  rescue: 'กู้ภัย',
  flood: 'ภัยพิบัติ',
  'road-accident': 'จราจร',
}

const statusLabels: Record<string, string> = {
  open: 'เปิดอยู่',
  acknowledged: 'รับเรื่องแล้ว',
  closed: 'ปิดเรื่องแล้ว',
}

export function IncidentMap({ incidents }: IncidentMapProps) {
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
          radius={9}
          pathOptions={{
            color: incident.markerColor,
            fillColor: incident.markerColor,
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-medium">{categoryLabels[incident.category] ?? incident.category}</p>
              <p>สถานะ: {statusLabels[incident.status] ?? incident.status}</p>
              <p>พื้นที่: {incident.areaName ?? 'นอกพื้นที่ที่จัดการ'}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
