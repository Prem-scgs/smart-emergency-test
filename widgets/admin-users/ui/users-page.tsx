"use client"

import { LockKeyhole, ShieldCheck, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * หน้า placeholder สำหรับ user management
 *
 * อย่าใส่ mock user CRUD กลับเข้ามาในหน้านี้จนกว่าจะมี real auth/JWT contract
 * เพราะสิทธิ์ admin ทั้งระบบจะพึ่ง role scope เดียวกันกับ dashboard, contacts และ reports
 */
export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">จัดการผู้ใช้งานระบบ</h1>
        <p className="text-muted-foreground">
          หน้านี้ถูกพักไว้จนกว่าทีม Auth จะส่งระบบผู้ใช้และสิทธิ์จริง
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            รอเชื่อมระบบ Auth จริง
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <ShieldCheck className="mb-3 h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Role ที่ระบบรองรับ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ระบบปัจจุบันใช้ `super_admin` และ `agency_admin` สำหรับ dashboard,
              contacts, reports และ realtime scope
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <LockKeyhole className="mb-3 h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">ยังไม่ทำ CRUD ผู้ใช้</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              การเพิ่ม แก้ไข ลบผู้ใช้จริงต้องรอ JWT/Auth contract จากทีมหลัก
              เพื่อไม่ให้ข้อมูลสิทธิ์หลุดจากระบบจริง
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <Users className="mb-3 h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Mock ถูกถอดออกแล้ว</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ไม่มีรายชื่อผู้ใช้ปลอมบนหน้านี้แล้ว จึงไม่สับสนว่าเป็นข้อมูลจริง
              หรือพร้อมใช้งาน production
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
