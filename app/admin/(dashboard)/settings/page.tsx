"use client"

import { useEffect, useState } from "react"
import {
  Settings,
  Bell,
  Shield,
  Database,
  Globe,
  Palette,
  Mail,
  MessageSquare,
  Clock,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Server,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  DEFAULT_ADMIN_ALERT_PREFERENCES,
  getStoredAdminAlertPreferences,
  saveAdminAlertPreferences,
  type AlertTonePreset,
} from "@/lib/admin-alert-preferences"

export default function SettingsPage() {
  const [alertPreferences, setAlertPreferences] = useState(
    DEFAULT_ADMIN_ALERT_PREFERENCES
  )
  const [settings, setSettings] = useState({
    systemName: "Smart Emergency Platform",
    organizationName: "ศูนย์บัญชาการเหตุฉุกเฉิน",
    timezone: "Asia/Bangkok",
    language: "th",
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    criticalAlertSound: DEFAULT_ADMIN_ALERT_PREFERENCES.enabled,
    twoFactorAuth: false,
    sessionTimeout: "30",
    ipWhitelist: false,
    auditLogging: true,
    autoDispatch: true,
    escalationTime: "5",
    maxConcurrentCalls: "50",
    recordingEnabled: true,
  })

  useEffect(() => {
    const stored = getStoredAdminAlertPreferences()
    setAlertPreferences(stored)
    setSettings((prev) => ({
      ...prev,
      criticalAlertSound: stored.enabled,
    }))
  }, [])

  const handleAlertPreferencesChange = (
    next: Partial<typeof alertPreferences>
  ) => {
    const updated = { ...alertPreferences, ...next }
    setAlertPreferences(updated)
    saveAdminAlertPreferences(updated)
    setSettings((prev) => ({
      ...prev,
      criticalAlertSound: updated.enabled,
    }))
  }

  const handleSave = () => {
    saveAdminAlertPreferences(alertPreferences)
    toast.success("บันทึกการตั้งค่าสำเร็จ")
  }

  const handleReset = () => {
    setAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    saveAdminAlertPreferences(DEFAULT_ADMIN_ALERT_PREFERENCES)
    setSettings((prev) => ({
      ...prev,
      criticalAlertSound: DEFAULT_ADMIN_ALERT_PREFERENCES.enabled,
    }))
    toast.info("รีเซ็ตการตั้งค่าเป็นค่าเริ่มต้น")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ตั้งค่าระบบ</h1>
          <p className="text-muted-foreground">
            จัดการการตั้งค่าและการกำหนดค่าระบบ
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
            <CardTitle className="text-sm font-medium">สถานะระบบ</CardTitle>
            <Server className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-semibold text-success">ทำงานปกติ</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Globe className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className="bg-success text-success-foreground">Online</Badge>
              <span className="text-sm text-muted-foreground">99.9% uptime</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className="bg-success text-success-foreground">Connected</Badge>
              <span className="text-sm text-muted-foreground">12ms latency</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mobile App</CardTitle>
            <Smartphone className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className="bg-success text-success-foreground">v2.1.0</Badge>
              <span className="text-sm text-muted-foreground">1,234 active</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">ทั่วไป</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">การแจ้งเตือน</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">ความปลอดภัย</span>
          </TabsTrigger>
          <TabsTrigger value="emergency" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">เหตุฉุกเฉิน</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลองค์กร</CardTitle>
              <CardDescription>
                ตั้งค่าข้อมูลพื้นฐานขององค์กรและระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="systemName">ชื่อระบบ</Label>
                  <Input
                    id="systemName"
                    value={settings.systemName}
                    onChange={(e) =>
                      setSettings({ ...settings, systemName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgName">ชื่อองค์กร</Label>
                  <Input
                    id="orgName"
                    value={settings.organizationName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        organizationName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">เขตเวลา</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) =>
                      setSettings({ ...settings, timezone: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Bangkok">
                        Asia/Bangkok (GMT+7)
                      </SelectItem>
                      <SelectItem value="Asia/Singapore">
                        Asia/Singapore (GMT+8)
                      </SelectItem>
                      <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">ภาษา</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(v) =>
                      setSettings({ ...settings, language: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="th">ไทย</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                การแสดงผล
              </CardTitle>
              <CardDescription>ปรับแต่งรูปแบบการแสดงผลของระบบ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>โหมดมืด</Label>
                  <p className="text-sm text-muted-foreground">
                    เปิดใช้งานโหมดมืดสำหรับการแสดงผล
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>แอนิเมชัน</Label>
                  <p className="text-sm text-muted-foreground">
                    เปิดใช้งานแอนิเมชันในการแสดงผล
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                ช่องทางการแจ้งเตือน
              </CardTitle>
              <CardDescription>
                เลือกช่องทางที่ต้องการรับการแจ้งเตือน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>อีเมล</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนผ่านอีเมล
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, emailNotifications: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนผ่าน SMS
                  </p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, smsNotifications: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notification</Label>
                  <p className="text-sm text-muted-foreground">
                    รับการแจ้งเตือนผ่านแอปพลิเคชัน
                  </p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, pushNotifications: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>เปิดเสียงแจ้งเตือน</Label>
                  <p className="text-sm text-muted-foreground">
                    ให้ popup แจ้งเหตุบนแดชบอร์ดเล่นเสียงอัตโนมัติ
                  </p>
                </div>
                <Switch
                  checked={alertPreferences.enabled}
                  onCheckedChange={(v) =>
                    handleAlertPreferencesChange({ enabled: v })
                  }
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>รูปแบบเสียงแจ้งเตือน</Label>
                <Select
                  value={alertPreferences.tone}
                  onValueChange={(value) =>
                    handleAlertPreferencesChange({
                      tone: value as AlertTonePreset,
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
                <p className="text-sm text-muted-foreground">
                  เลือกโทนเสียงสำหรับ popup แจ้งเหตุบนหน้าแดชบอร์ด
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                ข้อความแจ้งเตือน
              </CardTitle>
              <CardDescription>
                กำหนดข้อความที่จะส่งเมื่อมีการแจ้งเตือน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>ข้อความเหตุฉุกเฉินทั่วไป</Label>
                <Textarea
                  placeholder="กรอกข้อความแจ้งเตือน..."
                  defaultValue="มีเหตุฉุกเฉินเกิดขึ้น กรุณาตรวจสอบระบบ"
                />
              </div>
              <div className="space-y-2">
                <Label>ข้อความเหตุวิกฤต</Label>
                <Textarea
                  placeholder="กรอกข้อความแจ้งเตือน..."
                  defaultValue="[ด่วน] มีเหตุวิกฤตเกิดขึ้น ต้องการการตอบสนองทันที"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                การยืนยันตัวตน
              </CardTitle>
              <CardDescription>
                ตั้งค่าความปลอดภัยในการเข้าสู่ระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>การยืนยันตัวตนสองขั้นตอน (2FA)</Label>
                  <p className="text-sm text-muted-foreground">
                    เพิ่มความปลอดภัยด้วยการยืนยันตัวตนสองขั้นตอน
                  </p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, twoFactorAuth: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>จำกัด IP Address</Label>
                  <p className="text-sm text-muted-foreground">
                    อนุญาตเฉพาะ IP ที่กำหนดเท่านั้น
                  </p>
                </div>
                <Switch
                  checked={settings.ipWhitelist}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, ipWhitelist: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>บันทึก Audit Log</Label>
                  <p className="text-sm text-muted-foreground">
                    บันทึกการกระทำทั้งหมดในระบบ
                  </p>
                </div>
                <Switch
                  checked={settings.auditLogging}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, auditLogging: v })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session
              </CardTitle>
              <CardDescription>ตั้งค่าการหมดอายุของ Session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>หมดอายุ Session (นาที)</Label>
                <Select
                  value={settings.sessionTimeout}
                  onValueChange={(v) =>
                    setSettings({ ...settings, sessionTimeout: v })
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 นาที</SelectItem>
                    <SelectItem value="30">30 นาที</SelectItem>
                    <SelectItem value="60">1 ชั่วโมง</SelectItem>
                    <SelectItem value="120">2 ชั่วโมง</SelectItem>
                    <SelectItem value="480">8 ชั่วโมง</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-emergency" />
                การตอบสนองเหตุฉุกเฉิน
              </CardTitle>
              <CardDescription>
                ตั้งค่าการจัดการเหตุฉุกเฉินอัตโนมัติ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>ส่งต่อเหตุอัตโนมัติ</Label>
                  <p className="text-sm text-muted-foreground">
                    ส่งต่อเหตุไปยังหน่วยงานที่รับผิดชอบโดยอัตโนมัติ
                  </p>
                </div>
                <Switch
                  checked={settings.autoDispatch}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, autoDispatch: v })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>บันทึกเสียงสนทนา</Label>
                  <p className="text-sm text-muted-foreground">
                    บันทึกเสียงการสนทนาทั้งหมด
                  </p>
                </div>
                <Switch
                  checked={settings.recordingEnabled}
                  onCheckedChange={(v) =>
                    setSettings({ ...settings, recordingEnabled: v })
                  }
                />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>เวลา Escalation (นาที)</Label>
                  <Select
                    value={settings.escalationTime}
                    onValueChange={(v) =>
                      setSettings({ ...settings, escalationTime: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 นาที</SelectItem>
                      <SelectItem value="5">5 นาที</SelectItem>
                      <SelectItem value="10">10 นาที</SelectItem>
                      <SelectItem value="15">15 นาที</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>จำนวนสายพร้อมกันสูงสุด</Label>
                  <Input
                    type="number"
                    value={settings.maxConcurrentCalls}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxConcurrentCalls: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
