'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Mail, Lock, Eye, EyeOff, Loader2, Building2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth, AGENCIES } from '@/shared/auth'
import type { AdminRole } from '@/shared/auth'

const ROLE_OPTIONS: { value: AdminRole; label: string; description: string }[] = [
  {
    value: 'super_admin',
    label: 'ผู้ดูแลระบบสูงสุด (Superadmin)',
    description: 'เข้าถึงข้อมูลทุกหน่วยงาน'
  },
  {
    value: 'agency_admin',
    label: 'ผู้ดูแลหน่วยงาน (Agency Admin)',
    description: 'จัดการข้อมูลเฉพาะหน่วยงาน'
  },
  {
    value: 'viewer',
    label: 'ผู้ดูข้อมูล (Viewer)',
    description: 'ดูข้อมูลเฉพาะหน่วยงานแบบอ่านอย่างเดียว'
  },
]

export default function AdminLoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<AdminRole | ''>('')
  const [selectedAgency, setSelectedAgency] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const needsAgency = selectedRole && selectedRole !== 'super_admin'

  /**
   * Login demo flow สำหรับหน้า admin
   *
   * ตอนนี้ยังไม่ใช่ real auth backend: role/agency ที่เลือกจะถูกส่งเข้า shared auth context
   * เพื่อสร้าง session ใน localStorage และใช้ scope ต่อกับ admin API headers
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    if (!selectedRole) {
      toast.error('กรุณาเลือกประเภทผู้ใช้')
      return
    }

    if (needsAgency && !selectedAgency) {
      toast.error('กรุณาเลือกหน่วยงาน')
      return
    }

    setIsLoading(true)

    try {
      const success = await login(
        email,
        password,
        selectedRole as AdminRole,
        needsAgency ? selectedAgency : undefined
      )

      if (success) {
        const agency = AGENCIES.find(a => a.id === selectedAgency)
        toast.success(
          selectedRole === 'super_admin'
            ? 'เข้าสู่ระบบศูนย์บัญชาการสำเร็จ'
            : `เข้าสู่ระบบ${agency?.nameTh || ''}สำเร็จ`
        )
        router.push('/admin/dashboard')
      }
    } catch {
      toast.error('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Smart Emergency</h1>
          <p className="text-sm text-muted-foreground">ศูนย์บัญชาการเหตุฉุกเฉิน</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>เข้าสู่ระบบ</CardTitle>
            <CardDescription>
              ลงชื่อเข้าใช้เพื่อเข้าถึงแดชบอร์ด
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">ประเภทผู้ใช้</Label>
                <div className="relative">
                  <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => {
                      setSelectedRole((value ?? '') as AdminRole | '')
                      if (value === 'super_admin') {
                        setSelectedAgency('')
                      }
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="เลือกประเภทผู้ใช้" />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      className="w-auto min-w-[var(--anchor-width)] max-w-[calc(100vw-3rem)]"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value} className="py-3">
                          <div className="flex flex-col gap-0.5 whitespace-normal">
                            <span className="text-sm font-medium leading-tight">{role.label}</span>
                            <span className="text-xs text-muted-foreground leading-tight">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Agency Selection (conditional) */}
              {needsAgency && (
                <div className="space-y-2">
                  <Label htmlFor="agency">หน่วยงาน</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Select
                      value={selectedAgency}
                      onValueChange={(value) => setSelectedAgency(value ?? '')}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="เลือกหน่วยงาน" />
                      </SelectTrigger>
                      <SelectContent
                        alignItemWithTrigger={false}
                        className="w-auto min-w-[var(--anchor-width)] max-w-[calc(100vw-3rem)]"
                      >
                        {AGENCIES.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id} className="py-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg ${agency.color}`}>●</span>
                              <span className="text-sm font-medium">{agency.nameTh}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="กรอกรหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    จดจำการเข้าสู่ระบบ
                  </Label>
                </div>
                <Button variant="link" className="px-0 text-sm" type="button">
                  ลืมรหัสผ่าน?
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Box */}
        {selectedRole === 'super_admin' && (
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium">ศูนย์บัญชาการใหญ่</p>
            <p className="text-xs text-muted-foreground mt-1">
              สามารถดูข้อมูลและจัดการทุกหน่วยงานในระบบ
            </p>
          </div>
        )}

        {selectedRole && selectedRole !== 'super_admin' && selectedAgency && (
          <div className="mt-4 p-4 bg-muted rounded-lg border">
            <p className="text-sm font-medium">
              {AGENCIES.find(a => a.id === selectedAgency)?.nameTh}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              สามารถดูข้อมูลเฉพาะหน่วยงานของตนเอง
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          ระบบรักษาความปลอดภัยระดับองค์กร
        </p>
      </div>
    </div>
  )
}
