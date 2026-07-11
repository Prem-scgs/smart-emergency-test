'use client'

import { Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMobileI18n } from '@/shared/i18n/mobile'
import { cn } from '@/shared/utils'

interface SOSButtonProps {
  onPress: () => void
  className?: string
}

export function SOSButton({ onPress, className }: SOSButtonProps) {
  const { t } = useMobileI18n()

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8 safe-area-inset', className)}>
      <Button
        onClick={onPress}
        className={cn('w-full h-16 text-xl font-bold rounded-2xl', 'bg-primary hover:bg-primary/90', 'shadow-lg shadow-primary/30', 'emergency-pulse', 'touch-target')}
        aria-label={t('sosLabel')}
      >
        <Phone className="mr-2 h-6 w-6" />
        {t('sosLabel')}
      </Button>
    </div>
  )
}
