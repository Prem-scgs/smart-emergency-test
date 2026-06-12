'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, MapPinned, Phone, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GisBoundary } from '@/components/admin/gis-boundary-map'
import { getEmergencyCategoryLabel } from '@/lib/emergency-category-utils'

const API_BASE_URL = 'http://localhost:4000'
const OFFICIAL_SOURCE = 'chingchai/OpenGISData-Thailand'

const GisBoundaryMap = dynamic(
  () => import('@/components/admin/gis-boundary-map').then(mod => mod.GisBoundaryMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  }
)

interface AreaContact {
  id: string
  name: string
  phone: string
  category: string | null
  province: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  active: boolean
}

interface AreaIncident {
  id: string
  category: string
  severity: string
  status: string
  description: string | null
  latitude: number
  longitude: number
  createdAt: string
}

function areaLabel(area: GisBoundary) {
  return area.areaType === 'district'
    ? `${area.districtNameTh ?? area.name}, ${area.provinceNameTh ?? area.provinceNameEn ?? '-'}`
    : area.provinceNameTh ?? area.name
}

function provinceDisplay(area: GisBoundary) {
  return area.provinceNameTh ?? area.provinceNameEn ?? area.name
}

function districtDisplay(area: GisBoundary) {
  return area.districtNameTh ?? area.districtNameEn ?? area.name
}

function searchableText(area: GisBoundary) {
  return [
    area.name,
    area.provinceNameTh,
    area.provinceNameEn,
    area.districtNameTh,
    area.districtNameEn,
    area.provinceCode,
    area.districtCode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('th-TH')
    .normalize('NFC')
}

function areaTypeLabel(areaType: string) {
  const labels: Record<string, string> = {
    province: 'จังหวัด',
    district: 'อำเภอ/เขต',
    subdistrict: 'ตำบล/แขวง',
    'response-zone': 'เขตรับผิดชอบ',
  }
  return labels[areaType] ?? areaType
}

function categoryLabel(category: string | null) {
  return getEmergencyCategoryLabel(category)
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'เปิดอยู่',
    acknowledged: 'รับเรื่องแล้ว',
    closed: 'ปิดเรื่องแล้ว',
  }
  return labels[status] ?? status
}

function geometryPointCount(area: GisBoundary) {
  const coordinates = area.polygon?.coordinates
  if (!Array.isArray(coordinates)) return 0

  if (area.polygon?.type === 'Polygon') {
    return coordinates.reduce((sum, ring) => sum + (Array.isArray(ring) ? ring.length : 0), 0)
  }

  return coordinates.reduce((sum, polygon) => {
    if (!Array.isArray(polygon)) return sum
    return sum + polygon.reduce((ringSum, ring) => ringSum + (Array.isArray(ring) ? ring.length : 0), 0)
  }, 0)
}

export default function GISPage() {
  const [provinces, setProvinces] = useState<GisBoundary[]>([])
  const [districts, setDistricts] = useState<GisBoundary[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('')
  const [selectedArea, setSelectedArea] = useState<GisBoundary | null>(null)
  const [areaContacts, setAreaContacts] = useState<AreaContact[]>([])
  const [areaIncidents, setAreaIncidents] = useState<AreaIncident[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isProvinceLoading, setIsProvinceLoading] = useState(true)
  const [isDistrictLoading, setIsDistrictLoading] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  async function loadProvinces() {
    try {
      setIsProvinceLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/api/areas?areaType=province&source=${encodeURIComponent(OFFICIAL_SOURCE)}&includeGeometry=false`
      )
      if (!response.ok) throw new Error('Failed to load provinces')
      const data = (await response.json()) as GisBoundary[]
      setProvinces(data)

      const defaultProvince =
        data.find(area => area.provinceNameEn === 'Bangkok') ?? data[0]
      if (defaultProvince?.provinceCode) {
        setSelectedProvinceCode(defaultProvince.provinceCode)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load provinces')
    } finally {
      setIsProvinceLoading(false)
    }
  }

  async function loadDistricts(provinceCode: string) {
    if (!provinceCode) return

    try {
      setIsDistrictLoading(true)
      setSelectedArea(null)
      setAreaContacts([])
      setAreaIncidents([])

      const response = await fetch(
        `${API_BASE_URL}/api/areas?areaType=district&provinceCode=${encodeURIComponent(provinceCode)}&source=${encodeURIComponent(OFFICIAL_SOURCE)}&includeGeometry=true`
      )
      if (!response.ok) throw new Error('Failed to load districts')
      const data = (await response.json()) as GisBoundary[]
      setDistricts(data)
      setSelectedArea(data[0] ?? null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load districts')
    } finally {
      setIsDistrictLoading(false)
    }
  }

  async function loadAreaDetails(area: GisBoundary | null) {
    if (!area) return

    try {
      setIsDetailLoading(true)
      const [contactsResponse, incidentsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/areas/${area.id}/contacts`),
        fetch(`${API_BASE_URL}/api/areas/${area.id}/incidents`),
      ])

      if (!contactsResponse.ok) throw new Error('Failed to load contacts in area')
      if (!incidentsResponse.ok) throw new Error('Failed to load incidents in area')

      setAreaContacts((await contactsResponse.json()) as AreaContact[])
      setAreaIncidents((await incidentsResponse.json()) as AreaIncident[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load area details')
    } finally {
      setIsDetailLoading(false)
    }
  }

  useEffect(() => {
    loadProvinces()
  }, [])

  useEffect(() => {
    loadDistricts(selectedProvinceCode)
  }, [selectedProvinceCode])

  useEffect(() => {
    loadAreaDetails(selectedArea)
  }, [selectedArea])

  const selectedProvince = useMemo(
    () => provinces.find(area => area.provinceCode === selectedProvinceCode) ?? null,
    [provinces, selectedProvinceCode]
  )

  const filteredDistricts = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase('th-TH').normalize('NFC')
    if (!keyword) return districts
    return districts.filter(area => searchableText(area).includes(keyword))
  }, [districts, searchTerm])

  const matchedProvince = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase('th-TH').normalize('NFC')
    if (!keyword) return null
    return provinces.find(area => searchableText(area).includes(keyword)) ?? null
  }, [provinces, searchTerm])

  function updateSearchTerm(value: string) {
    setSearchTerm(value)

    const keyword = value.trim().toLocaleLowerCase('th-TH').normalize('NFC')
    if (!keyword) return

    const province = provinces.find(area => searchableText(area).includes(keyword))
    if (province?.provinceCode && province.provinceCode !== selectedProvinceCode) {
      setSelectedProvinceCode(province.provinceCode)
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">จัดการพื้นที่ GIS</h1>
          <p className="text-sm text-muted-foreground">
            จัดการขอบเขตจังหวัดและอำเภอสำหรับตรวจสอบพิกัดด้วย PostGIS
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            loadProvinces()
            if (selectedProvinceCode) loadDistricts(selectedProvinceCode)
          }}
          disabled={isProvinceLoading || isDistrictLoading}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          โหลดใหม่
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">ขอบเขตจังหวัด</p>
            <p className="mt-2 text-3xl font-semibold">{provinces.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">อำเภอ/เขตที่โหลด</p>
            <p className="mt-2 text-3xl font-semibold">{districts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">เบอร์ในพื้นที่ที่เลือก</p>
            <p className="mt-2 text-3xl font-semibold">{areaContacts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">เหตุการณ์ในพื้นที่ที่เลือก</p>
            <p className="mt-2 text-3xl font-semibold">{areaIncidents.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">รายการขอบเขตพื้นที่</CardTitle>
            <CardDescription>โหลดทีละจังหวัดเพื่อให้แผนที่ทำงานเร็ว</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>จังหวัด</Label>
              <Select
                value={selectedProvinceCode}
                onValueChange={setSelectedProvinceCode}
                disabled={isProvinceLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกจังหวัด" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map(province => (
                    <SelectItem key={province.id} value={province.provinceCode ?? province.id}>
                      {provinceDisplay(province)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={event => updateSearchTerm(event.target.value)}
                placeholder="ค้นหาจังหวัด หรือ อำเภอ/เขต"
                className="pl-9"
              />
            </div>
            {matchedProvince?.provinceCode && matchedProvince.provinceCode !== selectedProvinceCode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProvinceCode(matchedProvince.provinceCode ?? '')}
              >
                ไปจังหวัด {provinceDisplay(matchedProvince)}
              </Button>
            )}

            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {isDistrictLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดอำเภอ/เขต...
                </div>
              ) : filteredDistricts.length > 0 ? (
                filteredDistricts.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`w-full rounded-md border p-3 text-left transition ${
                      selectedArea?.id === area.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{districtDisplay(area)}</p>
                        <p className="text-xs text-muted-foreground">
                          {area.provinceNameTh ?? area.provinceNameEn} / {area.districtCode}
                        </p>
                      </div>
                      <Badge variant="outline">{areaTypeLabel(area.areaType)}</Badge>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {matchedProvince
                    ? `กำลังแสดงอำเภอ/เขตในจังหวัด ${provinceDisplay(matchedProvince)}`
                    : 'ไม่พบอำเภอ/เขต'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPinned className="h-4 w-4" />
                {selectedProvince ? provinceDisplay(selectedProvince) : 'แผนที่จังหวัด'}
              </CardTitle>
              <CardDescription>
                คลิกขอบเขตอำเภอ/เขตเพื่อดูเบอร์และเหตุการณ์ที่อยู่ในพื้นที่
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[520px]">
                <div className="relative h-full">
                  <GisBoundaryMap
                    areas={districts}
                    selectedAreaId={selectedArea?.id ?? null}
                    contacts={areaContacts}
                    incidents={areaIncidents}
                    onSelectArea={setSelectedArea}
                  />
                  <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      <span>เบอร์ฉุกเฉิน</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
                      <span>เหตุการณ์</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedArea ? areaLabel(selectedArea) : 'Selected Area'}
                </CardTitle>
                <CardDescription>
                  {selectedArea
                    ? `${geometryPointCount(selectedArea).toLocaleString()} geometry points`
                    : 'เลือกอำเภอ/เขตจากแผนที่หรือรายการ'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedArea ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">จังหวัด</p>
                        <p className="font-medium">{selectedArea.provinceNameTh ?? selectedArea.provinceNameEn ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">รหัสอำเภอ/เขต</p>
                        <p className="font-medium">{selectedArea.districtCode ?? '-'}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{areaTypeLabel(selectedArea.areaType)}</Badge>
                      <Badge variant="outline">{selectedArea.source ?? 'local'}</Badge>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่ได้เลือกพื้นที่</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  เบอร์ในพื้นที่
                </CardTitle>
                <CardDescription>คำนวณจาก PostGIS ST_Contains</CardDescription>
              </CardHeader>
              <CardContent>
                {isDetailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังโหลดข้อมูลพื้นที่...
                  </div>
                ) : areaContacts.length > 0 ? (
                  <div className="space-y-3">
                    {areaContacts.map(contact => (
                      <div key={contact.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phone}</p>
                          </div>
                    <Badge variant={contact.active ? 'default' : 'secondary'}>
                            {categoryLabel(contact.category)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่พบเบอร์ในพื้นที่นี้</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                  เหตุการณ์ในพื้นที่
                </CardTitle>
              <CardDescription>ตรวจพิกัดเหตุการณ์กับขอบเขตพื้นที่ที่เลือก</CardDescription>
            </CardHeader>
            <CardContent>
              {isDetailLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดเหตุการณ์...
                </div>
              ) : areaIncidents.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {areaIncidents.map(incident => (
                    <div key={incident.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{categoryLabel(incident.category)}</p>
                          <p className="text-xs text-muted-foreground">
                            {incident.description ?? 'No description'}
                          </p>
                        </div>
                        <Badge variant="outline">{statusLabel(incident.status)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                  <p className="text-sm text-muted-foreground">ไม่พบเหตุการณ์ในพื้นที่นี้</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
