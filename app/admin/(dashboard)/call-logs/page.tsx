'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Phone,
  PhoneMissed,
  RefreshCw,
  Search,
  Shield,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { CallStatus, EmergencyCategory } from '@/lib/types'

const API_BASE_URL = 'http://localhost:4000'

interface ApiIncident {
  id: string
  category: EmergencyCategory
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: string
  description: string | null
  agencyContactId: string | null
  agencyName: string | null
  agencyPhone: string | null
  province: string | null
  district: string | null
  accuracy: number | null
  callStatus: CallStatus | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  color: string
  bgColor: string
}

const fallbackCategories: EmergencyCategoryInfo[] = [
  { id: 'police', name: 'ตำรวจ', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'medical', name: 'การแพทย์', color: 'text-red-600', bgColor: 'bg-red-100' },
  { id: 'fire', name: 'ดับเพลิง', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { id: 'rescue', name: 'กู้ภัย', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  { id: 'flood', name: 'ภัยพิบัติ', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { id: 'road-accident', name: 'จราจร', color: 'text-amber-600', bgColor: 'bg-amber-100' },
]

const categoryLabels: Record<string, string> = {
  police: 'ตำรวจ',
  medical: 'การแพทย์',
  fire: 'ดับเพลิง',
  rescue: 'กู้ภัย',
  flood: 'ภัยพิบัติ',
  'road-accident': 'จราจร',
}

const dateFilterLabels: Record<'all' | 'today' | 'week' | 'month', string> = {
  all: 'ทั้งหมด',
  today: 'วันนี้',
  week: 'สัปดาห์นี้',
  month: 'เดือนนี้',
}

function selectLabel(label: string) {
  return (
    <span data-slot="select-value" className="flex flex-1 items-center gap-1.5 text-left">
      {label}
    </span>
  )
}

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; labelTh: string }> = {
  connected: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    labelTh: 'เชื่อมต่อสำเร็จ',
  },
  busy: {
    icon: AlertCircle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    labelTh: 'สายไม่ว่าง',
  },
  'no-answer': {
    icon: PhoneMissed,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    labelTh: 'ไม่รับสาย',
  },
  'wrong-number': {
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    labelTh: 'หมายเลขผิด',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    labelTh: 'ยกเลิก',
  },
}

function getCallStatus(incident: ApiIncident): CallStatus {
  if (incident.callStatus) return incident.callStatus
  if (incident.status === 'closed') return 'connected'
  if (incident.status === 'acknowledged') return 'connected'
  return 'no-answer'
}

function getLocation(incident: ApiIncident) {
  const parts = [incident.district, incident.province].filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  return `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CallLogsPage() {
  const { canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = getFilteredCategories()

  const [incidents, setIncidents] = useState<ApiIncident[]>([])
  const [categories, setCategories] = useState<EmergencyCategoryInfo[]>(fallbackCategories)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  async function loadCallLogs() {
    try {
      setIsLoading(true)
      setError(null)

      const [incidentsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/incidents`),
        fetch(`${API_BASE_URL}/api/reference/categories`),
      ])

      if (!incidentsResponse.ok) {
        throw new Error('โหลดบันทึกการโทรไม่สำเร็จ')
      }

      setIncidents((await incidentsResponse.json()) as ApiIncident[])

      if (categoriesResponse.ok) {
        const apiCategories = (await categoriesResponse.json()) as EmergencyCategoryInfo[]
        if (apiCategories.length > 0) {
          setCategories(apiCategories)
        }
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'โหลดบันทึกการโทรไม่สำเร็จ'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCallLogs()
  }, [])

  const availableCategories = useMemo(() => {
    if (isSuperAdmin) return categories
    return categories.filter(category => allowedCategories.includes(category.id))
  }, [allowedCategories, categories, isSuperAdmin])

  const baseFilteredLogs = useMemo(() => {
    if (isSuperAdmin) return incidents
    return incidents.filter(incident => allowedCategories.includes(incident.category))
  }, [allowedCategories, incidents, isSuperAdmin])

  const filteredLogs = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase('th-TH')

    return baseFilteredLogs.filter(incident => {
      const callStatus = getCallStatus(incident)
      const location = getLocation(incident)
      const categoryLabel = categoryLabels[incident.category] ?? incident.category
      const searchable = [
        incident.agencyName,
        incident.agencyPhone,
        incident.description,
        incident.category,
        categoryLabel,
        incident.province,
        incident.district,
        location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('th-TH')

      const matchesSearch = !keyword || searchable.includes(keyword)
      const matchesCategory = categoryFilter === 'all' || incident.category === categoryFilter
      const matchesStatus = statusFilter === 'all' || callStatus === statusFilter

      const now = new Date()
      const logDate = new Date(incident.createdAt)
      let matchesDate = true
      if (dateFilter === 'today') {
        matchesDate = logDate.toDateString() === now.toDateString()
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= weekAgo
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = logDate >= monthAgo
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDate
    })
  }, [baseFilteredLogs, categoryFilter, dateFilter, searchQuery, statusFilter])

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`กำลังส่งออกเป็น ${format.toUpperCase()}...`)
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {!isSuperAdmin && agency && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold">{agency.nameTh}</h2>
                <p className="text-sm text-muted-foreground">บันทึกการโทรของหน่วยงาน</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>บันทึกการโทร</CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? 'ดูและส่งออกประวัติการโทรฉุกเฉินจากฐานข้อมูล'
                  : `ประวัติการโทรของ${agency?.nameTh || 'หน่วยงาน'}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadCallLogs} disabled={isLoading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                โหลดใหม่
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    ส่งออก
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>รูปแบบไฟล์</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileText className="mr-2 h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามหน่วยงาน สถานที่ เบอร์โทร หรือรายละเอียด..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={value => setDateFilter(value as typeof dateFilter)}>
              <SelectTrigger className="w-full lg:w-36">
                <Calendar className="mr-2 h-4 w-4" />
                {selectLabel(dateFilterLabels[dateFilter])}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="week">สัปดาห์นี้</SelectItem>
                <SelectItem value="month">เดือนนี้</SelectItem>
              </SelectContent>
            </Select>
            {(isSuperAdmin || availableCategories.length > 1) && (
              <Select
                value={categoryFilter}
                onValueChange={value => setCategoryFilter(value as EmergencyCategory | 'all')}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  {selectLabel(
                    categoryFilter === 'all'
                      ? 'ทุกประเภท'
                      : categoryLabels[categoryFilter] ?? categoryFilter
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {categoryLabels[category.id] ?? category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={value => setStatusFilter(value as CallStatus | 'all')}>
              <SelectTrigger className="w-full lg:w-44">
                {selectLabel(statusFilter === 'all' ? 'ทุกสถานะ' : statusConfig[statusFilter].labelTh)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="connected">เชื่อมต่อสำเร็จ</SelectItem>
                <SelectItem value="busy">สายไม่ว่าง</SelectItem>
                <SelectItem value="no-answer">ไม่รับสาย</SelectItem>
                <SelectItem value="wrong-number">หมายเลขผิด</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>เวลา</TableHead>
                  <TableHead>สถานที่</TableHead>
                  <TableHead>ประเภทเหตุ</TableHead>
                  <TableHead>หน่วยงาน</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      กำลังโหลดบันทึกการโทร...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-destructive">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      ไม่พบบันทึกการโทร
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(incident => {
                    const category = categories.find(item => item.id === incident.category)
                    const callStatus = getCallStatus(incident)
                    const StatusIcon = statusConfig[callStatus].icon
                    const agencyName = incident.agencyName ?? 'ยังไม่ระบุหน่วยงาน'
                    const agencyPhone = incident.agencyPhone ?? '-'

                    return (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(incident.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(incident.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {getLocation(incident)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(category?.bgColor, category?.color)}>
                            {categoryLabels[incident.category] ?? category?.name ?? incident.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{agencyName}</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {agencyPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(statusConfig[callStatus].bgColor, statusConfig[callStatus].color)}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig[callStatus].labelTh}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              แสดง {filteredLogs.length} จาก {baseFilteredLogs.length} รายการ
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
