import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAdminI18n } from '@/shared/i18n/admin'

/**
 * หน้า 403 ภายใน admin shell สำหรับผู้ที่ login แล้วแต่ไม่มีสิทธิ์ของ route
 *
 * Component นี้ตั้งใจไม่ render widget ปลายทาง เพื่อกัน fetch หรือข้อมูลของหน้าที่ไม่มีสิทธิ์กระพริบขึ้นมา
 * แต่ยังเป็นเพียงขอบเขตการเข้าถึงฝั่ง UI เท่านั้น Backend ต้องตรวจ role/category scope ซ้ำทุก endpoint
 */
export function AdminAccessDenied() {
  const { t } = useAdminI18n()

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-destructive">403</p>
        <h2 className="mt-2 text-2xl font-bold">{t('accessDeniedTitle')}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t('accessDeniedDescription')}</p>
        <Button className="mt-6" render={<Link href="/admin/dashboard" />}>
          {t('backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
