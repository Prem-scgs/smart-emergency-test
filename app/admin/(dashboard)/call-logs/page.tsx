'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Download,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PhoneMissed,
  FileSpreadsheet,
  FileText,
  FileDown,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { emergencyCategories } from '@/lib/mock-data'
import { CallStatus, EmergencyCategory } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

// Extended mock call logs
const mockCallLogs = [
  { id: '1', date: new Date('2024-01-15T10:30:00'), incidentType: 'medical' as EmergencyCategory, agency: 'หน่วยแพทย์ฉุกเฉิน', phone: '1669', location: 'ปทุมวัน, กรุงเทพฯ', status: 'connected' as CallStatus },
  { id: '2', date: new Date('2024-01-15T09:45:00'), incidentType: 'police' as EmergencyCategory, agency: 'สถานีตำรวจนครบาลปทุมวัน', phone: '191', location: 'จตุจักร, กรุงเทพฯ', status: 'connected' as CallStatus },
  { id: '3', date: new Date('2024-01-15T09:20:00'), incidentType: 'fire' as EmergencyCategory, agency: 'สถานีดับเพลิง เขต 1', phone: '199', location: 'สีลม, กรุงเทพฯ', status: 'no-answer' as CallStatus },
  { id: '4', date: new Date('2024-01-15T08:55:00'), incidentType: 'rescue' as EmergencyCategory, agency: 'มูลนิธิร่วมกตัญญู', phone: '1554', location: 'เมืองภูเก็ต', status: 'connected' as CallStatus },
  { id: '5', date: new Date('2024-01-15T08:30:00'), incidentType: 'road-accident' as EmergencyCategory, agency: 'ตำรวจทางหลวง', phone: '1193', location: 'พัทยา, ชลบุรี', status: 'busy' as CallStatus },
  { id: '6', date: new Date('2024-01-14T22:15:00'), incidentType: 'medical' as EmergencyCategory, agency: 'หน่วยแพทย์ฉุกเฉิน', phone: '1669', location: 'เมือง, เชียงใหม่', status: 'connected' as CallStatus },
  { id: '7', date: new Date('2024-01-14T20:45:00'), incidentType: 'police' as EmergencyCategory, agency: 'ตำรวจท่องเที่ยว', phone: '1155', location: 'กะทู้, ภูเก็ต', status: 'connected' as CallStatus },
  { id: '8', date: new Date('2024-01-14T18:30:00'), incidentType: 'fire' as EmergencyCategory, agency: 'สถานีดับเพลิงภูเก็ต', phone: '076-234567', location: 'เมืองภูเก็ต', status: 'wrong-number' as CallStatus },
  { id: '9', date: new Date('2024-01-14T16:20:00'), incidentType: 'flood' as EmergencyCategory, agency: 'ศูนย์ป้องกันภัยพิบัติ', phone: '1784', location: 'บางละมุง, ชลบุรี', status: 'connected' as CallStatus },
  { id: '10', date: new Date('2024-01-14T14:10:00'), incidentType: 'rescue' as EmergencyCategory, agency: 'มูลนิธิปอเต็กตึ๊ง', phone: '1418', location: 'ราชเทวี, กรุงเทพฯ', status: 'connected' as CallStatus },
]

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string; labelTh: string }> = {
  'connected': { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10', label: 'Connected', labelTh: 'เชื่อมต่อสำเร็จ' },
  'busy': { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10', label: 'Busy', labelTh: 'สายไม่ว่าง' },
  'no-answer': { icon: PhoneMissed, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'No Answer', labelTh: 'ไม่รับสาย' },
  'wrong-number': { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Wrong Number', labelTh: 'หมายเลขผิด' },
  'cancelled': { icon: XCircle, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Cancelled', labelTh: 'ยกเลิก' },
}

// Category labels in Thai
const categoryLabels: Record<string, string> = {
  police: 'ตำรวจ',
  medical: 'การแพทย์',
  fire: 'ดับเพลิง',
  rescue: 'กู้ภัย',
  flood: 'ภัยพิบัติ',
  'road-accident': 'จราจร',
}

export default function CallLogsPage() {
  const { canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = getFilteredCategories()

  // Filter logs based on user role
  const baseFilteredLogs = useMemo(() => {
    if (isSuperAdmin) return mockCallLogs
    return mockCallLogs.filter(log => allowedCategories.includes(log.incidentType))
  }, [isSuperAdmin, allowedCategories])

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Get available categories for filter dropdown
  const availableCategories = useMemo(() => {
    if (isSuperAdmin) return emergencyCategories
    return emergencyCategories.filter(cat => allowedCategories.includes(cat.id))
  }, [isSuperAdmin, allowedCategories])

  const filteredLogs = useMemo(() => {
    return baseFilteredLogs.filter(log => {
      const matchesSearch = 
        log.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.phone.includes(searchQuery)
      const matchesCategory = categoryFilter === 'all' || log.incidentType === categoryFilter
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter

      // Date filter
      const now = new Date()
      const logDate = new Date(log.date)
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
  }, [baseFilteredLogs, searchQuery, categoryFilter, statusFilter, dateFilter])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`กำลังส่งออกเป็น ${format.toUpperCase()}...`)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Agency Header for non-superadmin */}
      {!isSuperAdmin && agency && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>บันทึกการโทร</CardTitle>
              <CardDescription>
                {isSuperAdmin 
                  ? 'ดูและส่งออกประวัติการโทรฉุกเฉินทั้งหมด' 
                  : `ประวัติการโทรของ${agency?.nameTh || 'หน่วยงาน'}`
                }
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาตามหน่วยงาน, สถานที่, หรือเบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as typeof dateFilter)}>
              <SelectTrigger className="w-full lg:w-36">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="วันที่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="week">สัปดาห์นี้</SelectItem>
                <SelectItem value="month">เดือนนี้</SelectItem>
              </SelectContent>
            </Select>
            {/* Only show category filter for superadmin or if agency has multiple categories */}
            {(isSuperAdmin || availableCategories.length > 1) && (
              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as EmergencyCategory | 'all')}>
                <SelectTrigger className="w-full lg:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="ประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {categoryLabels[cat.id] || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CallStatus | 'all')}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="สถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="connected">เชื่อมต่อสำเร็จ</SelectItem>
                <SelectItem value="busy">สายไม่ว่าง</SelectItem>
                <SelectItem value="no-answer">ไม่รับสาย</SelectItem>
                <SelectItem value="wrong-number">หมายเลขผิด</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
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
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      ไม่พบบันทึกการโทร
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const category = emergencyCategories.find(c => c.id === log.incidentType)
                    const StatusIcon = statusConfig[log.status].icon
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(log.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {formatTime(log.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {log.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn(category?.bgColor, category?.color)}>
                            {categoryLabels[log.incidentType] || category?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.agency}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {log.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              statusConfig[log.status].bgColor,
                              statusConfig[log.status].color
                            )}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig[log.status].labelTh}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>แสดง {filteredLogs.length} จาก {baseFilteredLogs.length} รายการ</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
