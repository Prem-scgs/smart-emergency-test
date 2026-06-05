"use client"

import { useState } from "react"
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Phone,
  Users,
  MapPin,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

// Mock data for charts
const monthlyCallData = [
  { month: "ม.ค.", calls: 1245, resolved: 1180, avgTime: 4.2 },
  { month: "ก.พ.", calls: 1389, resolved: 1320, avgTime: 3.9 },
  { month: "มี.ค.", calls: 1567, resolved: 1489, avgTime: 4.1 },
  { month: "เม.ย.", calls: 1823, resolved: 1756, avgTime: 3.8 },
  { month: "พ.ค.", calls: 1654, resolved: 1598, avgTime: 4.0 },
  { month: "มิ.ย.", calls: 1432, resolved: 1378, avgTime: 4.3 },
]

const categoryData = [
  { name: "การแพทย์ฉุกเฉิน", value: 35, color: "#D32F2F" },
  { name: "เพลิงไหม้", value: 20, color: "#ED6C02" },
  { name: "ตำรวจ/อาชญากรรม", value: 25, color: "#1976D2" },
  { name: "อุบัติเหตุจราจร", value: 15, color: "#7B1FA2" },
  { name: "อื่นๆ", value: 5, color: "#757575" },
]

const hourlyData = [
  { hour: "00:00", calls: 45 },
  { hour: "02:00", calls: 32 },
  { hour: "04:00", calls: 28 },
  { hour: "06:00", calls: 56 },
  { hour: "08:00", calls: 124 },
  { hour: "10:00", calls: 156 },
  { hour: "12:00", calls: 143 },
  { hour: "14:00", calls: 167 },
  { hour: "16:00", calls: 189 },
  { hour: "18:00", calls: 213 },
  { hour: "20:00", calls: 178 },
  { hour: "22:00", calls: 89 },
]

const topLocations = [
  { area: "เขตบางรัก", calls: 234, change: 12 },
  { area: "เขตปทุมวัน", calls: 198, change: -5 },
  { area: "เขตสาทร", calls: 187, change: 8 },
  { area: "เขตพระนคร", calls: 165, change: 15 },
  { area: "เขตดินแดง", calls: 143, change: -3 },
]

const operatorPerformance = [
  {
    name: "สมชาย ผดุงเดช",
    calls: 156,
    avgTime: "3:45",
    satisfaction: 4.8,
    resolved: 98,
  },
  {
    name: "สมหญิง รักดี",
    calls: 143,
    avgTime: "4:12",
    satisfaction: 4.6,
    resolved: 95,
  },
  {
    name: "วิชัย มานะ",
    calls: 138,
    avgTime: "3:58",
    satisfaction: 4.7,
    resolved: 97,
  },
  {
    name: "มานี ใจดี",
    calls: 129,
    avgTime: "4:25",
    satisfaction: 4.5,
    resolved: 94,
  },
  {
    name: "ประยุทธ์ เข้มแข็ง",
    calls: 121,
    avgTime: "4:02",
    satisfaction: 4.4,
    resolved: 93,
  },
]

const chartConfig = {
  calls: { label: "สายทั้งหมด", color: "var(--chart-1)" },
  resolved: { label: "แก้ไขแล้ว", color: "var(--chart-3)" },
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("month")
  const [reportType, setReportType] = useState("overview")

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            รายงานและสถิติ
          </h1>
          <p className="text-muted-foreground">
            วิเคราะห์ข้อมูลและประสิทธิภาพการทำงานของระบบ
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">7 วันที่ผ่านมา</SelectItem>
              <SelectItem value="month">30 วันที่ผ่านมา</SelectItem>
              <SelectItem value="quarter">3 เดือนที่ผ่านมา</SelectItem>
              <SelectItem value="year">1 ปีที่ผ่านมา</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            ส่งออกรายงาน
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สายทั้งหมด</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9,110</div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success">+12.5%</span>
              <span className="text-muted-foreground">จากเดือนที่แล้ว</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">เวลาตอบสนองเฉลี่ย</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.1 นาที</div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingDown className="h-4 w-4 text-success" />
              <span className="text-success">-8.2%</span>
              <span className="text-muted-foreground">ดีขึ้น</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">อัตราการแก้ไข</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95.8%</div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success">+2.1%</span>
              <span className="text-muted-foreground">จากเดือนที่แล้ว</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ผู้ใช้งานใหม่</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success">+18.3%</span>
              <span className="text-muted-foreground">จากเดือนที่แล้ว</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls">สถิติการโทร</TabsTrigger>
          <TabsTrigger value="categories">ประเภทเหตุการณ์</TabsTrigger>
          <TabsTrigger value="locations">พื้นที่</TabsTrigger>
          <TabsTrigger value="operators">ผู้ปฏิบัติงาน</TabsTrigger>
        </TabsList>

        {/* Call Statistics */}
        <TabsContent value="calls" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>แนวโน้มการโทรรายเดือน</CardTitle>
                <CardDescription>
                  เปรียบเทียบสายทั้งหมดและสายที่แก้ไขได้
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyCallData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="calls" fill="var(--chart-1)" name="สายทั้งหมด" />
                      <Bar
                        dataKey="resolved"
                        fill="var(--chart-3)"
                        name="แก้ไขแล้ว"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ปริมาณการโทรตามช่วงเวลา</CardTitle>
                <CardDescription>แสดงช่วงเวลาที่มีการโทรเข้ามากที่สุด</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="calls"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ fill: "var(--chart-1)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Category Statistics */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สัดส่วนประเภทเหตุการณ์</CardTitle>
                <CardDescription>แบ่งตามประเภทของเหตุฉุกเฉิน</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>รายละเอียดตามประเภท</CardTitle>
                <CardDescription>สถิติโดยละเอียดของแต่ละประเภท</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-4">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {cat.value}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${cat.value}%`,
                              backgroundColor: cat.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Location Statistics */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                พื้นที่ที่มีเหตุการณ์มากที่สุด
              </CardTitle>
              <CardDescription>จัดอันดับตามจำนวนการแจ้งเหตุ</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>อันดับ</TableHead>
                    <TableHead>พื้นที่</TableHead>
                    <TableHead className="text-right">จำนวนสาย</TableHead>
                    <TableHead className="text-right">เทียบเดือนก่อน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topLocations.map((loc, index) => (
                    <TableRow key={loc.area}>
                      <TableCell>
                        <Badge variant="outline">{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{loc.area}</TableCell>
                      <TableCell className="text-right">{loc.calls}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            loc.change > 0 ? "text-destructive" : "text-success"
                          }`}
                        >
                          {loc.change > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {Math.abs(loc.change)}%
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operator Performance */}
        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                ประสิทธิภาพผู้ปฏิบัติงาน
              </CardTitle>
              <CardDescription>
                วัดผลประสิทธิภาพของเจ้าหน้าที่รับสาย
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead className="text-right">จำนวนสาย</TableHead>
                    <TableHead className="text-right">เวลาเฉลี่ย</TableHead>
                    <TableHead className="text-right">ความพึงพอใจ</TableHead>
                    <TableHead className="text-right">อัตราแก้ไข</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operatorPerformance.map((op) => (
                    <TableRow key={op.name}>
                      <TableCell className="font-medium">{op.name}</TableCell>
                      <TableCell className="text-right">{op.calls}</TableCell>
                      <TableCell className="text-right">{op.avgTime}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-success text-success-foreground">
                          {op.satisfaction}/5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{op.resolved}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
