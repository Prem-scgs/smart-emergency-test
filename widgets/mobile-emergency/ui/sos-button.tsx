'use client'

import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/utils'

/**
 * SOS button หลักของ mobile
 *
 * เป็น action สำคัญที่สุดของ citizen flow ถ้าแก้ตำแหน่ง/ขนาด/callback ต้องทดสอบ
 * touch target บน iPhone และ path ไป incident selection.
 */
interface SOSButtonProps {
  onPress: () => void
  className?: string
}

export function SOSButton({ onPress, className }: SOSButtonProps) {
  return (
    <div className={cn('fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8 safe-area-inset', className)}>
      <Button
        onClick={onPress}
        className={cn(
          'w-full h-16 text-xl font-bold rounded-2xl',
          'bg-primary hover:bg-primary/90',
          'shadow-lg shadow-primary/30',
          'emergency-pulse',
          'touch-target'
        )}
        aria-label="SOS Emergency - Call for immediate help"
      >
        <Phone className="mr-2 h-6 w-6" />
        SOS EMERGENCY
      </Button>
    </div>
  )
}
