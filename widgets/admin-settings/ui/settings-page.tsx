"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import {
  Bell,
  Building2,
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
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
} from "@/features/incident-alert"
import { buildAdminApiHeaders } from "@/shared/api/admin-api"
import { useAdminI18n } from "@/shared/i18n/admin"
import { useAuth } from "@/shared/auth"
import { getEmergencyApiBaseUrl } from "@/shared/config/emergency-api"

import { statusBadge } from "../lib/health"
import {
  DEFAULT_SETTINGS_PREFERENCES,
  getStoredSettingsPreferences,
  previewSettingsLanguage,
  saveSettingsPreferences,
} from "../lib/preferences"
import {
  channelBadge,
  DEFAULT_SHARE_CHANNEL_DRAFTS,
  DEFAULT_SHARE_CHANNELS,
  sourceLabel,
} from "../lib/share-channels"
import type {
  AdminSettingsPreferences,
  HealthStatus,
  LanguagePreference,
  OrganizationSettings,
  ShareChannelDraft,
  ShareChannelName,
  ShareChannelState,
  SseStatus,
} from "../model/types"

const API_BASE_URL = getEmergencyApiBaseUrl()
const ORGANIZATION_SETTINGS_UPDATED_EVENT = "smart-emergency:organization-settings-updated"

const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  systemName: "Smart Emergency Platform",
  organizationName: "ศูนย์บัญชาการเหตุฉุกเฉิน",
  timezone: "Asia/Bangkok",
}

/**
 * เล่นเสียงตัวอย่างจากหน้า settings โดยไม่แตะ alert preference จริง
 *
 * ใช้ Web Audio API เพื่อให้ทดสอบ tone ได้ทันทีใน browser และยังคง owner ของ preference
 * อยู่ที่ `features/incident-alert`
 */
function testAlertTone(preset: AlertTonePreset, unsupportedMessage: string) {
  if (typeof window === "undefined") return

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextClass) {
    toast.error(unsupportedMessage)
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

export default function SettingsPage() {
  const { user, canViewAllAgencies } = useAuth()
  const { t } = useAdminI18n()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [alertPreferences, setAlertPreferences] = useState(DEFAULT_ADMIN_ALERT_PREFERENCES)
  const [settingsPreferences, setSettingsPreferences] = useState(DEFAULT_SETTINGS_PREFERENCES)
  const [organizationSettings, setOrganizationSettings] = useState(DEFAULT_ORGANIZATION_SETTINGS)
  const [shareChannelStatus, setShareChannelStatus] = useState(DEFAULT_SHARE_CHANNELS)
  const [shareChannelDrafts, setShareChannelDrafts] = useState(DEFAULT_SHARE_CHANNEL_DRAFTS)
  const [systemHealth, setSystemHealth] = useState<{
    api: HealthStatus
    database: HealthStatus
    sse: SseStatus
    dbTime: string | null
    healthLastCheckedAt: string | null
    sseLastCheckedAt: string | null
  }>({
    api: "checking",
    database: "checking",
    sse: "unknown",
    dbTime: null,
    healthLastCheckedAt: null,
    sseLastCheckedAt: null,
  })

  const isSuperAdmin = canViewAllAgencies()
  const isDarkMode = theme === "dark" || (theme === "system" && resolvedTheme === "dark")
  const roleLabel = isSuperAdmin
    ? t("scopeSuperAdmin")
    : t("scopeOwnAgency") + (user?.agency?.nameTh ?? user?.agency?.name ?? t("settingsOwnAgencyFallback"))

  const enabledChannels = useMemo(() => {
    return Object.values(shareChannelStatus).filter(channel => channel.enabled).length
  }, [shareChannelStatus])
  const alertToneLabels = useMemo<Record<AlertTonePreset, string>>(() => ({
    "soft-chime": t("toneSoft"),
    "alert-beep": t("toneClear"),
    "siren-pulse": t("toneUrgent"),
  }), [t])
  const shareChannelLabels = useMemo<Record<ShareChannelName, {
    title: string
    description: string
    placeholder: string
  }>>(() => ({
    line: {
      title: "LINE OA",
      description: t("lineEnvDescription"),
      placeholder: t("lineRecipientPlaceholder"),
    },
    sms: {
      title: "SMS Center",
      description: t("smsEnvDescription"),
      placeholder: t("smsRecipientPlaceholder"),
    },
    whatsapp: {
      title: "WhatsApp Center",
      description: t("whatsappEnvDescription"),
      placeholder: t("whatsappRecipientPlaceholder"),
    },
  }), [t])
  const systemStatusItems = useMemo(() => [
    {
      key: "api",
      icon: <Globe className="h-4 w-4" />,
      title: t("healthApiTitle"),
      status: systemHealth.api,
      description:
        systemHealth.api === "online"
          ? `${t("healthApiOnline")} · ${t("lastChecked")} ${systemHealth.healthLastCheckedAt ?? t("notCheckedYet")}`
          : systemHealth.api === "checking"
            ? t("checking")
            : `${t("healthApiOffline")} · ${t("lastChecked")} ${systemHealth.healthLastCheckedAt ?? t("notCheckedYet")}`,
    },
    {
      key: "database",
      icon: <Database className="h-4 w-4" />,
      title: t("healthDatabaseTitle"),
      status: systemHealth.database,
      description:
        systemHealth.database === "online"
          ? systemHealth.dbTime
            ? `${t("healthDbCheckedPrefix")}${systemHealth.dbTime} · ${t("lastChecked")} ${systemHealth.healthLastCheckedAt ?? t("notCheckedYet")}`
            : t("healthDatabaseOnline")
          : systemHealth.database === "checking"
            ? t("healthDbPending")
            : `${t("healthDatabaseOffline")} · ${t("lastChecked")} ${systemHealth.healthLastCheckedAt ?? t("notCheckedYet")}`,
    },
    {
      key: "sse",
      icon: <Radio className="h-4 w-4" />,
      title: t("healthSseTitle"),
      status: systemHealth.sse,
      description:
        systemHealth.sse === "connected"
          ? `${t("healthSseConnected")} · ${t("lastChecked")} ${systemHealth.sseLastCheckedAt ?? t("notCheckedYet")}`
          : systemHealth.sse === "connecting"
            ? `${t("healthSseConnecting")} · ${t("lastChecked")} ${systemHealth.sseLastCheckedAt ?? t("notCheckedYet")}`
            : `${t("healthSseDisconnected")} · ${t("lastChecked")} ${systemHealth.sseLastCheckedAt ?? t("notCheckedYet")}`,
    },
  ], [systemHealth, t])

  /**
   * ตรวจ health snapshot สำหรับ super admin
   *
   * Endpoint `/health` ใช้เช็ก API และ DB connection แบบเร็ว ๆ ในหน้า settings
   * ไม่ควรใช้แทน monitoring production จริง แต่ช่วย demo/debug tunnel ได้ดี
   */
  const refreshSystemHealth = async () => {
    setSystemHealth(prev => ({ ...prev, api: "checking", database: "checking" }))
    try {
      const response = await fetch(API_BASE_URL + "/health")
      if (!response.ok) throw new Error("health unavailable")
      const data = (await response.json()) as { ok?: boolean; dbTime?: string }
      setSystemHealth(prev => ({
        ...prev,
        api: data.ok ? "online" : "offline",
        database: data.dbTime ? "online" : "offline",
        dbTime: data.dbTime ?? null,
        healthLastCheckedAt: new Date().toLocaleString(),
      }))
    } catch {
      setSystemHealth(prev => ({
        ...prev,
        api: "offline",
        database: "offline",
        dbTime: null,
        healthLastCheckedAt: new Date().toLocaleString(),
      }))
    }
  }

  /**
   * โหลด preference ฝั่ง client จาก localStorage แล้ว apply ทันที
   *
   * saveSettingsPreferences จะตั้ง `document.documentElement.lang` และ reduced-motion class
   * เพื่อให้ทั้ง admin shell ได้ผลพร้อมกัน
   */
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

    /**
     * โหลดค่าองค์กรเฉพาะ super admin
     *
     * Non-super admin ไม่ควรเรียก endpoint นี้ เพราะไม่มีสิทธิ์แก้ global settings
     */
    async function loadOrganizationSettings() {
      try {
        const response = await fetch(API_BASE_URL + "/api/admin/organization-settings", {
          headers: buildAdminApiHeaders(user),
        })
        if (!response.ok) throw new Error("organization settings unavailable")
        const data = (await response.json()) as { settings: OrganizationSettings }
        if (!cancelled) {
          setOrganizationSettings(data.settings)
        }
      } catch {
        if (!cancelled) {
          setOrganizationSettings(DEFAULT_ORGANIZATION_SETTINGS)
        }
      }
    }

    /**
     * โหลดสถานะ share channels ที่ mobile location sharing ใช้จริง
     *
     * ค่า enabled มีผลกับปุ่ม LINE/SMS/WhatsApp ใน `IncidentLocationShareCard`
     */
    async function loadShareChannels() {
      try {
        const response = await fetch(API_BASE_URL + "/api/admin/share-channels", {
          headers: buildAdminApiHeaders(user),
        })
        if (!response.ok) throw new Error("share channels unavailable")
        const data = (await response.json()) as { channels: ShareChannelState }
        if (!cancelled) {
          setShareChannelStatus(data.channels)
          setShareChannelDrafts({
            line: { enabled: data.channels.line.enabled, recipientValue: "" },
            sms: { enabled: data.channels.sms.enabled, recipientValue: "" },
            whatsapp: { enabled: data.channels.whatsapp.enabled, recipientValue: "" },
          })
        }
      } catch {
        if (!cancelled) {
          setShareChannelStatus(DEFAULT_SHARE_CHANNELS)
          setShareChannelDrafts(DEFAULT_SHARE_CHANNEL_DRAFTS)
        }
      }
    }

    void loadOrganizationSettings()
    void loadShareChannels()
    void refreshSystemHealth()

    return () => {
      cancelled = true
    }
  }, [isSuperAdmin, user])

  /**
   * รับสถานะ SSE จาก NotificationProvider เพื่อแสดง health realtime
   *
   * Event นี้เป็น client-only signal ไม่ใช่ API response จึงใช้เพื่อบอกสถานะ UI/debug เท่านั้น
   */
  useEffect(() => {
    const handleSseStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: SseStatus }>).detail
      if (detail?.status) {
        setSystemHealth(prev => ({
          ...prev,
          sse: detail.status ?? "unknown",
          sseLastCheckedAt: new Date().toLocaleString(),
        }))
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

  const handleOrganizationSettingsChange = (next: Partial<OrganizationSettings>) => {
    setOrganizationSettings(prev => ({ ...prev, ...next }))
  }

  const handleShareChannelDraftChange = (
    channel: ShareChannelName,
    next: Partial<ShareChannelDraft>
  ) => {
    setShareChannelDrafts(prev => ({
      ...prev,
      [channel]: { ...prev[channel], ...next },
    }))
  }

  /**
   * บันทึก organization settings และ broadcast ให้ admin shell refresh
   */
  const saveOrganizationSettings = async () => {
    const payload = {
      settings: {
        systemName: organizationSettings.systemName.trim(),
        organizationName: organizationSettings.organizationName.trim(),
        timezone: organizationSettings.timezone,
      },
    }

    const response = await fetch(API_BASE_URL + "/api/admin/organization-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAdminApiHeaders(user),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("organization settings save failed")
    }

    const data = (await response.json()) as { settings: OrganizationSettings }
    setOrganizationSettings(data.settings)
    window.dispatchEvent(new Event(ORGANIZATION_SETTINGS_UPDATED_EVENT))
  }

  /**
   * บันทึก share channel settings ที่ mobile share flow ใช้ตอน runtime
   *
   * recipientValue ส่งเฉพาะตอนมีค่าใหม่ เพื่อไม่เผลอ overwrite secret/env-backed recipient เดิม
   */
  const saveShareChannels = async () => {
    const payload = {
      channels: {
        line: {
          enabled: shareChannelDrafts.line.enabled,
          ...(shareChannelDrafts.line.recipientValue.trim()
            ? { recipientValue: shareChannelDrafts.line.recipientValue.trim() }
            : {}),
        },
        sms: {
          enabled: shareChannelDrafts.sms.enabled,
          ...(shareChannelDrafts.sms.recipientValue.trim()
            ? { recipientValue: shareChannelDrafts.sms.recipientValue.trim() }
            : {}),
        },
        whatsapp: {
          enabled: shareChannelDrafts.whatsapp.enabled,
          ...(shareChannelDrafts.whatsapp.recipientValue.trim()
            ? { recipientValue: shareChannelDrafts.whatsapp.recipientValue.trim() }
            : {}),
        },
      },
    }

    const response = await fetch(API_BASE_URL + "/api/admin/share-channels", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildAdminApiHeaders(user),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("share channel save failed")
    }

    const data = (await response.json()) as { channels: ShareChannelState }
    setShareChannelStatus(data.channels)
    setShareChannelDrafts({
      line: { enabled: data.channels.line.enabled, recipientValue: "" },
      sms: { enabled: data.channels.sms.enabled, recipientValue: "" },
      whatsapp: { enabled: data.channels.whatsapp.enabled, recipientValue: "" },
    })
  }

  /**
   * Save รวมทั้ง personal preference และ super-admin global settings
   *
   * ถ้า global settings ส่วนใด fail จะหยุดและแจ้ง error เพื่อไม่ให้ user เข้าใจว่าทุกอย่างถูกบันทึกแล้ว
   */
  const handleSave = async () => {
    saveAdminAlertPreferences(alertPreferences)
    saveSettingsPreferences(settingsPreferences)

    if (isSuperAdmin) {
      try {
        await saveOrganizationSettings()
      } catch {
        toast.error(t("organizationSettingsSaveError"))
        return
      }

      try {
        await saveShareChannels()
      } catch {
        toast.error(t("shareChannelsSaveError"))
        return
      }
    }

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
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("organizationSettings")}
                </CardTitle>
                <CardDescription>
                  {t("organizationSettingsDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("systemNameLabel")}</Label>
                  <Input
                    value={organizationSettings.systemName}
                    onChange={(event) =>
                      handleOrganizationSettingsChange({ systemName: event.target.value })
                    }
                    placeholder={t("systemNamePlaceholder")}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("systemNameDescription")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t("organizationNameLabel")}</Label>
                  <Input
                    value={organizationSettings.organizationName}
                    onChange={(event) =>
                      handleOrganizationSettingsChange({ organizationName: event.target.value })
                    }
                    placeholder={t("organizationNamePlaceholder")}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("organizationNameDescription")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t("timezoneLabel")}</Label>
                  <Select
                    value={organizationSettings.timezone}
                    onValueChange={(value) =>
                      handleOrganizationSettingsChange({
                        timezone: (value ?? organizationSettings.timezone) as OrganizationSettings["timezone"],
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <SelectValue>{organizationSettings.timezone}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {t("timezoneDescription")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

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
                  onClick={() => testAlertTone(alertPreferences.tone, t("settingsAudioUnsupported"))}
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
                  {(["line", "sms", "whatsapp"] as ShareChannelName[]).map(channel => (
                    <div key={channel} className="flex h-full flex-col rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{shareChannelLabels[channel].title}</div>
                          <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                            {shareChannelLabels[channel].description}
                          </p>
                        </div>
                        {channelBadge(shareChannelStatus[channel].enabled, t)}
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-muted-foreground">
                            {sourceLabel(shareChannelStatus[channel].source, t)}
                          </div>
                          <Switch
                            checked={shareChannelDrafts[channel].enabled}
                            onCheckedChange={(checked) =>
                              handleShareChannelDraftChange(channel, { enabled: checked })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("shareChannelCurrentValue")}</Label>
                          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                            {shareChannelStatus[channel].maskedValue ?? t("shareChannelNoValue")}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t("replaceShareChannelValue")}</Label>
                          <Input
                            value={shareChannelDrafts[channel].recipientValue}
                            onChange={(event) =>
                              handleShareChannelDraftChange(channel, {
                                recipientValue: event.target.value,
                              })
                            }
                            placeholder={shareChannelLabels[channel].placeholder}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    {t("systemStatus")}
                  </CardTitle>
                  <CardDescription>
                    {t("healthDescription")}
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" onClick={refreshSystemHealth}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("checkAgain")}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {systemStatusItems.map(item => (
                    <div key={item.key} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 font-medium">
                          {item.icon}
                          {item.title}
                        </div>
                        {statusBadge(item.status, t)}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {t("healthReadOnlyNote")}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
