"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  MapPin,
  Phone,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
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
import { buildAdminApiHeaders } from "@/lib/admin-api"
import { useAuth } from "@/lib/auth-context"
import { getEmergencyApiBaseUrl } from "@/lib/emergency-api-url"
import { getEmergencyCategoryLabel } from "@/lib/emergency-category-utils"

const API_BASE_URL = getEmergencyApiBaseUrl()

type ReportRange = "week" | "month" | "quarter" | "year"

interface ReportSummary {
  range: ReportRange
  totals: {
    totalIncidents: number
    activeIncidents: number
    closedIncidents: number
    connectedCalls: number
  }
  byStatus: Array<{ status: string; count: number }>
  byCategory: Array<{ category: string; count: number }>
  byArea: Array<{ areaName: string; count: number }>
  trend: Array<{ bucket: string; count: number; closedCount: number }>
}

const chartConfig = {
  count: { label: "เหตุทั้งหมด", color: "var(--chart-1)" },
  closedCount: { label: "ปิดเคสแล้ว", color: "var(--chart-3)" },
}

const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
]

const statusLabels: Record<string, string> = {
  open: "เปิดเคส",
  reported: "แจ้งเหตุแล้ว",
  acknowledged: "รับเรื่องแล้ว",
  coordinating: "กำลังประสานงาน",
  dispatched: "ส่งเจ้าหน้าที่แล้ว",
  on_scene: "ถึงที่เกิดเหตุ",
  closed: "ปิดเคส",
}

function formatNumber(value: number | undefined) {
  return new Intl.NumberFormat("th-TH").format(value ?? 0)
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value) + "%"
}

function formatDateLabel(value: string) {
  const date = new Date(value + "T00:00:00")
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("th-TH", { day: "2-digit", month: "short" })
}

export default function ReportsPage() {
  const { user, canViewAllAgencies, getUserAgency } = useAuth()
  const [dateRange, setDateRange] = useState<ReportRange>("month")
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const isSuperAdmin = canViewAllAgencies()
  const agency = getUserAgency()
  const scopeLabel = isSuperAdmin
    ? "สิทธิ์: ทุกหน่วยงาน"
    : "สิทธิ์: " + (agency?.nameTh ?? agency?.name ?? "หน่วยงานของฉัน")

  const closedRate = useMemo(() => {
    const total = reportSummary?.totals.totalIncidents ?? 0
    if (total === 0) return 0
    return ((reportSummary?.totals.closedIncidents ?? 0) / total) * 100
  }, [reportSummary])

  const trendData = useMemo(() => {
    return (reportSummary?.trend ?? []).map(item => ({
      ...item,
      label: formatDateLabel(item.bucket),
    }))
  }, [reportSummary])

  const categoryData = useMemo(() => {
    return (reportSummary?.byCategory ?? []).map((item, index) => ({
      ...item,
      name: getEmergencyCategoryLabel(item.category, item.category),
      color: categoryColors[index % categoryColors.length],
    }))
  }, [reportSummary])

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrorMessage("")
      const response = await fetch(
        API_BASE_URL + "/api/reports/summary?range=" + dateRange,
        { headers: buildAdminApiHeaders(user) }
      )
      if (!response.ok) throw new Error("โหลดรายงานไม่สำเร็จ")
      const data = (await response.json()) as ReportSummary
      setReportSummary(data)
    } catch {
      setErrorMessage("ไม่สามารถโหลดรายงานจากฐานข้อมูลได้")
      setReportSummary(null)
      toast.error("โหลดรายงานไม่สำเร็จ")
    } finally {
      setIsLoading(false)
    }
  }, [dateRange, user])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายงานและสถิติ</h1>
          <p className="text-muted-foreground">
            รายงานจากฐานข้อมูลจริง แสดงข้อมูลตามสิทธิ์ของ role ปัจจุบัน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="min-h-10 px-3">
            {scopeLabel}
          </Badge>
          <Select value={dateRange} onValueChange={value => setDateRange((value ?? "month") as ReportRange)}>
            <SelectTrigger className="w-[170px]">
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
          <Button variant="outline" size="icon" onClick={() => void loadReports()} disabled={isLoading}>
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
          <Button disabled title="ยังไม่เปิดใช้ export ในรอบนี้">
            <Download className="mr-2 h-4 w-4" />
            ส่งออกรายงาน
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {errorMessage}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">เหตุทั้งหมด</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.totalIncidents)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">ตามช่วงเวลาที่เลือก</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">เหตุที่ยังเปิดอยู่</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.activeIncidents)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">ทุกสถานะที่ยังไม่ปิดเคส</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">อัตราปิดเคส</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : formatPercent(closedRate)}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatNumber(reportSummary?.totals.closedIncidents)} รายการปิดแล้ว
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สายที่ติดต่อสำเร็จ</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : formatNumber(reportSummary?.totals.connectedCalls)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">นับจาก call status connected</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calls">สถิติการแจ้งเหตุ</TabsTrigger>
          <TabsTrigger value="categories">หมวดเหตุ</TabsTrigger>
          <TabsTrigger value="locations">พื้นที่</TabsTrigger>
        </TabsList>

        <TabsContent value="calls" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>แนวโน้มการแจ้งเหตุ</CardTitle>
                <CardDescription>จำนวนเหตุทั้งหมดและเคสที่ปิดแล้วรายวัน</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--chart-1)" name="เหตุทั้งหมด" />
                      <Bar dataKey="closedCount" fill="var(--chart-3)" name="ปิดเคสแล้ว" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>สถานะปัจจุบัน</CardTitle>
                <CardDescription>จำนวนเหตุแยกตามสถานะล่าสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(reportSummary?.byStatus ?? []).map(item => (
                    <div key={item.status} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{statusLabels[item.status] ?? item.status}</div>
                        <div className="text-sm text-muted-foreground">{item.status}</div>
                      </div>
                      <Badge variant="secondary">{formatNumber(item.count)}</Badge>
                    </div>
                  ))}
                  {!isLoading && (reportSummary?.byStatus.length ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลในช่วงเวลานี้</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>สัดส่วนหมวดเหตุ</CardTitle>
                <CardDescription>แบ่งตามหมวดเหตุจาก incident category</CardDescription>
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
                        dataKey="count"
                        nameKey="name"
                      >
                        {categoryData.map(item => (
                          <Cell key={item.category} fill={item.color} />
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
                <CardTitle>รายละเอียดหมวดเหตุ</CardTitle>
                <CardDescription>เรียงตามจำนวนเหตุสูงสุด</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map(item => (
                    <div key={item.category} className="flex items-center gap-4">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{formatNumber(item.count)}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width:
                                (reportSummary?.totals.totalIncidents ?? 0) > 0
                                  ? Math.max(4, (item.count / (reportSummary?.totals.totalIncidents ?? 1)) * 100) + "%"
                                  : "0%",
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!isLoading && categoryData.length === 0 && (
                    <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลหมวดเหตุในช่วงเวลานี้</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                พื้นที่ที่มีเหตุการณ์มากที่สุด
              </CardTitle>
              <CardDescription>จัดอันดับจาก province/district ที่บันทึกใน incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>อันดับ</TableHead>
                    <TableHead>พื้นที่</TableHead>
                    <TableHead className="text-right">จำนวนเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(reportSummary?.byArea ?? []).map((area, index) => (
                    <TableRow key={area.areaName}>
                      <TableCell>
                        <Badge variant="outline">{index + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{area.areaName}</TableCell>
                      <TableCell className="text-right">{formatNumber(area.count)}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (reportSummary?.byArea.length ?? 0) === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        ยังไม่มีข้อมูลพื้นที่ในช่วงเวลานี้
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
