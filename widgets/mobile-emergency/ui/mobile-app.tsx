'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SplashScreen } from '@/components/mobile/splash-screen'
import { LocationHeader } from '@/components/mobile/location-header'
import { EmergencyCategoriesGrid } from '@/components/mobile/emergency-categories-grid'
import { SOSButton } from '@/components/mobile/sos-button'
import { IncidentSelectionScreen } from '@/components/mobile/incident-selection-screen'
import { IncidentHistoryScreen } from './incident-history-screen'
import { IncidentTrackingScreen } from './incident-tracking-screen'
import { MobileNav, NavItem } from '@/components/mobile/mobile-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { EmergencyCategory } from '@/entities/incident'
import type { CallStatus } from '@/entities/call'
import type { EmergencyContact } from '@/entities/contact'
import { toast } from 'sonner'
import {
  buildIncidentCallUpdatePayload,
  buildIncidentCreatePayload,
  getLocationFailureStatus,
  getOrCreateReporterSessionId,
  type LocationLockStatus,
} from '@/features/mobile-incident'
import { type IncidentTrackingHistoryEntry, type IncidentWorkflowStatus } from '@/entities/incident'
import { getEmergencyApiBaseUrl } from '@/shared/config/emergency-api'

type Screen =
  | 'splash'
  | 'home'
  | 'incident'
  | 'history'
  | 'tracking'

interface MobileLocation {
  latitude: number
  longitude: number
  provinceCode?: string
  province: string
  districtCode?: string
  district: string
  accuracy: number
  lastUpdated: Date
}

interface LocalTrackingSnapshot {
  incidentId: string
  caseNumber?: string | null
  status: IncidentWorkflowStatus
  updatedAt: string
  history: IncidentTrackingHistoryEntry[]
}

interface PendingCallResult {
  incidentId: string
  contact: EmergencyContact
}

interface ApiContact {
  id: string
  name: string
  phone: string
  category: EmergencyCategory
  provinceCode?: string | null
  province: string | null
  districtCode?: string | null
  district: string | null
  active: boolean
  is24Hours: boolean
  latitude?: number | null
  longitude?: number | null
}

function isGlobalApiContact(contact: ApiContact) {
  return !contact.provinceCode && !contact.province && !contact.districtCode && !contact.district
}

function isGlobalContact(contact: EmergencyContact) {
  return !contact.provinceCode && !contact.province && !contact.districtCode && !contact.district
}

export function MobileApp() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory | null>(null)
  const [trackingIncidentId, setTrackingIncidentId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<MobileLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationLockStatus>('requesting')
  const [localTrackingSnapshot, setLocalTrackingSnapshot] = useState<LocalTrackingSnapshot | null>(null)
  const [pendingCallResult, setPendingCallResult] = useState<PendingCallResult | null>(null)
  const [isSavingCallResult, setIsSavingCallResult] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSplashComplete = useCallback(() => {
    setScreen('home')
  }, [])

  useEffect(() => {
    getOrCreateReporterSessionId()
  }, [])

  async function resolveLocation(latitude: number, longitude: number) {
    const search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    })
    const response = await fetch(getEmergencyApiBaseUrl() + '/api/areas/resolve-point?' + search.toString())
    if (!response.ok) {
      throw new Error('Failed to resolve location from point')
    }

    return await response.json() as {
      matched: boolean
      provinceCode: string | null
      provinceNameTh: string | null
      provinceNameEn: string | null
      districtCode: string | null
      districtNameTh: string | null
      districtNameEn: string | null
    }
  }

  async function loadContacts(location: MobileLocation | null) {
    try {
      setIsLoadingContacts(true)
      const fetchContacts = async (query: URLSearchParams) => {
        const response = await fetch(getEmergencyApiBaseUrl() + '/api/contacts?' + query.toString())
        if (!response.ok) {
          throw new Error('Failed to load contacts')
        }

        return await response.json() as ApiContact[]
      }

      const exactSearch = new URLSearchParams({ active: 'true' })
      if (location?.provinceCode) exactSearch.set('provinceCode', location.provinceCode)
      if (location?.districtCode) exactSearch.set('districtCode', location.districtCode)
      if (location?.province) exactSearch.set('province', location.province)
      if (location?.district) exactSearch.set('district', location.district)

      const provinceFallbackSearch = new URLSearchParams({ active: 'true' })
      if (location?.provinceCode) provinceFallbackSearch.set('provinceCode', location.provinceCode)
      if (location?.province) provinceFallbackSearch.set('province', location.province)

      let apiContacts = await fetchContacts(exactSearch)
      if (apiContacts.length === 0 && location?.provinceCode) {
        apiContacts = await fetchContacts(provinceFallbackSearch)
      }
      if (!location) {
        apiContacts = apiContacts.filter(isGlobalApiContact)
      }

      const mappedContacts = apiContacts
        .filter(
          (
            contact
          ): contact is typeof contact & {
            category: EmergencyCategory
          } => Boolean(contact.category)
        )
        .map(contact => ({
          id: contact.id,
          agencyName: contact.name,
          phoneNumber: contact.phone,
          category: contact.category,
          provinceCode: contact.provinceCode ?? location?.provinceCode,
          province: contact.province ?? location?.province ?? '',
          districtCode: contact.districtCode ?? location?.districtCode,
          district: contact.district ?? location?.district ?? '',
          status: contact.active ? ('active' as const) : ('inactive' as const),
          is24Hours: contact.is24Hours,
          coordinates:
            contact.latitude != null && contact.longitude != null
              ? {
                  latitude: contact.latitude,
                  longitude: contact.longitude,
                }
              : undefined,
        }))

      setContacts(mappedContacts)
    } catch {
      setContacts([])
    } finally {
      setIsLoadingContacts(false)
    }
  }

  async function syncLocation(nextLocation: Pick<MobileLocation, 'latitude' | 'longitude' | 'accuracy'>) {
    try {
      const resolved = await resolveLocation(nextLocation.latitude, nextLocation.longitude)
      const location: MobileLocation = {
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        accuracy: nextLocation.accuracy,
        provinceCode: resolved.provinceCode ?? undefined,
        province: resolved.provinceNameTh ?? resolved.provinceNameEn ?? '',
        districtCode: resolved.districtCode ?? undefined,
        district: resolved.districtNameTh ?? resolved.districtNameEn ?? '',
        lastUpdated: new Date(),
      }

      setCurrentLocation(location)
      setLocationStatus('locked')
      await loadContacts(location)
    } catch {
      const location: MobileLocation = {
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        province: '',
        district: '',
        accuracy: nextLocation.accuracy,
        lastUpdated: new Date(),
      }
      setCurrentLocation(location)
      setLocationStatus('locked')
      await loadContacts(null)
    }
  }

  const refreshLocation = useCallback(() => {
    setLocationStatus('requesting')

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setCurrentLocation(null)
      setLocationStatus('unavailable')
      void loadContacts(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        void syncLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      error => {
        setCurrentLocation(null)
        setLocationStatus(getLocationFailureStatus(error.code))
        void loadContacts(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }, [])

  useEffect(() => {
    refreshLocation()
  }, [refreshLocation])

  const handleSelectCategory = (category: EmergencyCategory) => {
    setSelectedCategory(category)
    setScreen('incident')
  }

  const createIncidentForCall = useCallback(
    async (
      contact: EmergencyContact,
      incidentCategory: EmergencyCategory,
      clientRequestId: string
    ) => {
      if (!currentLocation || locationStatus !== 'locked') {
        throw new Error('ยังไม่สามารถส่งเหตุได้ กรุณาอนุญาตและล็อกตำแหน่งก่อน')
      }

      const response = await fetch(getEmergencyApiBaseUrl() + '/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildIncidentCreatePayload({
            category: incidentCategory,
            contact,
            location: currentLocation,
            sessionId: getOrCreateReporterSessionId(),
            clientRequestId,
          })
        ),
      })

      if (!response.ok) {
        throw new Error('Failed to start incident')
      }

      return (await response.json()) as { id: string; caseNumber?: string | null }
    },
    [currentLocation, locationStatus]
  )

  const startCallFlow = useCallback(
    async (contact: EmergencyContact, incidentCategory: EmergencyCategory) => {
      const clientRequestId = crypto.randomUUID()
      setSelectedCategory(incidentCategory)
      setLocalTrackingSnapshot(null)

      if ((!currentLocation || locationStatus !== 'locked') && isGlobalContact(contact)) {
        return
      }

      try {
        const incident = await createIncidentForCall(contact, incidentCategory, clientRequestId)
        setLocalTrackingSnapshot({
          incidentId: incident.id,
          caseNumber: incident.caseNumber ?? null,
          status: 'reported',
          updatedAt: new Date().toISOString(),
          history: [
            {
              toStatus: 'reported',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        setTrackingIncidentId(incident.id)
        setPendingCallResult({
          incidentId: incident.id,
          contact,
        })
        setScreen('tracking')
        toast.success('Emergency alert sent to admin dashboard')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start incident')
      }
    },
    [createIncidentForCall, currentLocation, locationStatus]
  )

  const updateCallResult = useCallback(
    async (status: CallStatus) => {
      if (!pendingCallResult) return

      try {
        setIsSavingCallResult(true)
        const response = await fetch(
          getEmergencyApiBaseUrl() + `/api/incidents/${pendingCallResult.incidentId}/call`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(
              buildIncidentCallUpdatePayload({
                status,
                contact: pendingCallResult.contact,
              })
            ),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to update call result')
        }

        setPendingCallResult(null)
        toast.success('Call result saved')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update call result')
      } finally {
        setIsSavingCallResult(false)
      }
    },
    [pendingCallResult]
  )

  const handleSOSPress = () => {
    const medicalContact = contacts.find(c => c.category === 'medical')
    if (!medicalContact) {
      toast.error('ยังไม่พบเบอร์ติดต่อหมวดแพทย์จากฐานข้อมูล')
      return
    }
    void startCallFlow(medicalContact, 'medical')
  }

  const handleCall = (contact: EmergencyContact) => {
    const incidentCategory = selectedCategory ?? contact.category
    return startCallFlow(contact, incidentCategory)
  }

  const handleViewTracking = (incidentId: string, category: EmergencyCategory) => {
    setTrackingIncidentId(incidentId)
    setSelectedCategory(category)
    setScreen('tracking')
  }

  const handleNavigate = (item: NavItem) => {
    setActiveNav(item)
    switch (item) {
      case 'home':
        setScreen('home')
        break
      case 'history':
        setScreen('history')
        break
    }
  }

  const handleBack = () => {
    setScreen('home')
    setActiveNav('home')
    setSelectedCategory(null)
    setTrackingIncidentId(null)
    setPendingCallResult(null)
  }

  if (screen === 'splash') {
    return (
      <SplashScreen
        locationStatus={locationStatus}
        onRetry={refreshLocation}
        onContinueWithoutLocation={handleSplashComplete}
        onComplete={handleSplashComplete}
      />
    )
  }

  if (screen === 'incident' && selectedCategory) {
    return (
      <IncidentSelectionScreen
        categoryId={selectedCategory}
        contacts={contacts}
        isLoadingContacts={isLoadingContacts}
        onBack={handleBack}
        onCall={handleCall}
        onViewMap={() => toast.info('Map view coming soon')}
      />
    )
  }

  if (screen === 'history') {
    return (
      <IncidentHistoryScreen
        onBack={handleBack}
        onViewTracking={handleViewTracking}
      />
    )
  }

  if (screen === 'tracking' && trackingIncidentId && selectedCategory) {
    const activeTracking =
      localTrackingSnapshot?.incidentId === trackingIncidentId ? localTrackingSnapshot : null

    return (
      <>
        <IncidentTrackingScreen
        incidentId={trackingIncidentId}
        caseNumber={activeTracking?.caseNumber}
        categoryId={selectedCategory}
        trackingStatus={activeTracking?.status}
        trackingHistory={activeTracking?.history}
        trackingUpdatedAt={activeTracking?.updatedAt}
        onBack={handleBack}
        onCall={() => {
          const contact = contacts.find(c => c.category === selectedCategory)
          if (!contact) {
            toast.error('ยังไม่พบเบอร์ติดต่อของหมวดเหตุนี้จากฐานข้อมูล')
            return
          }
          void startCallFlow(contact, selectedCategory)
        }}
        />

        <Dialog
          open={pendingCallResult?.incidentId === trackingIncidentId}
          onOpenChange={open => {
            if (!open && !isSavingCallResult) setPendingCallResult(null)
          }}
        >
          <DialogContent className="max-w-[calc(100vw-2rem)] rounded-3xl sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>ผลการโทรเป็นอย่างไร?</DialogTitle>
              <DialogDescription>
                เลือกสถานะหลังโทรออก เพื่อให้รายงานบันทึกการโทรและสถิติฝั่ง admin ตรงกับเหตุการณ์จริง
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Button
                className="justify-start bg-success text-success-foreground hover:bg-success/90"
                disabled={isSavingCallResult}
                onClick={() => void updateCallResult('connected')}
              >
                โทรติด
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={isSavingCallResult}
                onClick={() => void updateCallResult('busy')}
              >
                สายไม่ว่าง
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={isSavingCallResult}
                onClick={() => void updateCallResult('no-answer')}
              >
                ไม่รับสาย
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                disabled={isSavingCallResult}
                onClick={() => void updateCallResult('wrong-number')}
              >
                หมายเลขผิด
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-muted-foreground"
                disabled={isSavingCallResult}
                onClick={() => void updateCallResult('cancelled')}
              >
                ยกเลิก/ไม่ได้โทรต่อ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Smart Emergency</h1>
            <p className="text-xs text-muted-foreground">Emergency Response Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </div>
        </div>
        <MobileNav active={activeNav} onNavigate={handleNavigate} />
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 pb-40 space-y-6">
          <LocationHeader
            location={currentLocation}
            locationStatus={locationStatus}
            onRefresh={refreshLocation}
          />

          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Emergency Categories
            </h2>
            <EmergencyCategoriesGrid onSelectCategory={handleSelectCategory} />
          </div>
        </div>
      </ScrollArea>

      <SOSButton onPress={handleSOSPress} />
    </div>
  )
}
