'use client'

import { useEffect } from 'react'
import { MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLocationDisplayName, useReferenceLocations } from '@/shared/location'
import { type LocationLockStatus } from '@/features/mobile-incident'
import { useMobileI18n, type MobileI18nKey } from '@/shared/i18n/mobile'
import { cn } from '@/shared/utils'

interface LocationData {
  latitude: number
  longitude: number
  provinceCode?: string
  province: string
  provinceNameTh?: string
  provinceNameEn?: string
  districtCode?: string
  district: string
  districtNameTh?: string
  districtNameEn?: string
  accuracy: number
  lastUpdated: Date
}

interface LocationHeaderProps {
  className?: string
  location: LocationData | null
  locationStatus: LocationLockStatus
  isRefreshing?: boolean
  onRefresh?: () => void
}

const locationStatusKeys: Record<LocationLockStatus, MobileI18nKey> = {
  requesting: 'locationRequesting',
  locked: 'locationLocked',
  denied: 'locationDenied',
  unavailable: 'locationUnavailable',
  timeout: 'locationTimeout',
}

export function LocationHeader({ className, location, locationStatus, isRefreshing = false, onRefresh }: LocationHeaderProps) {
  const { provinces, districts, setSelectedProvinceCode } = useReferenceLocations({ autoSelectFirstProvince: false })
  const { language, locale, t } = useMobileI18n()
  const preferThai = language === 'th'
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

  useEffect(() => {
    if (location?.provinceCode) setSelectedProvinceCode(location.provinceCode)
  }, [location?.provinceCode, setSelectedProvinceCode])

  const province = provinces.find(item => item.provinceCode === location?.provinceCode)
  const district = districts.find(item => item.districtCode === location?.districtCode)
  const provinceLabel = getLocationDisplayName(province, preferThai) || (preferThai ? location?.provinceNameTh : location?.provinceNameEn) || location?.province
  const districtLabel = getLocationDisplayName(district, preferThai) || (preferThai ? location?.districtNameTh : location?.districtNameEn) || location?.district

  return (
    <div className={cn('rounded-xl bg-card p-4 shadow-sm border', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground truncate">{districtLabel || t(locationStatusKeys[locationStatus])}</h2>
              {isOnline ? <Wifi className="h-4 w-4 text-success shrink-0" /> : <WifiOff className="h-4 w-4 text-destructive shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground">{provinceLabel || t('locationUnknown')}</p>
            {location ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs">{t('locationAccuracy', { accuracy: location.accuracy.toFixed(0) })}</Badge>
                <Badge variant="outline" className="text-xs">{t('locationUpdated', { time: location.lastUpdated.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: language === 'en' }) })}</Badge>
              </div>
            ) : null}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isRefreshing || locationStatus === 'requesting'} className="shrink-0" aria-label={t('locationRefresh')}>
          <RefreshCw className={cn('h-4 w-4', (isRefreshing || locationStatus === 'requesting') && 'animate-spin')} />
        </Button>
      </div>
    </div>
  )
}
