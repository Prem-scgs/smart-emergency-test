'use client'

import { useState, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { SplashScreen } from './splash-screen'
import { LocationHeader } from './location-header'
import { EmergencyCategoriesGrid } from './emergency-categories-grid'
import { SOSButton } from './sos-button'
import { IncidentSelectionScreen } from './incident-selection-screen'
import { EmergencyCallScreen } from './emergency-call-screen'
import { LocationSharingScreen } from './location-sharing-screen'
import { IncidentHistoryScreen } from './incident-history-screen'
import { MobileNav, NavItem } from './mobile-nav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmergencyCategory, EmergencyContact, CallStatus } from '@/lib/types'
import { mockEmergencyContacts } from '@/lib/mock-data'
import { toast } from 'sonner'

type Screen = 
  | 'splash'
  | 'home'
  | 'incident'
  | 'call'
  | 'location-share'
  | 'history'

export function MobileApp() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [activeNav, setActiveNav] = useState<NavItem>('home')
  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory | null>(null)
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(null)
  const { theme, setTheme } = useTheme()

  const handleSplashComplete = useCallback(() => {
    setScreen('home')
  }, [])

  const handleSelectCategory = (category: EmergencyCategory) => {
    setSelectedCategory(category)
    setScreen('incident')
  }

  const handleSOSPress = () => {
    // Default to medical emergency for SOS
    const medicalContact = mockEmergencyContacts.find(c => c.category === 'medical') || mockEmergencyContacts[0]
    setSelectedContact(medicalContact)
    setScreen('call')
  }

  const handleCall = (contact: EmergencyContact) => {
    setSelectedContact(contact)
    setScreen('call')
  }

  const handleCallComplete = (status: CallStatus) => {
    toast.success(`Call logged: ${status}`)
    setScreen('home')
    setSelectedContact(null)
    setSelectedCategory(null)
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
  }

  // Render splash screen
  if (screen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />
  }

  // Render call screen (full screen overlay)
  if (screen === 'call' && selectedContact) {
    return (
      <EmergencyCallScreen
        contact={selectedContact}
        onCancel={handleBack}
        onComplete={handleCallComplete}
      />
    )
  }

  // Render incident selection screen
  if (screen === 'incident' && selectedCategory) {
    return (
      <IncidentSelectionScreen
        categoryId={selectedCategory}
        onBack={handleBack}
        onCall={handleCall}
        onViewMap={() => toast.info('Map view coming soon')}
        onShareLocation={() => setScreen('location-share')}
      />
    )
  }

  // Render location sharing screen
  if (screen === 'location-share') {
    return <LocationSharingScreen onBack={handleBack} />
  }

  // Render history screen
  if (screen === 'history') {
    return (
      <IncidentHistoryScreen onBack={handleBack} />
    )
  }

  // Render home screen
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
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
        {/* Top Tab Navigation */}
        <MobileNav active={activeNav} onNavigate={handleNavigate} />
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 pb-40 space-y-6">
          {/* Location Card */}
          <LocationHeader />

          {/* Emergency Categories */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Emergency Categories
            </h2>
            <EmergencyCategoriesGrid onSelectCategory={handleSelectCategory} />
          </div>
        </div>
      </ScrollArea>

      {/* SOS Button */}
      <SOSButton onPress={handleSOSPress} />
    </div>
  )
}
