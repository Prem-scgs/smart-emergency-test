"use client"

import type { EmergencyCategory } from './types'
import { FALLBACK_REFERENCE_CATEGORIES, getCategoryDisplayLabel, type ReferenceCategory } from './reference-categories'

export const emergencyCategoryLabelsTh: Record<EmergencyCategory, string> = {
  police: 'ตำรวจ',
  medical: 'แพทย์',
  fire: 'ดับเพลิง',
  rescue: 'กู้ภัย',
  flood: 'น้ำท่วม',
  'road-accident': 'อุบัติเหตุทางถนน',
  child: 'เด็ก',
  elderly: 'ผู้สูงอายุ',
  animal: 'สัตว์',
  tourist: 'นักท่องเที่ยว',
}

const emergencyCategoryThemeMap: Partial<Record<EmergencyCategory, { color: string; bgColor: string }>> = {
  police: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
  medical: { color: 'text-red-600', bgColor: 'bg-red-100' },
  fire: { color: 'text-orange-600', bgColor: 'bg-orange-100' },
  rescue: { color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  flood: { color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  'road-accident': { color: 'text-amber-600', bgColor: 'bg-amber-100' },
}

export function buildAdminCategoryCollections(categories: ReferenceCategory[] = FALLBACK_REFERENCE_CATEGORIES) {
  const styles = categories.map(category => ({
    id: category.id,
    name: getCategoryDisplayLabel(category, true) || emergencyCategoryLabelsTh[category.id] || category.name,
    color: emergencyCategoryThemeMap[category.id]?.color ?? 'text-foreground',
    bgColor: emergencyCategoryThemeMap[category.id]?.bgColor ?? 'bg-muted',
  }))

  const options = styles.map(category => ({ value: category.id, label: category.name }))
  const labelMap = Object.fromEntries(options.map(category => [category.value, category.label])) as Record<string, string>

  return { styles, options, labelMap }
}

export const { styles: adminEmergencyCategoryStyles, options: adminEmergencyCategoryOptions, labelMap: adminEmergencyCategoryLabelMap } = buildAdminCategoryCollections()

export function getEmergencyCategoryLabel(category: string | null | undefined, fallback = 'ไม่ระบุหมวดเหตุ') {
  if (!category) return fallback
  return adminEmergencyCategoryLabelMap[category] ?? category
}
