'use client'

import { useState } from 'react'
import { 
  History, 
  Filter, 
  Phone,
  CheckCircle2,
  Clock,
  PhoneMissed,
  PhoneOff,
  XCircle,
  ChevronRight,
  ArrowLeft,
  Calendar,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { mockCallLogs, emergencyCategories } from '@/lib/mock-data'
import { CallStatus, EmergencyCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

interface IncidentHistoryScreenProps {
  onBack: () => void
  onViewTracking?: (incidentId: string, category: EmergencyCategory) => void
}

const statusConfig: Record<CallStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  'connected': { icon: CheckCircle2, color: 'text-success', label: 'Connected' },
  'busy': { icon: Clock, color: 'text-warning', label: 'Busy' },
  'no-answer': { icon: PhoneMissed, color: 'text-muted-foreground', label: 'No Answer' },
  'wrong-number': { icon: PhoneOff, color: 'text-destructive', label: 'Wrong Number' },
  'cancelled': { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
}

export function IncidentHistoryScreen({ onBack, onViewTracking }: IncidentHistoryScreenProps) {
  const [filter, setFilter] = useState<EmergencyCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CallStatus | 'all'>('all')

  const filteredLogs = mockCallLogs.filter(log => {
    if (filter !== 'all' && log.incidentType !== filter) return false
    if (statusFilter !== 'all' && log.status !== statusFilter) return false
    return true
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

  return (
    <div className="flex flex-col min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Incident History</h1>
            <p className="text-xs text-muted-foreground">{filteredLogs.length} records</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(val) => setFilter(val as EmergencyCategory | 'all')}>
            <SelectTrigger className="flex-1">
              <Filter className="h-4 w-4 mr-2" />
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
            <SelectTrigger className="flex-1">
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No incident history found</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const category = emergencyCategories.find(c => c.id === log.incidentType)
              const StatusIcon = statusConfig[log.status].icon

              return (
                <Card 
                  key={log.id} 
                  className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onViewTracking?.(log.id, log.incidentType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className={cn(
                            'text-xs',
                            category?.bgColor,
                            category?.color
                          )}>
                            {category?.name}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', statusConfig[log.status].color)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[log.status].label}
                          </Badge>
                        </div>

                        <h3 className="font-medium text-foreground">
                          {log.agency.agencyName}
                        </h3>
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(log.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.date)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {log.location.district}, {log.location.province}
                        </div>

                        {log.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            {log.notes}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
