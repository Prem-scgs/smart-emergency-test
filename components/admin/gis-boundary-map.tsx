'use client'

import 'leaflet/dist/leaflet.css'

import L from 'leaflet'
import { useEffect } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'

export interface GisBoundary {
  id: string
  name: string
  color: string
  areaType: string
  provinceCode: string | null
  provinceNameEn: string | null
  districtCode: string | null
  districtNameEn: string | null
  polygon: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: unknown
  } | null
}

interface GisBoundaryMapProps {
  areas: GisBoundary[]
  selectedAreaId: string | null
  contacts: Array<{
    id: string
    name: string
    phone: string
    category: string | null
    latitude: number | null
    longitude: number | null
  }>
  incidents: Array<{
    id: string
    category: string
    severity: string
    status: string
    latitude: number
    longitude: number
  }>
  onSelectArea: (area: GisBoundary) => void
}

const DEFAULT_CENTER: [number, number] = [13.7563, 100.5018]

function FitBounds({ areas }: { areas: GisBoundary[] }) {
  const map = useMap()

  useEffect(() => {
    const features = areas
      .filter(area => area.polygon)
      .map(area => ({
        type: 'Feature',
        properties: { id: area.id },
        geometry: area.polygon,
      }))

    if (features.length === 0) {
      return
    }

    const layer = L.geoJSON({
      type: 'FeatureCollection',
      features,
    } as never)
    const bounds = layer.getBounds()

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 })
    }
  }, [areas, map])

  return null
}

function incidentColor(severity: string) {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  }
  return colors[severity] ?? '#64748b'
}

export function GisBoundaryMap({
  areas,
  selectedAreaId,
  contacts,
  incidents,
  onSelectArea,
}: GisBoundaryMapProps) {
  const features = areas
    .filter(area => area.polygon)
    .map(area => ({
      type: 'Feature',
      properties: {
        id: area.id,
        name: area.districtNameTh ?? area.provinceNameTh ?? area.name,
        color: area.color,
      },
      geometry: area.polygon,
    }))

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={6}
      scrollWheelZoom
      className="h-full w-full"
      style={{ minHeight: 520 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds areas={areas} />
      <GeoJSON
        key={`${areas.map(area => area.id).join('-')}-${selectedAreaId ?? 'none'}`}
        data={{
          type: 'FeatureCollection',
          features,
        } as never}
        style={(feature) => {
          const id = feature?.properties?.id as string | undefined
          const color = (feature?.properties?.color as string | undefined) ?? '#2563eb'
          const selected = id === selectedAreaId
          return {
            color,
            weight: selected ? 3 : 1.4,
            fillColor: color,
            fillOpacity: selected ? 0.28 : 0.12,
          }
        }}
        onEachFeature={(feature, layer) => {
          layer.on('click', () => {
            const area = areas.find(item => item.id === feature.properties?.id)
            if (area) {
              onSelectArea(area)
            }
          })
          layer.bindTooltip(String(feature.properties?.name ?? 'Area'), {
            sticky: true,
          })
        }}
      />
      {contacts
        .filter(contact => contact.latitude != null && contact.longitude != null)
        .map(contact => (
          <CircleMarker
            key={`contact-${contact.id}`}
            center={[contact.latitude as number, contact.longitude as number]}
            radius={6}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#2563eb',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-medium">{contact.name}</p>
                <p>{contact.phone}</p>
                <p>{contact.category ?? 'contact'}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      {incidents.map(incident => (
        <CircleMarker
          key={`incident-${incident.id}`}
          center={[incident.latitude, incident.longitude]}
          radius={8}
          pathOptions={{
            color: incidentColor(incident.severity),
            fillColor: incidentColor(incident.severity),
            fillOpacity: 0.88,
            weight: 2,
          }}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-medium">{incident.category}</p>
              <p>{incident.status}</p>
              <p>{incident.severity}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
