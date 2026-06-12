'use client'

import { useEffect, useMemo, useState } from 'react'

const API_BASE_URL = 'http://localhost:4000'

export interface ReferenceProvince {
  id: string
  provinceCode: string | null
  name: string
  nameTh?: string | null
  nameEn?: string | null
}

export interface ReferenceDistrict {
  id: string
  provinceCode: string | null
  provinceNameTh?: string | null
  provinceNameEn?: string | null
  districtCode: string | null
  name: string
  nameTh?: string | null
  nameEn?: string | null
}

interface UseReferenceLocationsOptions {
  autoSelectFirstProvince?: boolean
}

let cachedProvinces: ReferenceProvince[] | null = null
let provincesPromise: Promise<ReferenceProvince[]> | null = null
let cachedAllDistricts: ReferenceDistrict[] | null = null
let allDistrictsPromise: Promise<ReferenceDistrict[]> | null = null
const cachedDistrictsByProvince = new Map<string, ReferenceDistrict[]>()
const districtsPromiseByProvince = new Map<string, Promise<ReferenceDistrict[]>>()

function sortByDisplayName<T extends { nameTh?: string | null; nameEn?: string | null; name: string }>(
  items: T[]
) {
  return [...items].sort((left, right) =>
    getLocationDisplayName(left).localeCompare(getLocationDisplayName(right), 'th')
  )
}

export function getLocationDisplayName(
  item:
    | { nameTh?: string | null; nameEn?: string | null; name: string }
    | null
    | undefined
) {
  if (!item) return ''
  return item.nameTh ?? item.nameEn ?? item.name
}

export function getLocationCanonicalName(
  item:
    | { nameEn?: string | null; nameTh?: string | null; name: string }
    | null
    | undefined
) {
  if (!item) return ''
  return item.nameEn ?? item.nameTh ?? item.name
}

export function __resetReferenceLocationCache() {
  cachedProvinces = null
  provincesPromise = null
  cachedAllDistricts = null
  allDistrictsPromise = null
  cachedDistrictsByProvince.clear()
  districtsPromiseByProvince.clear()
}

export async function loadReferenceProvinces(fetchImpl: typeof fetch = fetch) {
  if (cachedProvinces) return cachedProvinces
  if (provincesPromise) return provincesPromise

  provincesPromise = (async () => {
    try {
      const response = await fetchImpl(API_BASE_URL + '/api/reference/provinces')
      if (!response.ok) {
        cachedProvinces = []
        return cachedProvinces
      }

      const data = (await response.json()) as ReferenceProvince[]
      cachedProvinces = sortByDisplayName(data)
      return cachedProvinces
    } catch {
      cachedProvinces = []
      return cachedProvinces
    } finally {
      provincesPromise = null
    }
  })()

  return provincesPromise
}

export async function loadReferenceDistricts(
  provinceCode: string,
  fetchImpl: typeof fetch = fetch
) {
  if (!provinceCode) return []
  const cachedDistricts = cachedDistrictsByProvince.get(provinceCode)
  if (cachedDistricts) return cachedDistricts

  const inFlight = districtsPromiseByProvince.get(provinceCode)
  if (inFlight) return inFlight

  const promise = (async () => {
    try {
      const search = new URLSearchParams({ provinceCode })
      const response = await fetchImpl(API_BASE_URL + '/api/reference/districts?' + search.toString())
      if (!response.ok) {
        cachedDistrictsByProvince.set(provinceCode, [])
        return []
      }

      const data = (await response.json()) as ReferenceDistrict[]
      const sorted = sortByDisplayName(data)
      cachedDistrictsByProvince.set(provinceCode, sorted)
      return sorted
    } catch {
      cachedDistrictsByProvince.set(provinceCode, [])
      return []
    } finally {
      districtsPromiseByProvince.delete(provinceCode)
    }
  })()

  districtsPromiseByProvince.set(provinceCode, promise)
  return promise
}

export async function loadReferenceLocationLookups(fetchImpl: typeof fetch = fetch) {
  if (cachedProvinces && cachedAllDistricts) {
    return { provinces: cachedProvinces, districts: cachedAllDistricts }
  }

  if (provincesPromise || allDistrictsPromise) {
    const [provinces, districts] = await Promise.all([
      provincesPromise ?? loadReferenceProvinces(fetchImpl),
      allDistrictsPromise ?? loadAllReferenceDistricts(fetchImpl),
    ])
    return { provinces, districts }
  }

  const [provinces, districts] = await Promise.all([
    loadReferenceProvinces(fetchImpl),
    loadAllReferenceDistricts(fetchImpl),
  ])
  return { provinces, districts }
}

async function loadAllReferenceDistricts(fetchImpl: typeof fetch = fetch) {
  if (cachedAllDistricts) return cachedAllDistricts
  if (allDistrictsPromise) return allDistrictsPromise

  allDistrictsPromise = (async () => {
    try {
      const response = await fetchImpl(API_BASE_URL + '/api/reference/districts')
      if (!response.ok) {
        cachedAllDistricts = []
        return cachedAllDistricts
      }

      const data = (await response.json()) as ReferenceDistrict[]
      cachedAllDistricts = sortByDisplayName(data)
      return cachedAllDistricts
    } catch {
      cachedAllDistricts = []
      return cachedAllDistricts
    } finally {
      allDistrictsPromise = null
    }
  })()

  return allDistrictsPromise
}

export function useReferenceLocations(options: UseReferenceLocationsOptions = {}) {
  const { autoSelectFirstProvince = false } = options
  const [provinces, setProvinces] = useState<ReferenceProvince[]>([])
  const [districts, setDistricts] = useState<ReferenceDistrict[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('')
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true)
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadProvinces() {
      try {
        const data = await loadReferenceProvinces()
        if (!cancelled) {
          setProvinces(data)
          if (autoSelectFirstProvince && data[0]?.provinceCode) {
            setSelectedProvinceCode(data[0].provinceCode)
          }
        }
      } finally {
        if (!cancelled) setIsLoadingProvinces(false)
      }
    }

    loadProvinces()
    return () => {
      cancelled = true
    }
  }, [autoSelectFirstProvince])

  useEffect(() => {
    let cancelled = false

    async function loadDistricts() {
      if (!selectedProvinceCode) {
        setDistricts([])
        return
      }

      try {
        setIsLoadingDistricts(true)
        const data = await loadReferenceDistricts(selectedProvinceCode)
        if (!cancelled) {
          setDistricts(data)
        }
      } finally {
        if (!cancelled) setIsLoadingDistricts(false)
      }
    }

    loadDistricts()
    return () => {
      cancelled = true
    }
  }, [selectedProvinceCode])

  const provinceMap = useMemo(
    () => Object.fromEntries(provinces.map(province => [province.provinceCode ?? province.id, province])),
    [provinces]
  )

  return {
    provinces,
    districts,
    provinceMap,
    selectedProvinceCode,
    setSelectedProvinceCode,
    isLoadingProvinces,
    isLoadingDistricts,
  }
}

export function useLocationLookupMaps() {
  const [provinces, setProvinces] = useState<ReferenceProvince[]>([])
  const [districts, setDistricts] = useState<ReferenceDistrict[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadAllLocations() {
      try {
        const { provinces: provinceData, districts: districtData } = await loadReferenceLocationLookups()
        if (!cancelled) {
          setProvinces(provinceData)
          setDistricts(districtData)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAllLocations()
    return () => {
      cancelled = true
    }
  }, [])

  const provinceByCode = useMemo(
    () => Object.fromEntries(provinces.map(province => [province.provinceCode ?? province.id, province])),
    [provinces]
  )

  const districtByCode = useMemo(
    () => Object.fromEntries(districts.map(district => [district.districtCode ?? district.id, district])),
    [districts]
  )

  return {
    provinces,
    districts,
    provinceByCode,
    districtByCode,
    isLoading,
  }
}
