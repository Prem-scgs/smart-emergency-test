import type { CallStatus } from "@/entities/call"
import type { EmergencyCategory } from "@/entities/incident"

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
