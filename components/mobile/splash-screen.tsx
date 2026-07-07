'use client'

import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { locationStatusMessage, type LocationLockStatus } from '@/features/mobile-incident'

interface SplashScreenProps {
  locationStatus: LocationLockStatus
  onRetry: () => void
  onContinueWithoutLocation: () => void
  onComplete: () => void
}

export function SplashScreen({
  locationStatus,
  onRetry,
  onContinueWithoutLocation,
  onComplete,
}: SplashScreenProps) {
  useEffect(() => {
    if (locationStatus === 'locked') {
      onComplete()
    }
  }, [locationStatus, onComplete])

  const isRequesting = locationStatus === 'requesting'
  const isLocked = locationStatus === 'locked'

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background safe-area-inset">
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary">
          <Shield className="h-12 w-12 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Smart Emergency
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emergency Response Platform
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4 px-8">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-4">
          {isRequesting ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : isLocked ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <div>
            <p className="text-sm font-medium">ตำแหน่งปัจจุบัน</p>
            <p className="text-sm text-muted-foreground">
              {locationStatusMessage[locationStatus]}
            </p>
          </div>
        </div>

        {!isRequesting && !isLocked ? (
          <div className="space-y-2">
            <Button className="w-full" onClick={onRetry}>ลองอีกครั้ง</Button>
            <Button className="w-full" variant="outline" onClick={onContinueWithoutLocation}>
              เข้าสู่หน้าหลักโดยไม่ใช้ตำแหน่ง
            </Button>
          </div>
        ) : null}
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground">
          Version 1.0.0
        </p>
      </div>
    </div>
  )
}
