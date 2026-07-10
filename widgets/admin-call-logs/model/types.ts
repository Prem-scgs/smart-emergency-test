import type { CallStatus } from "@/entities/call"
import type { EmergencyCategory } from "@/entities/incident"

/**
 * Types เฉพาะหน้า call logs
 *
 * ApiIncident สะท้อน response `/api/incidents` ที่หน้า call logs ใช้สำหรับ filter,
 * pagination และ export ถ้า backend field เปลี่ยนต้องปรับ formatter คู่กัน.
 */
export type DateFilter = "all" | "today" | "week" | "month"

export interface ApiIncident {
  id: string
  category: EmergencyCategory
  severity: "low" | "medium" | "high" | "critical"
  status: string
  description: string | null
  agencyContactId: string | null
  agencyName: string | null
  agencyPhone: string | null
  province: string | null
  district: string | null
  accuracy: number | null
  callStatus: CallStatus | null
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
}

export interface EmergencyCategoryInfo {
  id: EmergencyCategory
  name: string
  nameTh?: string
  color: string
  bgColor: string
}
