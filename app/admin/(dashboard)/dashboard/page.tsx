'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { 
  Phone, 
  AlertTriangle, 
  Building2, 
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Shield,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, Line, LineChart } from 'recharts'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import type { IncidentMapPoint } from '@/components/admin/incident-map'

const API_BASE_URL = 'http://localhost:4000'
const IncidentMap = dynamic(
  () => import('@/components/admin/incident-map').then(mod => mod.IncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading map...
      </div>
    ),
  }
)

const chartConfig = {
  calls: {
    label: 'Calls',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const statusColors: Record<string, string> = {
  active: 'bg-destructive text-destructive-foreground',
  responding: 'bg-warning text-warning-foreground',
  resolved: 'bg-success text-success-foreground',
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

const readableCategoryLabels: Record<string, string> = {
  fire: 'Fire',
  medical: 'Medical',
  police: 'Police',
  rescue: 'Rescue',
  flood: 'Flood',
  'road-accident': 'Road accident',
}

interface DashboardContact {
  id: string
  category: string
  active: boolean
}

function getReadableCategoryLabel(category: string) {
  return readableCategoryLabels[category] ?? category
}

export default function DashboardPage() {
  const { user, canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  const [incidentPoints, setIncidentPoints] = useState<IncidentMapPoint[]>([])
  const [dashboardContacts, setDashboardContacts] = useState<DashboardContact[]>([])
  const [isIncidentLoading, setIsIncidentLoading] = useState(true)
  const [incidentError, setIncidentError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = getFilteredCategories()

  async function loadIncidentPoints() {
    try {
      setIsIncidentLoading(true)
      setIncidentError(null)

      const [incidentResponse, contactResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/incidents/map-points`),
        fetch(`${API_BASE_URL}/api/contacts`),
      ])
      if (!incidentResponse.ok) {
        throw new Error('Failed to load incident logs')
      }

      const incidentData = (await incidentResponse.json()) as IncidentMapPoint[]
      setIncidentPoints(incidentData)

      if (contactResponse.ok) {
        const contactData = (await contactResponse.json()) as DashboardContact[]
        setDashboardContacts(contactData)
      }
    } catch (error) {
      setIncidentError(error instanceof Error ? error.message : 'Failed to load incident logs')
    } finally {
      setIsIncidentLoading(false)
    }
  }

  useEffect(() => {
    loadIncidentPoints()
  }, [])

  const roleFilteredIncidentPoints = useMemo(() => {
    return incidentPoints.filter(point =>
      isSuperAdmin || allowedCategories.includes(point.category as typeof allowedCategories[number])
    )
  }, [allowedCategories, incidentPoints, isSuperAdmin])

  const filteredStats = useMemo(() => {
    const callsByCategory = roleFilteredIncidentPoints.reduce<Record<string, number>>((acc, point) => {
      acc[point.category] = (acc[point.category] ?? 0) + 1
      return acc
    }, {})

    const callsByProvince = roleFilteredIncidentPoints.reduce<Record<string, number>>((acc, point) => {
      const area = point.areaName ?? 'Outside area'
      acc[area] = (acc[area] ?? 0) + 1
      return acc
    }, {})

    const relevantContacts = dashboardContacts.filter(contact =>
      isSuperAdmin || allowedCategories.includes(contact.category as typeof allowedCategories[number])
    )
    const resolved = roleFilteredIncidentPoints.filter(point => point.status === 'closed').length
    const successRate = roleFilteredIncidentPoints.length
      ? Math.round((resolved / roleFilteredIncidentPoints.length) * 100)
      : 0

    return {
      totalCallsToday: roleFilteredIncidentPoints.length,
      activeIncidents: roleFilteredIncidentPoints.filter(point => point.status !== 'closed').length,
      totalAgencies: relevantContacts.length,
      avgResponseTime: roleFilteredIncidentPoints.length ? 4.2 : 0,
      callsByCategory,
      callsByProvince,
      successRate,
    }
  }, [allowedCategories, dashboardContacts, isSuperAdmin, roleFilteredIncidentPoints])

  const stats = useMemo(() => [
    {
      title: 'การโทรวันนี้',
      value: filteredStats.totalCallsToday.toLocaleString(),
      change: '+12%',
      trend: 'up',
      icon: Phone,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'เหตุการณ์ที่กำลังดำเนินการ',
      value: filteredStats.activeIncidents.toString(),
      change: '-5%',
      trend: 'down',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: isSuperAdmin ? 'หน่วยงานทั้งหมด' : 'หน่วยงานของคุณ',
      value: filteredStats.totalAgencies.toLocaleString(),
      change: isSuperAdmin ? '+3' : '-',
      trend: 'up',
      icon: Building2,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
    },
    {
      title: 'เวลาตอบสนองเฉลี่ย',
      value: `${filteredStats.avgResponseTime} นาที`,
      change: '-0.3 นาที',
      trend: 'down',
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ], [filteredStats, isSuperAdmin])

  // Chart data filtered by allowed categories
  const categoryChartData = useMemo(() => {
    return Object.entries(filteredStats.callsByCategory)
      .filter(([key]) => allowedCategories.includes(key as typeof allowedCategories[number]))
      .map(([key, value]) => ({
        category: categoryLabels[key] || key,
        calls: value,
      }))
      .sort((a, b) => b.calls - a.calls)
  }, [filteredStats, allowedCategories])

  const provinceChartData = useMemo(() => {
    return Object.entries(filteredStats.callsByProvince)
      .map(([province, calls]) => ({
        province,
        calls,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5)
  }, [filteredStats])

  const hourlyData = useMemo(() => {
    const buckets = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
    const counts = Object.fromEntries(buckets.map(hour => [hour, 0])) as Record<string, number>

    roleFilteredIncidentPoints.forEach(point => {
      const hour = new Date(point.createdAt).getHours()
      const bucketStart = Math.floor(hour / 4) * 4
      const key = `${bucketStart.toString().padStart(2, '0')}:00`
      counts[key] = (counts[key] ?? 0) + 1
    })

    return buckets.map(hour => ({ hour, calls: counts[hour] ?? 0 }))
  }, [roleFilteredIncidentPoints])

  const incidentCategories = useMemo(
    () => Array.from(new Set(incidentPoints.map(point => point.category))).sort(),
    [incidentPoints]
  )

  const incidentAreas = useMemo(
    () =>
      Array.from(
        new Set(
          incidentPoints.map(point => point.areaName ?? 'Outside managed area')
        )
      ).sort(),
    [incidentPoints]
  )

  const filteredIncidentPoints = useMemo(() => {
    return incidentPoints.filter(point => {
      const matchesCategory = categoryFilter === 'all' || point.category === categoryFilter
      const areaName = point.areaName ?? 'Outside managed area'
      const matchesArea = areaFilter === 'all' || areaName === areaFilter
      const matchesRole = isSuperAdmin || allowedCategories.includes(point.category as typeof allowedCategories[number])

      return matchesCategory && matchesArea && matchesRole
    })
  }, [allowedCategories, areaFilter, categoryFilter, incidentPoints, isSuperAdmin])

  const incidentSummary = useMemo(() => {
    return incidentCategories
      .map(category => {
        const categoryPoints = filteredIncidentPoints.filter(point => point.category === category)
        const sample = incidentPoints.find(point => point.category === category)

        return {
          category,
          count: categoryPoints.length,
          color: sample?.markerColor ?? '#64748b',
          areaName: categoryPoints[0]?.areaName ?? 'Outside managed area',
        }
      })
      .filter(item => item.count > 0)
  }, [filteredIncidentPoints, incidentCategories, incidentPoints])

  const recentIncidents = useMemo(() => {
    return roleFilteredIncidentPoints.slice(0, 5).map(point => ({
      id: point.id,
      typeName: getReadableCategoryLabel(point.category),
      location: point.areaName ?? 'Outside managed area',
      time: new Date(point.createdAt).toLocaleString(),
      status: point.status === 'closed'
        ? 'resolved'
        : point.status === 'acknowledged'
          ? 'responding'
          : 'active',
    }))
  }, [roleFilteredIncidentPoints])

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Agency Header for non-superadmin */}
      {!isSuperAdmin && agency && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{agency.nameTh}</h2>
                <p className="text-sm text-muted-foreground">{agency.description}</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {user?.role === 'agency-admin' ? 'ผู้ดูแลหน่วยงาน' : 'เจ้าหน้าที่'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Superadmin Header */}
      {isSuperAdmin && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">ศูนย์บัญชาการเหตุฉุกเฉินแห่งชาติ</h2>
                <p className="text-sm text-muted-foreground">ดูแลและจัดการทุกหน่วยงานในระบบ</p>
              </div>
              <Badge variant="default" className="ml-auto">
                Superadmin
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', stat.bgColor)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
                {stat.change !== '-' && (
                  <div className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    stat.trend === 'up' ? 'text-success' : 'text-primary'
                  )}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Incident Map and Logs */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-[420px] overflow-hidden">
              <IncidentMap incidents={filteredIncidentPoints} />
              <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold">Incident Map</p>
                <p className="text-xs text-muted-foreground">
                  {filteredIncidentPoints.length} / {incidentPoints.length} logs shown
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">เหตุการณ์</h2>
                <p className="mt-1 text-xs text-muted-foreground">ดู log ตามประเภทและพื้นที่</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('all')
                  setAreaFilter('all')
                  loadIncidentPoints()
                }}
                disabled={isIncidentLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                ล้างตัวกรอง
              </Button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">เหตุการณ์</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="ทุกเหตุการณ์" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกเหตุการณ์</SelectItem>
                    {incidentCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {getReadableCategoryLabel(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">พื้นที่</Label>
                <Select value={areaFilter} onValueChange={setAreaFilter}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="ทุกพื้นที่" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกพื้นที่</SelectItem>
                    {incidentAreas.map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold">ทั้งหมด {filteredIncidentPoints.length} เหตุการณ์</p>
              <div className="mt-3 space-y-3">
                {isIncidentLoading ? (
                  <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
                ) : incidentError ? (
                  <p className="text-sm text-destructive">{incidentError}</p>
                ) : incidentSummary.length > 0 ? (
                  incidentSummary.map(item => (
                    <div key={item.category} className="flex items-start gap-3">
                      <span
                        className="mt-1 h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{getReadableCategoryLabel(item.category)}</p>
                        <p className="text-xs text-muted-foreground">พื้นที่: {item.areaName}</p>
                        <p className="text-xs text-muted-foreground">จำนวน: {item.count} ครั้ง</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่มีข้อมูลเหตุการณ์</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Calls by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {isSuperAdmin ? 'การโทรตามประเภท' : `การโทร - ${agency?.nameTh}`}
            </CardTitle>
            <CardDescription>
              {isSuperAdmin ? 'ประเภทเหตุฉุกเฉินยอดนิยมวันนี้' : 'สถิติการรับแจ้งเหตุของหน่วยงาน'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={categoryChartData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Calls by Province */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">การโทรตามจังหวัด</CardTitle>
            <CardDescription>การกระจายตามพื้นที่</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={provinceChartData}>
                <XAxis dataKey="province" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="calls" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hourly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">แนวโน้มการโทรรายชั่วโมง</CardTitle>
            <CardDescription>ปริมาณการโทรตลอดทั้งวัน</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <LineChart data={hourlyData}>
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="var(--chart-1)" 
                  strokeWidth={2}
                  dot={{ fill: 'var(--chart-1)', strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">อัตราความสำเร็จ</CardTitle>
            <CardDescription>อัตราการเชื่อมต่อสำเร็จ</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg className="h-32 w-32 -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${filteredStats.successRate * 3.52} 352`}
                  className="text-success"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-bold text-foreground">
                  {filteredStats.successRate}%
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {Math.round(filteredStats.totalCallsToday * filteredStats.successRate / 100)} การโทรเชื่อมต่อสำเร็จ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">เหตุการณ์ล่าสุด</CardTitle>
              <CardDescription>
                {isSuperAdmin ? 'อัปเดตเหตุการณ์แบบเรียลไทม์' : `เหตุการณ์ของ${agency?.nameTh}`}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              ดูทั้งหมด
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีเหตุการณ์ในขณะนี้
            </div>
          ) : (
            <div className="space-y-4">
              {recentIncidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={statusColors[incident.status]}>
                      {incident.status === 'active' ? 'ดำเนินการ' : 
                       incident.status === 'responding' ? 'กำลังตอบสนอง' : 'แก้ไขแล้ว'}
                    </Badge>
                    <div>
                      <p className="font-medium text-foreground">เหตุฉุกเฉิน{incident.typeName}</p>
                      <p className="text-sm text-muted-foreground">{incident.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{incident.time}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>ดูรายละเอียด</DropdownMenuItem>
                        <DropdownMenuItem>มอบหมายหน่วย</DropdownMenuItem>
                        <DropdownMenuItem>ทำเครื่องหมายว่าแก้ไขแล้ว</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
