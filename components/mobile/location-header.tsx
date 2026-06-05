'use client'

import { useState, useEffect } from 'react'
import { MapPin, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LocationData {
  latitude: number
  longitude: number
  province: string
  district: string
  accuracy: number
  lastUpdated: Date
}

interface LocationHeaderProps {
  className?: string
}

export function LocationHeader({ className }: LocationHeaderProps) {
  const [location, setLocation] = useState<LocationData>({
    latitude: 13.7563,
    longitude: 100.5018,
    province: 'Bangkok',
    district: 'Pathum Wan',
    accuracy: 15,
    lastUpdated: new Date(),
  })
  const [isOnline, setIsOnline] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate GPS refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLocation(prev => ({
      ...prev,
      accuracy: Math.max(5, prev.accuracy - Math.random() * 5),
      lastUpdated: new Date(),
    }))
    setIsRefreshing(false)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

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
                {location.district}
              </h2>
              {isOnline ? (
                <Wifi className="h-4 w-4 text-success shrink-0" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {location.province}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                GPS: {location.accuracy.toFixed(0)}m
              </Badge>
              <Badge variant="outline" className="text-xs">
                Updated: {formatTime(location.lastUpdated)}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shrink-0"
          aria-label="Refresh location"
        >
          <RefreshCw className={cn(
            'h-4 w-4',
            isRefreshing && 'animate-spin'
          )} />
        </Button>
      </div>
    </div>
  )
}
