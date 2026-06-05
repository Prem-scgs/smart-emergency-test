'use client'

import { useMemo } from 'react'
import { 
  Phone, 
  AlertTriangle, 
  Building2, 
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { mockDashboardStats, emergencyCategories } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'

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

export default function DashboardPage() {
  const { user, canViewAllAgencies, getFilteredCategories, getUserAgency } = useAuth()
  
  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const allowedCategories = getFilteredCategories()

  // Filter stats based on user role
  const filteredStats = useMemo(() => {
    if (isSuperAdmin) {
      return mockDashboardStats
    }
    
    // For agency users, only show their category data
    const agencyCategory = agency?.category
    if (!agencyCategory) return mockDashboardStats
    
    const categoryCallCount = mockDashboardStats.callsByCategory[agencyCategory] || 0
    const totalCategoryCalls = Object.values(mockDashboardStats.callsByCategory).reduce((a, b) => a + b, 0)
    const ratio = categoryCallCount / totalCategoryCalls
    
    return {
      totalCallsToday: categoryCallCount,
      activeIncidents: Math.round(mockDashboardStats.activeIncidents * ratio),
      totalAgencies: 1, // Only their own agency
      avgResponseTime: mockDashboardStats.avgResponseTime,
      callsByCategory: { [agencyCategory]: categoryCallCount },
      callsByProvince: Object.fromEntries(
        Object.entries(mockDashboardStats.callsByProvince).map(([k, v]) => [k, Math.round(v * ratio)])
      ),
      successRate: mockDashboardStats.successRate,
    }
  }, [isSuperAdmin, agency])

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

  const hourlyData = [
    { hour: '00:00', calls: isSuperAdmin ? 45 : 8 },
    { hour: '04:00', calls: isSuperAdmin ? 23 : 4 },
    { hour: '08:00', calls: isSuperAdmin ? 89 : 15 },
    { hour: '12:00', calls: isSuperAdmin ? 156 : 26 },
    { hour: '16:00', calls: isSuperAdmin ? 234 : 39 },
    { hour: '20:00', calls: isSuperAdmin ? 178 : 30 },
    { hour: '23:00', calls: isSuperAdmin ? 67 : 11 },
  ]

  // Filter recent incidents by category for agency users
  const recentIncidents = useMemo(() => {
    const allIncidents = [
      { id: 1, type: 'medical', typeName: 'การแพทย์', location: 'ปทุมวัน, กรุงเทพฯ', time: '2 นาทีที่แล้ว', status: 'active' },
      { id: 2, type: 'fire', typeName: 'ดับเพลิง', location: 'จตุจักร, กรุงเทพฯ', time: '5 นาทีที่แล้ว', status: 'responding' },
      { id: 3, type: 'police', typeName: 'ตำรวจ', location: 'สีลม, กรุงเทพฯ', time: '12 นาทีที่แล้ว', status: 'resolved' },
      { id: 4, type: 'rescue', typeName: 'กู้ภัย', location: 'ภูเก็ต', time: '18 นาทีที่แล้ว', status: 'active' },
      { id: 5, type: 'road-accident', typeName: 'อุบัติเหตุจราจร', location: 'พัทยา, ชลบุรี', time: '25 นาทีที่แล้ว', status: 'responding' },
    ]
    
    if (isSuperAdmin) return allIncidents
    return allIncidents.filter(i => allowedCategories.includes(i.type as typeof allowedCategories[number]))
  }, [isSuperAdmin, allowedCategories])

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
