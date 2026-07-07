'use client'

import { useState } from 'react'
import { 
  MapPin, 
  Copy, 
  Share2, 
  MessageCircle, 
  MessageSquare,
  Navigation,
  ArrowLeft,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  buildGoogleMapsLocationUrl,
  buildSmsLocationShareUrl,
  formatLocationCoordinates,
  type LocationShareLocation,
} from '../lib/location-share'

interface LocationSharingScreenProps {
  onBack: () => void
  location: LocationShareLocation
}

export function LocationSharingScreen({ onBack, location }: LocationSharingScreenProps) {
  const [copied, setCopied] = useState(false)
  const coordinates = formatLocationCoordinates(location)
  const googleMapsUrl = buildGoogleMapsLocationUrl(location)
  const locationName = [location.district, location.province].filter(Boolean).join(', ') || 'ตำแหน่งปัจจุบัน'

  const handleCopyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(coordinates)
      setCopied(true)
      toast.success('คัดลอกพิกัดแล้ว')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('ไม่สามารถคัดลอกพิกัดได้')
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
      icon: MessageSquare,
      color: 'bg-sky-600 hover:bg-sky-700',
      action: () => {
        window.location.href = buildSmsLocationShareUrl(location)
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
            aria-label="ย้อนกลับ"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Share2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">แชร์ตำแหน่ง</h1>
            <p className="text-xs text-muted-foreground">ส่งตำแหน่งให้ผู้ติดต่อฉุกเฉิน</p>
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
              <p className="text-sm font-medium text-foreground">{locationName}</p>
              <p className="text-xs text-muted-foreground mt-1">แผนที่ตำแหน่ง</p>
            </div>
          </div>
        </Card>

        {/* Coordinates Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              พิกัดปัจจุบัน
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
                aria-label="คัดลอกพิกัด"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              แชร์ผ่าน
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
          เปิดใน Google Maps
        </Button>
      </div>
    </div>
  )
}
