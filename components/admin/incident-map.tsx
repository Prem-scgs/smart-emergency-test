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

export function IncidentMap({ incidents }: IncidentMapProps) {
  const center: [number, number] = incidents[0]
    ? [incidents[0].latitude, incidents[0].longitude]
    : DEFAULT_CENTER

  return (
    <MapContainer
      center={center}
      zoom={14}
      scrollWheelZoom
      className="h-full w-full"
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
              <p className="font-medium capitalize">{incident.category}</p>
              <p>Status: {incident.status}</p>
              <p>Area: {incident.areaName ?? 'Outside managed area'}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
