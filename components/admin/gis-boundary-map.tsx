'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Map,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MarkerContent,
  MarkerPopup,
  useMap,
  type MapGeoJSONEvent,
} from '@/components/ui/map'
import {
  buildAreaFeatureCollection,
  getAreaIncidentSeverityColor,
  getAreasBounds,
  type AreaFeatureProperties,
} from '@/entities/area'
import { cn } from '@/lib/utils'
import type { MultiPolygon, Polygon } from 'geojson'

export interface GisBoundary {
  id: string
  name: string
  color: string
  areaType: string
  source: string | null
  sourceCode: string | null
  provinceCode: string | null
  provinceNameTh: string | null
  provinceNameEn: string | null
  districtCode: string | null
  districtNameTh: string | null
  districtNameEn: string | null
  polygon: Polygon | MultiPolygon | null
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
  preferThai?: boolean
  categoryLabels?: Record<string, string>
  contactFallbackLabel?: string
  areaFallbackLabel?: string
  statusLabels?: Record<string, string>
  severityLabels?: Record<string, string>
}

const DEFAULT_CENTER: [number, number] = [100.5018, 13.7563]

function FitBounds({ areas, selectedAreaId }: { areas: GisBoundary[]; selectedAreaId: string | null }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return
    const selectedArea = selectedAreaId
      ? areas.find(area => area.id === selectedAreaId)
      : null
    const bounds = getAreasBounds(selectedArea ? [selectedArea] : areas)
    if (!bounds) return

    map.fitBounds(bounds, { padding: 32, maxZoom: selectedArea ? 13 : 11, duration: 500 })
  }, [areas, isLoaded, map, selectedAreaId])

  return null
}

export function GisBoundaryMap({
  areas,
  selectedAreaId,
  contacts,
  incidents,
  onSelectArea,
  preferThai = true,
  categoryLabels = {},
  contactFallbackLabel = 'contact',
  areaFallbackLabel = 'Area',
  statusLabels = {},
  severityLabels = {},
}: GisBoundaryMapProps) {
  const [areaPopup, setAreaPopup] = useState<{
    longitude: number
    latitude: number
    name: string
  } | null>(null)

  const features = useMemo(
    () => buildAreaFeatureCollection(areas, preferThai),
    [areas, preferThai]
  )

  function handleAreaClick(event: MapGeoJSONEvent<AreaFeatureProperties>) {
    const areaId = event.feature.properties.id
    const area = areas.find(item => item.id === areaId)
    if (!area) return

    setAreaPopup({
      longitude: event.longitude,
      latitude: event.latitude,
      name: event.feature.properties.name ?? areaFallbackLabel,
    })
    onSelectArea(area)
  }

  return (
    <Map
      center={DEFAULT_CENTER}
      zoom={6}
      className="isolate z-0 h-full w-full overflow-hidden rounded-[inherit]"
      minZoom={4}
      maxZoom={18}
    >
      <MapControls position="top-left" showZoom showCompass />
      <FitBounds areas={areas} selectedAreaId={selectedAreaId} />
      <MapGeoJSON<AreaFeatureProperties>
        id="gis-boundaries"
        data={features}
        promoteId="id"
        interactive
        fillPaint={{
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['==', ['get', 'id'], selectedAreaId ?? ''],
            0.3,
            0.12,
          ],
        }}
        fillHoverPaint={{
          'fill-opacity': 0.24,
        }}
        linePaint={{
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['==', ['get', 'id'], selectedAreaId ?? ''],
            3,
            1.4,
          ],
        }}
        onClick={handleAreaClick}
      />
      {areaPopup && (
        <MapPopup
          longitude={areaPopup.longitude}
          latitude={areaPopup.latitude}
          onClose={() => setAreaPopup(null)}
        >
          <div className="rounded-lg border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground shadow-md">
            {areaPopup.name}
          </div>
        </MapPopup>
      )}
      {contacts
        .filter(contact => contact.latitude != null && contact.longitude != null)
        .map(contact => (
          <MapMarker
            key={`contact-${contact.id}`}
            longitude={contact.longitude as number}
            latitude={contact.latitude as number}
          >
            <MarkerContent>
              <span className="block size-3.5 rounded-full border-2 border-background bg-blue-600 shadow-md ring-2 ring-blue-600/30" />
            </MarkerContent>
            <MarkerPopup>
              <div className="flex min-w-40 flex-col gap-1 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
                <p className="text-sm text-muted-foreground">
                  {categoryLabels[contact.category ?? ''] ?? contact.category ?? contactFallbackLabel}
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}
      {incidents.map(incident => (
        <MapMarker
          key={`incident-${incident.id}`}
          longitude={incident.longitude}
          latitude={incident.latitude}
        >
          <MarkerContent>
            <span
              className={cn(
                'block size-5 rounded-full border-2 border-background shadow-md ring-2',
              )}
              style={{
                backgroundColor: getAreaIncidentSeverityColor(incident.severity),
                '--tw-ring-color': `${getAreaIncidentSeverityColor(incident.severity)}55`,
              } as React.CSSProperties}
            />
          </MarkerContent>
          <MarkerPopup>
            <div className="flex min-w-40 flex-col gap-1 rounded-lg border bg-popover p-3 text-popover-foreground shadow-md">
              <p className="font-medium">{categoryLabels[incident.category] ?? incident.category}</p>
              <p className="text-sm text-muted-foreground">{statusLabels[incident.status] ?? incident.status}</p>
              <p className="text-sm text-muted-foreground">{severityLabels[incident.severity] ?? incident.severity}</p>
            </div>
          </MarkerPopup>
        </MapMarker>
      ))}
    </Map>
  )
}
