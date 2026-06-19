'use client'

import { useEffect, useState } from 'react'
import {
  Phone,
  X,
  MapPin,
  CheckCircle2,
  Clock,
  PhoneMissed,
  PhoneOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { EmergencyContact, CallStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface EmergencyCallScreenProps {
  contact: EmergencyContact
  onCancel: () => void
  onComplete: (status: CallStatus) => void
}

type CallPhase = 'dialing' | 'connected' | 'feedback'

export function EmergencyCallScreen({
  contact,
  onCancel,
  onComplete,
}: EmergencyCallScreenProps) {
  const [phase, setPhase] = useState<CallPhase>('dialing')
  const [selectedStatus, setSelectedStatus] = useState<CallStatus>('connected')
  const [callDuration, setCallDuration] = useState(0)

  useEffect(() => {
    const dialTimeout = setTimeout(() => {
      setPhase('connected')
    }, 3000)

    return () => clearTimeout(dialTimeout)
  }, [])

  useEffect(() => {
    if (phase !== 'connected') return

    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [phase])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0')
  }

  const handleEndCall = () => {
    setPhase('feedback')
  }

  const handleSubmitFeedback = () => {
    onComplete(selectedStatus)
  }

  const feedbackOptions: { value: CallStatus; label: string; icon: typeof CheckCircle2 }[] = [
    { value: 'connected', label: 'Connected', icon: CheckCircle2 },
    { value: 'busy', label: 'Busy', icon: Clock },
    { value: 'no-answer', label: 'No Answer', icon: PhoneMissed },
    { value: 'wrong-number', label: 'Wrong Number', icon: PhoneOff },
  ]

  return (
    <div className="fixed inset-0 flex flex-col bg-foreground safe-area-inset">
      <div className="flex-1 flex flex-col items-center justify-center text-background p-6">
        <div
          className={cn(
            'mb-6 flex h-24 w-24 items-center justify-center rounded-full',
            phase === 'dialing' ? 'bg-background/20' : 'bg-success'
          )}
        >
          <Phone className={cn('h-12 w-12', phase === 'dialing' && 'animate-pulse')} />
        </div>

        <h1 className="text-2xl font-bold mb-1">{contact.agencyName}</h1>
        <p className="text-3xl font-mono font-bold mb-4">{contact.phoneNumber}</p>

        {phase === 'dialing' ? (
          <p className="text-background/70 animate-pulse">Calling...</p>
        ) : (
          <div className="text-center">
            <p className="text-success mb-1">Connected</p>
            <p className="text-2xl font-mono">{formatDuration(callDuration)}</p>
          </div>
        )}

        <Card className="mt-8 w-full max-w-sm bg-background/10 border-background/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-background/80">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Your location will be shared with the agency</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6 pb-8">
        <div className="flex gap-4 justify-center">
          {phase === 'dialing' ? (
            <Button
              onClick={onCancel}
              variant="outline"
              size="lg"
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 border-0 text-destructive-foreground"
              aria-label="Cancel call"
            >
              <X className="h-8 w-8" />
            </Button>
          ) : (
            <Button
              onClick={handleEndCall}
              variant="outline"
              size="lg"
              className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 border-0 text-destructive-foreground"
              aria-label="End call"
            >
              <Phone className="h-8 w-8 rotate-[135deg]" />
            </Button>
          )}
        </div>
      </div>

      {phase === 'feedback' ? (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border border-border/40 bg-background px-5 pb-8 pt-5 shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-muted" />
          <div className="mx-auto max-w-md space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">ยืนยันผลการโทร</h2>
              <p className="text-sm text-muted-foreground">
                เลือกผลการโทรก่อนส่งต่อไปยังหน้าติดตามสถานะ
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <RadioGroup
                  value={selectedStatus}
                  onValueChange={val => setSelectedStatus(val as CallStatus)}
                  className="space-y-3"
                >
                  {feedbackOptions.map(option => (
                    <div key={option.value} className="flex items-center space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label
                        htmlFor={option.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <option.icon
                          className={cn(
                            'h-4 w-4',
                            option.value === 'connected' ? 'text-success' : 'text-muted-foreground'
                          )}
                        />
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Button onClick={handleSubmitFeedback} className="w-full">
              บันทึกผลการโทร
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
