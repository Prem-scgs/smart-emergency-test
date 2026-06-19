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
import { EmergencyCallScreen } from './emergency-call-screen'
import { LocationSharingScreen } from './location-sharing-screen'
import { IncidentHistoryScreen } from './incident-history-screen'
import { IncidentTrackingScreen } from './incident-tracking-screen'
import { MobileNav, NavItem } from './mobile-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmergencyCategory, EmergencyContact, CallStatus } from '@/lib/types'
import { toast } from 'sonner'
import { getOrCreateReporterSessionId } from '@/lib/reporter-session'
import { buildIncidentCallUpdatePayload, buildIncidentCreatePayload } from '@/lib/mobile-incident'
import { type IncidentTrackingHistoryEntry, type IncidentWorkflowStatus } from '@/lib/incident-tracking'

type Screen =
  | 'splash'
  | 'home'
  | 'incident'
  | 'call'
  | 'location-share'
  | 'history'
  | 'tracking'

const API_BASE_URL = 'http://localhost:4000'

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
  status: IncidentWorkflowStatus
  updatedAt: string
  history: IncidentTrackingHistoryEntry[]
}

const FALLBACK_LOCATION: MobileLocation = {
  latitude: 13.7478,
  longitude: 100.5351,
  provinceCode: '10',
  province: 'Bangkok',
  districtCode: '1007',
  district: 'Pathum Wan',
  accuracy: 15,
  lastUpdated: new Date(),
}

export function MobileApp() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory | null>(null)
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null)
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null)
  const [activeClientRequestId, setActiveClientRequestId] = useState<string | null>(null)
  const [trackingIncidentId, setTrackingIncidentId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<MobileLocation>(FALLBACK_LOCATION)
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
    const response = await fetch(API_BASE_URL + '/api/areas/resolve-point?' + search.toString())
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

  async function loadContacts(location: MobileLocation) {
    try {
      setIsLoadingContacts(true)
      const fetchContacts = async (query: URLSearchParams) => {
        const response = await fetch(API_BASE_URL + '/api/contacts?' + query.toString())
        if (!response.ok) {
          throw new Error('Failed to load contacts')
        }

        return await response.json() as Array<{
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
        }>
      }

      const exactSearch = new URLSearchParams({ active: 'true' })
      if (location.provinceCode) exactSearch.set('provinceCode', location.provinceCode)
      if (location.districtCode) exactSearch.set('districtCode', location.districtCode)
      if (location.province) exactSearch.set('province', location.province)
      if (location.district) exactSearch.set('district', location.district)

      const provinceFallbackSearch = new URLSearchParams({ active: 'true' })
      if (location.provinceCode) provinceFallbackSearch.set('provinceCode', location.provinceCode)
      if (location.province) provinceFallbackSearch.set('province', location.province)

      let apiContacts = await fetchContacts(exactSearch)
      if (apiContacts.length === 0 && location.provinceCode) {
        apiContacts = await fetchContacts(provinceFallbackSearch)
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
          provinceCode: contact.provinceCode ?? location.provinceCode,
          province: contact.province ?? location.province,
          districtCode: contact.districtCode ?? location.districtCode,
          district: contact.district ?? location.district,
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
        provinceCode: resolved.provinceCode ?? FALLBACK_LOCATION.provinceCode,
        province: resolved.provinceNameEn ?? FALLBACK_LOCATION.province,
        districtCode: resolved.districtCode ?? FALLBACK_LOCATION.districtCode,
        district: resolved.districtNameEn ?? FALLBACK_LOCATION.district,
        lastUpdated: new Date(),
      }

      setCurrentLocation(location)
      await loadContacts(location)
    } catch {
      const fallbackLocation: MobileLocation = {
        ...FALLBACK_LOCATION,
        latitude: nextLocation.latitude,
        longitude: nextLocation.longitude,
        accuracy: nextLocation.accuracy,
        lastUpdated: new Date(),
      }
      setCurrentLocation(fallbackLocation)
      await loadContacts(fallbackLocation)
    }
  }

  const refreshLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      void syncLocation(FALLBACK_LOCATION)
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
      () => {
        void syncLocation(FALLBACK_LOCATION)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
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
      const response = await fetch(API_BASE_URL + '/api/incidents', {
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

      return (await response.json()) as { id: string }
    },
    [currentLocation]
  )

  const startCallFlow = useCallback(
    async (contact: EmergencyContact, incidentCategory: EmergencyCategory) => {
      const clientRequestId = crypto.randomUUID()
      setSelectedCategory(incidentCategory)
      setSelectedContact(contact)
      setActiveIncidentId(null)
      setActiveClientRequestId(clientRequestId)
      setLocalTrackingSnapshot(null)
      setScreen('call')

      try {
        const incident = await createIncidentForCall(contact, incidentCategory, clientRequestId)
        setActiveIncidentId(incident.id)
        setLocalTrackingSnapshot({
          incidentId: incident.id,
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
    [createIncidentForCall]
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
    void startCallFlow(contact, incidentCategory)
  }

  const handleCallComplete = async (status: CallStatus) => {
    const incidentCategory = selectedCategory ?? selectedContact?.category

    if (!incidentCategory || !selectedContact) {
      toast.error('Unable to update incident from this call')
      return
    }

    try {
      let incidentId = activeIncidentId

      if (!incidentId) {
        const clientRequestId = activeClientRequestId ?? crypto.randomUUID()
        setActiveClientRequestId(clientRequestId)
        const incident = await createIncidentForCall(
          selectedContact,
          incidentCategory,
          clientRequestId
        )
        incidentId = incident.id
        setActiveIncidentId(incident.id)
      }

      const response = await fetch(API_BASE_URL + '/api/incidents/' + incidentId + '/call', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildIncidentCallUpdatePayload({
            status,
            contact: selectedContact,
          })
        ),
      })

      if (!response.ok) {
        throw new Error('Failed to update call result')
      }

      setSelectedCategory(incidentCategory)
      setTrackingIncidentId(incidentId)
      setActiveIncidentId(null)
      setActiveClientRequestId(null)
      setScreen('tracking')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update call result')
    }
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
      case 'location':
        setScreen('location-share')
        break
    }
  }

  const handleBack = () => {
    setScreen('home')
    setActiveNav('home')
    setSelectedCategory(null)
    setSelectedContact(null)
    setActiveIncidentId(null)
    setActiveClientRequestId(null)
    setTrackingIncidentId(null)
  }

  if (screen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  if (screen === 'call' && selectedContact) {
    return (
      <EmergencyCallScreen
        contact={selectedContact}
        onCancel={handleBack}
        onComplete={handleCallComplete}
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
        onShareLocation={() => setScreen('location-share')}
      />
    )
  }

  if (screen === 'location-share') {
    return <LocationSharingScreen onBack={handleBack} />
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
      <IncidentTrackingScreen
        incidentId={trackingIncidentId}
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
          <LocationHeader location={currentLocation} onRefresh={refreshLocation} />

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
