"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import {
  AlertTriangle,
  Bell,
  Database,
  Globe,
  Languages,
  Moon,
  Radio,
  RotateCcw,
  Save,
  Server,
  Settings,
  Share2,
  Volume2,
  Waves,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DEFAULT_ADMIN_ALERT_PREFERENCES,
  getStoredAdminAlertPreferences,
  saveAdminAlertPreferences,
  type AlertTonePreset,
} from "@/lib/admin-alert-preferences"
import { useAuth } from "@/lib/auth-context"
import { getEmergencyApiBaseUrl } from "@/lib/emergency-api-url"

const API_BASE_URL = getEmergencyApiBaseUrl()
const ADMIN_SETTINGS_PREFERENCES_KEY = "admin_settings_preferences"

type LanguagePreference = "th" | "en"
type HealthStatus = "checking" | "online" | "offline"
type SseStatus = "connecting" | "connected" | "disconnected" | "unknown"

interface AdminSettingsPreferences {
  language: LanguagePreference
  reducedMotion: boolean
}

interface ShareChannelState {
  line: { enabled: boolean }
  sms: { enabled: boolean }
  whatsapp: { enabled: boolean }
}

const DEFAULT_SETTINGS_PREFERENCES: AdminSettingsPreferences = {
  language: "th",
  reducedMotion: false,
}

const DEFAULT_SHARE_CHANNELS: ShareChannelState = {
  line: { enabled: false },
  sms: { enabled: false },
  whatsapp: { enabled: false },
}

function getStoredSettingsPreferences(): AdminSettingsPreferences {
  if (typeof window === "undefined") return DEFAULT_SETTINGS_PREFERENCES

  const raw = window.localStorage.getItem(ADMIN_SETTINGS_PREFERENCES_KEY)
  if (!raw) return DEFAULT_SETTINGS_PREFERENCES

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSettingsPreferences>
    return {
      language: parsed.language === "en" ? "en" : "th",
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : DEFAULT_SETTINGS_PREFERENCES.reducedMotion,
    }
  } catch {
    return DEFAULT_SETTINGS_PREFERENCES
  }
}

function saveSettingsPreferences(preferences: AdminSettingsPreferences) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(
    ADMIN_SETTINGS_PREFERENCES_KEY,
    JSON.stringify(preferences)
  )
  document.documentElement.lang = preferences.language
  document.documentElement.classList.toggle("reduce-motion", preferences.reducedMotion)
}

function testAlertTone(preset: AlertTonePreset) {
  if (typeof window === "undefined") return

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) {
    toast.error("เบราว์เซอร์นี้ยังไม่รองรับการทดสอบเสียง")
    return
  }

  const context = new AudioContextClass()
  const now = context.currentTime
  const masterGain = context.createGain()
  const pattern =
    preset === "soft-chime"
      ? [
          { frequency: 740, delay: 0, duration: 0.12, gain: 0.1, type: "sine" as OscillatorType },
          { frequency: 988, delay: 0.18, duration: 0.16, gain: 0.08, type: "sine" as OscillatorType },
        ]
      : preset === "siren-pulse"
        ? [
            { frequency: 840, delay: 0, duration: 0.14, gain: 0.14, type: "triangle" as OscillatorType },
            { frequency: 620, delay: 0.2, duration: 0.14, gain: 0.14, type: "triangle" as OscillatorType },
          ]
        : [
            { frequency: 820, delay: 0, duration: 0.1, gain: 0.13, type: "triangle" as OscillatorType },
            { frequency: 620, delay: 0.16, duration: 0.12, gain: 0.13, type: "triangle" as OscillatorType },
          ]

  masterGain.gain.setValueAtTime(0.28, now)
  masterGain.connect(context.destination)

  pattern.forEach(note => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = note.type
    oscillator.frequency.setValueAtTime(note.frequency, now + note.delay)
    gain.gain.setValueAtTime(0.0001, now + note.delay)
    gain.gain.exponentialRampToValueAtTime(note.gain, now + note.delay + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration)

    oscillator.connect(gain)
    gain.connect(masterGain)
    oscillator.start(now + note.delay)
    oscillator.stop(now + note.delay + note.duration)
  })

  window.setTimeout(() => {
    void context.close()
  }, 900)
}

function statusBadge(status: HealthStatus | SseStatus) {
  if (status === "online" || status === "connected") {
    return <Badge className="bg-success text-success-foreground">พร้อมใช้งาน</Badge>
  }

  if (status === "checking" || status === "connecting" || status === "unknown") {
    return <Badge variant="secondary">กำลังตรวจสอบ</Badge>
  }

  return <Badge variant="destructive">ไม่พร้อมใช้งาน</Badge>
}

function channelBadge(enabled: boolean) {
  return enabled ? (
    <Badge className="bg-success text-success-foreground">เปิดใช้งาน</Badge>
  ) : (
    <Badge variant="secondary">ยังไม่เปิดใช้งาน</Badge>
  )
}

export default function SettingsPage() {
  const { user, canViewAllAgencies } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [alertPreferences, setAlertPreferences] = useState(DEFAULT_ADMIN_ALERT_PREFERENCES)
  const [settingsPreferences, setSettingsPreferences] = useState(DEFAULT_SETTINGS_PREFERENCES)
  const [shareChannelStatus, setShareChannelStatus] = useState(DEFAULT_SHARE_CHANNELS)
  const [systemHealth, setSystemHealth] = useState<{
    api: HealthStatus
    database: HealthStatus
    sse: SseStatus
    dbTime: string | null
  }>({
    api: "checking",
    database: "checking",
    sse: "unknown",
    dbTime: null,
  })

  const isSuperAdmin = canViewAllAgencies()
  const isDarkMode = theme === "dark" || (theme === "system" && resolvedTheme === "dark")
  const roleLabel = isSuperAdmin
    ? "สิทธิ์: ผู้ดูแลสูงสุด"
    : "สิทธิ์: " + (user?.agency?.nameTh ?? user?.agency?.name ?? "หน่วยงานของฉัน")

  const enabledChannels = useMemo(() => {
    return Object.values(shareChannelStatus).filter(channel => channel.enabled).length
  }, [shareChannelStatus])

  useEffect(() => {
    const storedAlert = getStoredAdminAlertPreferences()
    const storedSettings = getStoredSettingsPreferences()

    setAlertPreferences(storedAlert)
    setSettingsPreferences(storedSettings)
    saveSettingsPreferences(storedSettings)
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return

    let cancelled = false

    async function loadShareChannels() {
      try {
        const response = await fetch(API_BASE_URL + "/api/reference/share-channels")
        if (!response.ok) throw new Error("share channels unavailable")
        const data = (await response.json()) as ShareChannelState
        if (!cancelled) setShareChannelStatus(data)
      } catch {
        if (!cancelled) setShareChannelStatus(DEFAULT_SHARE_CHANNELS)
      }
    }

    async function loadSystemHealth() {
      setSystemHealth(prev => ({ ...prev, api: "checking", database: "checking" }))
      try {
        const response = await fetch(API_BASE_URL + "/health")
        if (!response.ok) throw new Error("health unavailable")
        const data = (await response.json()) as { ok?: boolean; dbTime?: string }
        if (!cancelled) {
          setSystemHealth(prev => ({
            ...prev,
            api: data.ok ? "online" : "offline",
            database: data.dbTime ? "online" : "offline",
            dbTime: data.dbTime ?? null,
          }))
        }
      } catch {
        if (!cancelled) {
          setSystemHealth(prev => ({
            ...prev,
            api: "offline",
            database: "offline",
            dbTime: null,
          }))
        }
      }
    }

    void loadShareChannels()
    void loadSystemHealth()

    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  useEffect(() => {
    const handleSseStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: SseStatus }>).detail
      if (detail?.status) {
        setSystemHealth(prev => ({ ...prev, sse: detail.status ?? "unknown" }))
      }
    }

    window.addEventListener("smart-emergency:sse-status", handleSseStatus)
    return () => window.removeEventListener("smart-emergency:sse-status", handleSseStatus)
  }, [])

  const handleAlertPreferencesChange = (next: Partial<typeof alertPreferences>) => {
    const updated = { ...alertPreferences, ...next }
    setAlertPreferences(updated)
    saveAdminAlertPreferences(updated)
  }

  const handleSettingsPreferencesChange = (next: Partial<AdminSettingsPreferences>) => {
    const updated = { ...settingsPreferences, ...next }
    setSettingsPreferences(updated)
    saveSettingsPreferences(updated)
  }

  const handleSave = () => {
    saveAdminAlertPreferences(alertPreferences)
    saveSettingsPreferences(settingsPreferences)
    toast.success("บันทึกการตั้งค่าสำเร็จ")
  }

  const handleReset = () => {
    setAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    setSettingsPreferences(DEFAULT_SETTINGS_PREFERENCES)
    saveAdminAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    saveSettingsPreferences(DEFAULT_SETTINGS_PREFERENCES)
    setTheme("system")
    toast.info("รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบ</h1>
          <p className="text-muted-foreground">
            จัดการค่าที่ใช้งานจริงของแอดมินและตรวจสถานะระบบตามสิทธิ์ role
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            รีเซ็ต
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            บันทึก
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">มุมมองของคุณ</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{roleLabel}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSuperAdmin ? "เห็นการตั้งค่าทั้งระบบ" : "เห็นเฉพาะการตั้งค่าส่วนตัว"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">เสียง Alert</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">
              {alertPreferences.enabled ? "เปิดใช้งาน" : "ปิดเสียง"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alertPreferences.tone}</p>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ช่องทางศูนย์</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-semibold">{enabledChannels} ช่องทางเปิดใช้งาน</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  LINE / SMS / WhatsApp จาก backend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">สถานะระบบ</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-semibold">
                  {systemHealth.api === "online" && systemHealth.database === "online"
                    ? "ระบบพร้อมใช้งาน"
                    : systemHealth.api === "checking"
                      ? "กำลังตรวจสอบ"
                      : "ต้องตรวจสอบระบบ"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  API / Database / SSE
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className={isSuperAdmin ? "grid w-full grid-cols-3" : "grid w-full grid-cols-1"}>
          <TabsTrigger value="personal" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">การตั้งค่าของฉัน</span>
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="channels" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">ช่องทางศูนย์</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">สถานะระบบ</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                การแจ้งเตือนของฉัน
              </CardTitle>
              <CardDescription>
                ตั้งค่าเสียงและรูปแบบการทำงานเฉพาะเบราว์เซอร์ของผู้ใช้คนนี้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>เปิดเสียง Alert</Label>
                  <p className="text-sm text-muted-foreground">
                    ให้ popup แจ้งเหตุบนแดชบอร์ดเล่นเสียงเมื่อมีเคสใหม่
                  </p>
                </div>
                <Switch
                  checked={alertPreferences.enabled}
                  onCheckedChange={(v) => handleAlertPreferencesChange({ enabled: v })}
                />
              </div>
              <Separator />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label>รูปแบบเสียงแจ้งเตือน</Label>
                  <Select
                    value={alertPreferences.tone}
                    onValueChange={(value) =>
                      handleAlertPreferencesChange({
                        tone: (value ?? alertPreferences.tone) as AlertTonePreset,
                      })
                    }
                    disabled={!alertPreferences.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soft-chime">Soft chime</SelectItem>
                      <SelectItem value="alert-beep">Alert beep</SelectItem>
                      <SelectItem value="siren-pulse">Siren pulse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!alertPreferences.enabled}
                  onClick={() => testAlertTone(alertPreferences.tone)}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  ทดสอบเสียง
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                การแสดงผล
              </CardTitle>
              <CardDescription>
                ตั้งค่าการแสดงผลเฉพาะเครื่องที่กำลังใช้งาน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>โหมดมืด</Label>
                  <p className="text-sm text-muted-foreground">
                    สลับธีมของหน้า Admin ด้วย next-themes
                  </p>
                </div>
                <Switch
                  checked={isDarkMode}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>ลดแอนิเมชัน</Label>
                  <p className="text-sm text-muted-foreground">
                    บันทึก preference เพื่อให้ UI ลด motion ในรอบต่อไป
                  </p>
                </div>
                <Switch
                  checked={settingsPreferences.reducedMotion}
                  onCheckedChange={(v) => handleSettingsPreferencesChange({ reducedMotion: v })}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  ภาษา
                </Label>
                <Select
                  value={settingsPreferences.language}
                  onValueChange={(value) =>
                    handleSettingsPreferencesChange({
                      language: (value ?? settingsPreferences.language) as LanguagePreference,
                    })
                  }
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th">ไทย</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  ตอนนี้ใช้สำหรับ preference และ lang attribute ก่อน ยังไม่แปลทั้งระบบ
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="channels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  ช่องทางศูนย์
                </CardTitle>
                <CardDescription>
                  ช่องทางที่ประชาชนใช้เปิดแอปภายนอกเพื่อแชร์จุดเกิดเหตุกลับศูนย์
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">LINE OA</div>
                      {channelBadge(shareChannelStatus.line.enabled)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      เปิดผ่านค่า LINE_OA_ID ใน API environment
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">SMS Center</div>
                      {channelBadge(shareChannelStatus.sms.enabled)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      เปิดผ่านค่า SMS_CENTER_PHONE ใน API environment
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">WhatsApp Center</div>
                      {channelBadge(shareChannelStatus.whatsapp.enabled)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      เปิดผ่านค่า WHATSAPP_CENTER_PHONE ใน API environment
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  หน้านี้แสดงสถานะเท่านั้น ไม่แสดงหรือแก้ไข credential จริงจาก .env
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSuperAdmin && (
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  สถานะระบบ
                </CardTitle>
                <CardDescription>
                  ข้อมูลจริงแบบอ่านอย่างเดียวสำหรับตรวจความพร้อมของระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Globe className="h-4 w-4" />
                        API
                      </div>
                      {statusBadge(systemHealth.api)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ตรวจจาก endpoint /health
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Database className="h-4 w-4" />
                        Database
                      </div>
                      {statusBadge(systemHealth.database)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {systemHealth.dbTime ? "เช็ค DB ล่าสุด: " + systemHealth.dbTime : "รอผลจาก API health"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Radio className="h-4 w-4" />
                        SSE
                      </div>
                      {statusBadge(systemHealth.sse)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ฟังสถานะจาก SSE connection หลัก ไม่เปิด connection ซ้ำ
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  งานระบบที่ยังรอออกแบบ
                </CardTitle>
                <CardDescription>
                  แสดงเป็นสถานะอ่านอย่างเดียวเพื่อไม่ให้มี toggle หลอกในระบบ
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4" />
                    Auto dispatch
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    อยู่ใน scope แต่ต้องออกแบบ DB/API ก่อนเปิดใช้งานจริง
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Waves className="h-4 w-4" />
                    Escalation
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    อยู่ใน scope แต่ยังไม่เพิ่ม migration ในรอบนี้
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
