'use client'

import { useState } from 'react'
import { 
  MapPin, 
  Copy, 
  Share2, 
  MessageCircle, 
  Phone,
  Navigation,
  ArrowLeft,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface LocationSharingScreenProps {
  onBack: () => void
}

export function LocationSharingScreen({ onBack }: LocationSharingScreenProps) {
  const [copied, setCopied] = useState(false)
  
  const location = {
    latitude: 13.7563,
    longitude: 100.5018,
    address: 'Pathum Wan, Bangkok, Thailand',
    plusCode: '7P52QRXF+XX',
  }

  const coordinates = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  const googleMapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`

  const handleCopyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(coordinates)
      setCopied(true)
      toast.success('Coordinates copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy coordinates')
    }
  }

  const shareOptions = [
    {
      id: 'line',
      name: 'Line',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`My location: ${googleMapsUrl}`)}`, '_blank')
      },
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: Phone,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        window.open(`sms:?body=${encodeURIComponent(`My location: ${googleMapsUrl}`)}`, '_blank')
      },
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500 hover:bg-emerald-600',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`My location: ${googleMapsUrl}`)}`, '_blank')
      },
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Share Location</h1>
            <p className="text-xs text-muted-foreground">Send your location to emergency contacts</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Map Placeholder */}
        <Card className="overflow-hidden">
          <div className="relative h-48 bg-muted flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="relative text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground mb-2">
                <MapPin className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">{location.address}</p>
              <p className="text-xs text-muted-foreground mt-1">Map View</p>
            </div>
          </div>
        </Card>

        {/* Coordinates Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              Coordinates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
              <code className="text-sm font-mono">{coordinates}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCoordinates}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Plus Code: {location.plusCode}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Share Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              Share via
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {shareOptions.map((option) => (
                <Button
                  key={option.id}
                  onClick={option.action}
                  className={`flex flex-col items-center gap-2 h-auto py-4 ${option.color} text-white`}
                >
                  <option.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{option.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Open in Maps */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => window.open(googleMapsUrl, '_blank')}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Open in Google Maps
        </Button>
      </div>
    </div>
  )
}
