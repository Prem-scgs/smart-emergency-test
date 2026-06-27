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
import {
  ADMIN_LANGUAGE_CHANGE_EVENT,
  ADMIN_SETTINGS_PREFERENCES_KEY,
  useAdminI18n,
} from "@/lib/admin-i18n"
import { useAuth } from "@/lib/auth-context"
import { getEmergencyApiBaseUrl } from "@/lib/emergency-api-url"

const API_BASE_URL = getEmergencyApiBaseUrl()

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
  window.dispatchEvent(
    new CustomEvent(ADMIN_LANGUAGE_CHANGE_EVENT, {
      detail: { language: preferences.language },
    })
  )
}

function previewSettingsLanguage(language: LanguagePreference) {
  if (typeof window === "undefined") return

  document.documentElement.lang = language
  window.dispatchEvent(
    new CustomEvent(ADMIN_LANGUAGE_CHANGE_EVENT, {
      detail: { language },
    })
  )
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
          { frequency: 660, delay: 0, duration: 0.18, gain: 0.08, type: "sine" as OscillatorType },
          { frequency: 880, delay: 0.24, duration: 0.22, gain: 0.06, type: "sine" as OscillatorType },
        ]
      : preset === "siren-pulse"
        ? [
            { frequency: 1040, delay: 0, duration: 0.11, gain: 0.18, type: "sawtooth" as OscillatorType },
            { frequency: 720, delay: 0.14, duration: 0.11, gain: 0.18, type: "sawtooth" as OscillatorType },
            { frequency: 1040, delay: 0.28, duration: 0.11, gain: 0.18, type: "sawtooth" as OscillatorType },
            { frequency: 720, delay: 0.42, duration: 0.14, gain: 0.18, type: "sawtooth" as OscillatorType },
          ]
        : [
            { frequency: 880, delay: 0, duration: 0.12, gain: 0.14, type: "square" as OscillatorType },
            { frequency: 880, delay: 0.24, duration: 0.12, gain: 0.14, type: "square" as OscillatorType },
          ]

  masterGain.gain.setValueAtTime(
    preset === "soft-chime" ? 0.22 : preset === "siren-pulse" ? 0.5 : 0.34,
    now
  )
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

function statusBadge(status: HealthStatus | SseStatus, t: ReturnType<typeof useAdminI18n>["t"]) {
  if (status === "online" || status === "connected") {
    return <Badge className="bg-success text-success-foreground">{t("statusReady")}</Badge>
  }

  if (status === "checking" || status === "connecting" || status === "unknown") {
    return <Badge variant="secondary">{t("checking")}</Badge>
  }

  return <Badge variant="destructive">{t("statusUnavailable")}</Badge>
}

function channelBadge(enabled: boolean, t: ReturnType<typeof useAdminI18n>["t"]) {
  return enabled ? (
    <Badge className="bg-success text-success-foreground">{t("channelOn")}</Badge>
  ) : (
    <Badge variant="secondary">{t("channelOff")}</Badge>
  )
}

export default function SettingsPage() {
  const { user, canViewAllAgencies } = useAuth()
  const { t } = useAdminI18n()
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
    ? t("scopeSuperAdmin")
    : t("scopeOwnAgency") + (user?.agency?.nameTh ?? user?.agency?.name ?? "หน่วยงานของฉัน")

  const enabledChannels = useMemo(() => {
    return Object.values(shareChannelStatus).filter(channel => channel.enabled).length
  }, [shareChannelStatus])
  const alertToneLabels = useMemo<Record<AlertTonePreset, string>>(() => ({
    "soft-chime": t("toneSoft"),
    "alert-beep": t("toneClear"),
    "siren-pulse": t("toneUrgent"),
  }), [t])

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
  }

  const handleSettingsPreferencesChange = (next: Partial<AdminSettingsPreferences>) => {
    const updated = { ...settingsPreferences, ...next }
    setSettingsPreferences(updated)

    if (next.language) {
      previewSettingsLanguage(updated.language)
    }
  }

  const handleSave = () => {
    saveAdminAlertPreferences(alertPreferences)
    saveSettingsPreferences(settingsPreferences)
    toast.success(t("settingsSaved"))
  }

  const handleReset = () => {
    setAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    setSettingsPreferences(DEFAULT_SETTINGS_PREFERENCES)
    saveAdminAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    saveSettingsPreferences(DEFAULT_SETTINGS_PREFERENCES)
    setTheme("system")
    toast.info(t("settingsReset"))
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("settingsTitle")}</h1>
          <p className="text-muted-foreground">
            {t("settingsDescription")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settingsDraftHint")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("reset")}
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {t("saveSettings")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("myView")}</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">{roleLabel}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isSuperAdmin ? t("canSeeSystemSettings") : t("canSeePersonalSettings")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("alertSound")}</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold">
              {alertPreferences.enabled ? t("enabled") : t("soundOff")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alertToneLabels[alertPreferences.tone]}</p>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("centerChannels")}</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-semibold">{enabledChannels} {t("channelsEnabled")}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("channelsFromBackend")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("systemStatus")}</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-semibold">
                  {systemHealth.api === "online" && systemHealth.database === "online"
                    ? t("systemReady")
                    : systemHealth.api === "checking"
                      ? t("checking")
                      : t("systemNeedsCheck")}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("apiDatabaseSse")}
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
            <span className="hidden sm:inline">{t("personalSettingsTab")}</span>
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="channels" className="gap-2">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("channelsTab")}</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">{t("healthTab")}</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {t("myNotifications")}
              </CardTitle>
              <CardDescription>
                {t("myNotificationsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>{t("enableAlertSound")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("enableAlertSoundDescription")}
                  </p>
                </div>
                <Switch
                  checked={alertPreferences.enabled}
                  onCheckedChange={(v) => handleAlertPreferencesChange({ enabled: v })}
                />
              </div>
              <Separator />
              <div className="flex flex-col gap-3">
                <div className="space-y-2">
                  <Label>{t("alertToneLabel")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("alertToneDescription")}
                  </p>
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
                      <SelectValue>{alertToneLabels[alertPreferences.tone]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soft-chime">{t("toneSoft")}</SelectItem>
                      <SelectItem value="alert-beep">{t("toneClear")}</SelectItem>
                      <SelectItem value="siren-pulse">{t("toneUrgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  disabled={!alertPreferences.enabled}
                  onClick={() => testAlertTone(alertPreferences.tone)}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  {t("testSound")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                {t("display")}
              </CardTitle>
              <CardDescription>
                {t("displayDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label>{t("darkMode")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("darkModeDescription")}
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
                  <Label>{t("reducedMotion")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("reducedMotionDescription")}
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
                  {t("languageAssistiveLabel")}
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
                    <SelectValue>
                      {settingsPreferences.language === "th" ? t("thai") : t("english")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th">{t("thai")}</SelectItem>
                    <SelectItem value="en">{t("english")}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t("languageAssistiveDescription")}
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
                  {t("centerChannels")}
                </CardTitle>
                <CardDescription>
                  {t("channelCenterDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">LINE OA</div>
                      {channelBadge(shareChannelStatus.line.enabled, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("lineEnvDescription")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">SMS Center</div>
                      {channelBadge(shareChannelStatus.sms.enabled, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("smsEnvDescription")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">WhatsApp Center</div>
                      {channelBadge(shareChannelStatus.whatsapp.enabled, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("whatsappEnvDescription")}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("noSecretsShown")}
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
                  {t("systemStatus")}
                </CardTitle>
                <CardDescription>
                  {t("healthDescription")}
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
                      {statusBadge(systemHealth.api, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("healthApiHint")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Database className="h-4 w-4" />
                        Database
                      </div>
                      {statusBadge(systemHealth.database, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {systemHealth.dbTime ? t("healthDbCheckedPrefix") + systemHealth.dbTime : t("healthDbPending")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Radio className="h-4 w-4" />
                        SSE
                      </div>
                      {statusBadge(systemHealth.sse, t)}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("healthSseHint")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t("pendingSystemWork")}
                </CardTitle>
                <CardDescription>
                  {t("pendingSystemWorkDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Zap className="h-4 w-4" />
                    Auto dispatch
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("autoDispatchPending")}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Waves className="h-4 w-4" />
                    Escalation
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("escalationPending")}
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
