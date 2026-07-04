'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SplashScreen } from './splash-screen'
import { LocationHeader } from './location-header'
import { EmergencyCategoriesGrid } from './emergency-categories-grid'
import { SOSButton } from './sos-button'
import { IncidentSelectionScreen } from './incident-selection-screen'
import { IncidentHistoryScreen } from './incident-history-screen'
import { IncidentTrackingScreen } from './incident-tracking-screen'
import { MobileNav, NavItem } from './mobile-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmergencyCategory, EmergencyContact } from '@/lib/types'
import { toast } from 'sonner'
import { getOrCreateReporterSessionId } from '@/lib/reporter-session'
import { buildIncidentCreatePayload } from '@/lib/mobile-incident'
import { type IncidentTrackingHistoryEntry, type IncidentWorkflowStatus } from '@/lib/incident-tracking'
import { getEmergencyApiBaseUrl } from '@/lib/emergency-api-url'
import { getLocationFailureStatus, type LocationLockStatus } from '@/lib/mobile-location'

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
  caseNumber: string
  status: IncidentWorkflowStatus
  updatedAt: string
  history: IncidentTrackingHistoryEntry[]
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
  const [trackingCaseNumber, setTrackingCaseNumber] = useState<string | null>(null)
  const [trackingToken, setTrackingToken] = useState<string | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<MobileLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState<LocationLockStatus>('requesting')
  const [localTrackingSnapshot, setLocalTrackingSnapshot] = useState<LocalTrackingSnapshot | null>(null)
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
        province: resolved.provinceNameEn ?? '',
        districtCode: resolved.districtCode ?? undefined,
        district: resolved.districtNameEn ?? '',
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

      return (await response.json()) as { caseNumber: string; trackingToken: string }
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
          caseNumber: incident.caseNumber,
          status: 'reported',
          updatedAt: new Date().toISOString(),
          history: [
            {
              toStatus: 'reported',
              createdAt: new Date().toISOString(),
            },
          ],
        })
        toast.success('Emergency alert sent to admin dashboard')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start incident')
      }
    },
    [createIncidentForCall, currentLocation, locationStatus]
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

  const handleViewTracking = (caseNumber: string, token: string, category: EmergencyCategory) => {
    setTrackingCaseNumber(caseNumber)
    setTrackingToken(token)
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
    setTrackingCaseNumber(null)
    setTrackingToken(null)
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

  if (screen === 'tracking' && trackingCaseNumber && trackingToken && selectedCategory) {
    const activeTracking =
      localTrackingSnapshot?.caseNumber === trackingCaseNumber ? localTrackingSnapshot : null

    return (
      <IncidentTrackingScreen
        caseNumber={trackingCaseNumber}
        trackingToken={trackingToken}
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
