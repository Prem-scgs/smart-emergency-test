'use client'

import { 
  Phone, 
  AlertTriangle, 
  Building2, 
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Bar, BarChart, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer } from 'recharts'
import { mockDashboardStats, emergencyCategories } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const stats = [
  {
    title: 'Total Calls Today',
    value: mockDashboardStats.totalCallsToday.toLocaleString(),
    change: '+12%',
    trend: 'up',
    icon: Phone,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Active Incidents',
    value: mockDashboardStats.activeIncidents.toString(),
    change: '-5%',
    trend: 'down',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    title: 'Total Agencies',
    value: mockDashboardStats.totalAgencies.toLocaleString(),
    change: '+3',
    trend: 'up',
    icon: Building2,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    title: 'Avg Response Time',
    value: `${mockDashboardStats.avgResponseTime} min`,
    change: '-0.3 min',
    trend: 'down',
    icon: Clock,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
]

// Chart data
const categoryChartData = Object.entries(mockDashboardStats.callsByCategory)
  .map(([key, value]) => ({
    category: emergencyCategories.find(c => c.id === key)?.name.split(' ')[0] || key,
    calls: value,
  }))
  .sort((a, b) => b.calls - a.calls)
  .slice(0, 6)

const provinceChartData = Object.entries(mockDashboardStats.callsByProvince)
  .map(([province, calls]) => ({
    province,
    calls,
  }))
  .sort((a, b) => b.calls - a.calls)

const hourlyData = [
  { hour: '00:00', calls: 45 },
  { hour: '04:00', calls: 23 },
  { hour: '08:00', calls: 89 },
  { hour: '12:00', calls: 156 },
  { hour: '16:00', calls: 234 },
  { hour: '20:00', calls: 178 },
  { hour: '23:00', calls: 67 },
]

const chartConfig = {
  calls: {
    label: 'Calls',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

const recentIncidents = [
  { id: 1, type: 'Medical', location: 'Pathum Wan, Bangkok', time: '2 min ago', status: 'active' },
  { id: 2, type: 'Fire', location: 'Chatuchak, Bangkok', time: '5 min ago', status: 'responding' },
  { id: 3, type: 'Police', location: 'Silom, Bangkok', time: '12 min ago', status: 'resolved' },
  { id: 4, type: 'Rescue', location: 'Phuket Town', time: '18 min ago', status: 'active' },
  { id: 5, type: 'Road Accident', location: 'Pattaya, Chonburi', time: '25 min ago', status: 'responding' },
]

const statusColors: Record<string, string> = {
  active: 'bg-destructive text-destructive-foreground',
  responding: 'bg-warning text-warning-foreground',
  resolved: 'bg-success text-success-foreground',
}

export default function DashboardPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', stat.bgColor)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
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
            <CardTitle className="text-lg">Calls by Category</CardTitle>
            <CardDescription>Top emergency categories today</CardDescription>
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
            <CardTitle className="text-lg">Calls by Province</CardTitle>
            <CardDescription>Distribution across regions</CardDescription>
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
            <CardTitle className="text-lg">Hourly Call Trend</CardTitle>
            <CardDescription>Call volume throughout the day</CardDescription>
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
            <CardTitle className="text-lg">Call Success Rate</CardTitle>
            <CardDescription>Overall connection rate</CardDescription>
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
                  strokeDasharray={`${mockDashboardStats.successRate * 3.52} 352`}
                  className="text-success"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-bold text-foreground">
                  {mockDashboardStats.successRate}%
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {Math.round(mockDashboardStats.totalCallsToday * mockDashboardStats.successRate / 100)} calls connected successfully
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Incidents</CardTitle>
              <CardDescription>Live incident updates</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <Badge className={statusColors[incident.status]}>
                    {incident.status}
                  </Badge>
                  <div>
                    <p className="font-medium text-foreground">{incident.type} Emergency</p>
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
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Assign Unit</DropdownMenuItem>
                      <DropdownMenuItem>Mark Resolved</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
