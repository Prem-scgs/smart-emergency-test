'use client'

import { useEffect } from 'react'
import { MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLocationDisplayName, useReferenceLocations } from '@/shared/location'
import { locationStatusMessage, type LocationLockStatus } from '@/features/mobile-incident'
import { cn } from '@/shared/utils'

interface LocationData {
  latitude: number
  longitude: number
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
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

export function LocationHeader({
  className,
  location,
  locationStatus,
  isRefreshing = false,
  onRefresh,
}: LocationHeaderProps) {
  const {
    provinces,
    districts,
    setSelectedProvinceCode,
  } = useReferenceLocations({ autoSelectFirstProvince: false })
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine

  useEffect(() => {
    if (location?.provinceCode) {
      setSelectedProvinceCode(location.provinceCode)
    }
  }, [location?.provinceCode, setSelectedProvinceCode])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const province = provinces.find(item => item.provinceCode === location?.provinceCode)
  const district = districts.find(item => item.districtCode === location?.districtCode)
  const provinceLabel = getLocationDisplayName(province) || location?.province
  const districtLabel = getLocationDisplayName(district) || location?.district

  return (
    <div className={cn('rounded-xl bg-card p-4 shadow-sm border', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground truncate">
                {districtLabel || locationStatusMessage[locationStatus]}
              </h2>
              {isOnline ? (
                <Wifi className="h-4 w-4 text-success shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {provinceLabel || 'ยังไม่ระบุพื้นที่'}
            </p>
            {location ? <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                GPS: {location.accuracy.toFixed(0)}m
              </Badge>
              <Badge variant="outline" className="text-xs">
                Updated: {formatTime(location.lastUpdated)}
              </Badge>
            </div> : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing || locationStatus === 'requesting'}
          className="shrink-0"
          aria-label="Refresh location"
        >
          <RefreshCw className={cn(
            'h-4 w-4',
            (isRefreshing || locationStatus === 'requesting') && 'animate-spin'
          )} />
        </Button>
      </div>
    </div>
  )
}
