'use client'

import { useState } from 'react'
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
  FileDown
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

// Extended mock call logs
const mockCallLogs = [
  { id: '1', date: new Date('2024-01-15T10:30:00'), incidentType: 'medical' as EmergencyCategory, agency: 'Emergency Medical Services', phone: '1669', location: 'Pathum Wan, Bangkok', status: 'connected' as CallStatus, duration: 245 },
  { id: '2', date: new Date('2024-01-15T09:45:00'), incidentType: 'police' as EmergencyCategory, agency: 'Central Police Station', phone: '191', location: 'Chatuchak, Bangkok', status: 'connected' as CallStatus, duration: 180 },
  { id: '3', date: new Date('2024-01-15T09:20:00'), incidentType: 'fire' as EmergencyCategory, agency: 'Fire Station District 1', phone: '199', location: 'Silom, Bangkok', status: 'no-answer' as CallStatus, duration: 0 },
  { id: '4', date: new Date('2024-01-15T08:55:00'), incidentType: 'rescue' as EmergencyCategory, agency: 'National Rescue Foundation', phone: '1554', location: 'Phuket Town', status: 'connected' as CallStatus, duration: 320 },
  { id: '5', date: new Date('2024-01-15T08:30:00'), incidentType: 'road-accident' as EmergencyCategory, agency: 'Highway Police', phone: '1193', location: 'Pattaya, Chonburi', status: 'busy' as CallStatus, duration: 0 },
  { id: '6', date: new Date('2024-01-14T22:15:00'), incidentType: 'medical' as EmergencyCategory, agency: 'Emergency Medical Services', phone: '1669', location: 'Mueang, Chiang Mai', status: 'connected' as CallStatus, duration: 156 },
  { id: '7', date: new Date('2024-01-14T20:45:00'), incidentType: 'police' as EmergencyCategory, agency: 'Tourist Police', phone: '1155', location: 'Kathu, Phuket', status: 'connected' as CallStatus, duration: 289 },
  { id: '8', date: new Date('2024-01-14T18:30:00'), incidentType: 'fire' as EmergencyCategory, agency: 'Phuket Fire Department', phone: '076-234567', location: 'Mueang Phuket, Phuket', status: 'wrong-number' as CallStatus, duration: 0 },
  { id: '9', date: new Date('2024-01-14T16:20:00'), incidentType: 'elderly' as EmergencyCategory, agency: 'Social Welfare Office', phone: '1300', location: 'Bang Lamung, Chonburi', status: 'connected' as CallStatus, duration: 412 },
  { id: '10', date: new Date('2024-01-14T14:10:00'), incidentType: 'child' as EmergencyCategory, agency: 'Child Protection Services', phone: '1387', location: 'Ratchathewi, Bangkok', status: 'connected' as CallStatus, duration: 523 },
]

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; bgColor: string; label: string }> = {
  'connected': { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10', label: 'Connected' },
  'busy': { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10', label: 'Busy' },
  'no-answer': { icon: PhoneMissed, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'No Answer' },
  'wrong-number': { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Wrong Number' },
  'cancelled': { icon: XCircle, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Cancelled' },
}

export default function CallLogsPage() {
  const [logs] = useState(mockCallLogs)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const filteredLogs = logs.filter(log => {
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success(`Exporting as ${format.toUpperCase()}...`)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Call Logs</CardTitle>
              <CardDescription>View and export emergency call history</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
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
                placeholder="Search by agency, location, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(val) => setDateFilter(val as typeof dateFilter)}>
              <SelectTrigger className="w-full lg:w-36">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as EmergencyCategory | 'all')}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {emergencyCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CallStatus | 'all')}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="no-answer">No Answer</SelectItem>
                <SelectItem value="wrong-number">Wrong Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Incident Type</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No call logs found
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
                            {category?.name}
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
                            {statusConfig[log.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDuration(log.duration)}
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
            <span>Showing {filteredLogs.length} of {logs.length} records</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
