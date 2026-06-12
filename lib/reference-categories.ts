'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EmergencyCategory } from './types'

const API_BASE_URL = 'http://localhost:4000'

export interface ReferenceCategory {
  id: EmergencyCategory
  name: string
  labelTh?: string | null
  description: string
  icon: string
  color: string
  bgColor: string
  recommendedAgency: string
  sortOrder?: number | null
  active?: boolean | null
}

export const FALLBACK_REFERENCE_CATEGORIES: ReferenceCategory[] = [
  { id: 'police', name: 'Police Emergency', labelTh: '?????', description: 'Report crimes, theft, assault, or suspicious activities', icon: 'ShieldAlert', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', recommendedAgency: 'Royal Thai Police', sortOrder: 1, active: true },
  { id: 'medical', name: 'Medical Emergency', labelTh: '????????', description: 'Request ambulance or medical assistance', icon: 'Ambulance', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', recommendedAgency: 'Emergency Medical Services', sortOrder: 2, active: true },
  { id: 'fire', name: 'Fire Emergency', labelTh: '????????', description: 'Report fire incidents or request fire rescue', icon: 'Flame', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', recommendedAgency: 'Fire Department', sortOrder: 3, active: true },
  { id: 'rescue', name: 'Rescue Team', labelTh: '??????', description: 'Request rescue operations for emergencies', icon: 'LifeBuoy', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', recommendedAgency: 'National Rescue Team', sortOrder: 4, active: true },
  { id: 'flood', name: 'Flood Disaster', labelTh: '???????', description: 'Report flooding or request evacuation assistance', icon: 'Waves', color: 'text-cyan-600 dark:text-cyan-400', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', recommendedAgency: 'Disaster Prevention Center', sortOrder: 5, active: true },
  { id: 'road-accident', name: 'Road Accident', labelTh: '????????????????', description: 'Report traffic accidents or road emergencies', icon: 'Car', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', recommendedAgency: 'Highway Police', sortOrder: 6, active: true },
]

export function sortReferenceCategories(categories: ReferenceCategory[]) {
  return [...categories].sort((left, right) => {
    const orderDiff = (left.sortOrder ?? 999) - (right.sortOrder ?? 999)
    if (orderDiff !== 0) return orderDiff
    return left.name.localeCompare(right.name)
  })
}

export function getCategoryDisplayLabel(category: Pick<ReferenceCategory, 'name' | 'labelTh'> | undefined | null, preferThai = true) {
  if (!category) return ''
  if (preferThai && category.labelTh) return category.labelTh
  return category.name
}

let cachedCategories: ReferenceCategory[] | null = null
let categoriesPromise: Promise<ReferenceCategory[]> | null = null

export function __resetReferenceCategoryCache() {
  cachedCategories = null
  categoriesPromise = null
}

export async function loadReferenceCategories(fetchImpl: typeof fetch = fetch) {
  if (cachedCategories) return cachedCategories
  if (categoriesPromise) return categoriesPromise

  categoriesPromise = (async () => {
    try {
      const response = await fetchImpl(API_BASE_URL + '/api/reference/categories')
      if (!response.ok) {
        cachedCategories = FALLBACK_REFERENCE_CATEGORIES
        return cachedCategories
      }

      const data = (await response.json()) as ReferenceCategory[]
      cachedCategories =
        data.length > 0 ? sortReferenceCategories(data) : FALLBACK_REFERENCE_CATEGORIES
      return cachedCategories
    } catch {
      cachedCategories = FALLBACK_REFERENCE_CATEGORIES
      return cachedCategories
    } finally {
      categoriesPromise = null
    }
  })()

  return categoriesPromise
}

export function useReferenceCategories() {
  const [categories, setCategories] = useState<ReferenceCategory[]>(FALLBACK_REFERENCE_CATEGORIES)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      try {
        const data = await loadReferenceCategories()
        if (!cancelled) setCategories(data)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadCategories()
    return () => { cancelled = true }
  }, [])

  const categoryMap = useMemo(() => Object.fromEntries(categories.map(category => [category.id, category])) as Record<string, ReferenceCategory>, [categories])

  return { categories, categoryMap, isLoading }
}
