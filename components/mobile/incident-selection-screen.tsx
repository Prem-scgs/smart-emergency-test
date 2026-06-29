'use client'

import { Ambulance, ArrowLeft, Bookmark, Bug, Car, CheckCircle2, Clock, Flame, HeartHandshake, LifeBuoy, Luggage, MapPin, Navigation, Phone, ShieldAlert, Waves, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/lib/reference-categories'
import { EmergencyCategory, EmergencyContact } from '@/lib/types'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  ShieldAlert,
  Ambulance,
  Flame,
  LifeBuoy,
  Waves,
  Car,
  Baby: Bug,
  HeartHandshake,
  Bug,
  Luggage,
}

interface IncidentSelectionScreenProps {
  categoryId: EmergencyCategory
  contacts: EmergencyContact[]
  isLoadingContacts?: boolean
  onBack: () => void
  onCall: (contact: EmergencyContact) => void
  onViewMap: (contact: EmergencyContact) => void
}

function buildTelUrl(phoneNumber: string) {
  const sanitizedPhone = phoneNumber.replace(/[^\d+*#]/g, '')
  return `tel:${sanitizedPhone}`
}

export function IncidentSelectionScreen({ categoryId, contacts, isLoadingContacts = false, onBack, onCall, onViewMap }: IncidentSelectionScreenProps) {
  const { categories } = useReferenceCategories()
  const category = categories.find(item => item.id === categoryId)
  const visibleContacts = contacts.filter(contact => contact.category === categoryId)
  const Icon = category ? iconMap[category.icon] : ShieldAlert

  if (!category) return null

  return (
    <div className="flex flex-col min-h-screen bg-background safe-area-inset">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', category.bgColor)}>
            <Icon className={cn('h-5 w-5', category.color)} />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{getCategoryDisplayLabel(category, false)}</h1>
            <p className="text-xs text-muted-foreground">{category.recommendedAgency}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-32">
        <div className="p-4 space-y-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{category.description}</p></CardContent></Card>

          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Nearby Emergency Contacts</h2>
            <div className="space-y-3">
              {isLoadingContacts ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">Loading emergency contacts...</CardContent></Card>
              ) : null}
              {!isLoadingContacts && visibleContacts.length === 0 ? (
                <Card><CardContent className="p-4 text-sm text-muted-foreground">No emergency contacts found for this category yet.</CardContent></Card>
              ) : null}
              {visibleContacts.map(contact => (
                <Card key={contact.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground truncate">{contact.agencyName}</h3>
                          {contact.status === 'active' ? (
                            <Badge variant="secondary" className="shrink-0 bg-success/10 text-success border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-lg font-semibold text-primary mt-1">{contact.phoneNumber}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{contact.distance?.toFixed(1)} km</span>
                          {contact.is24Hours ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />24/7</span> : null}
                        </div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={buildTelUrl(contact.phoneNumber)}
                        onClick={() => onCall(contact)}
                        className={buttonVariants({
                          className: 'bg-success hover:bg-success/90 text-success-foreground',
                        })}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </a>
                      <Button variant="outline" onClick={() => onViewMap(contact)}><MapPin className="h-4 w-4 mr-1" />Map</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-6 bg-gradient-to-t from-background via-background to-transparent">
        <Button variant="outline" className="w-full"><Bookmark className="h-4 w-4 mr-2" />Save Incident</Button>
      </div>
    </div>
  )
}
