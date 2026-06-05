'use client'

import { 
  ShieldAlert, 
  Ambulance, 
  Flame, 
  LifeBuoy, 
  Waves,
  Car,
  Baby,
  HeartHandshake,
  Bug,
  Luggage,
  LucideIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { emergencyCategories } from '@/lib/mock-data'
import { EmergencyCategory } from '@/lib/types'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  ShieldAlert,
  Ambulance,
  Flame,
  LifeBuoy,
  Waves,
  Car,
  Baby,
  HeartHandshake,
  Bug,
  Luggage,
}

interface EmergencyCategoriesGridProps {
  onSelectCategory: (category: EmergencyCategory) => void
}

export function EmergencyCategoriesGrid({ onSelectCategory }: EmergencyCategoriesGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {emergencyCategories.map((category) => {
        const Icon = iconMap[category.icon] || ShieldAlert

        return (
          <Card
            key={category.id}
            className={cn(
              'cursor-pointer transition-all duration-200 active:scale-[0.98]',
              'hover:shadow-md hover:border-primary/30',
              'touch-target'
            )}
            onClick={() => onSelectCategory(category.id)}
            role="button"
            tabIndex={0}
            aria-label={`${category.name} - ${category.description}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectCategory(category.id)
              }
            }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className={cn(
                'mb-3 flex h-14 w-14 items-center justify-center rounded-xl',
                category.bgColor
              )}>
                <Icon className={cn('h-7 w-7', category.color)} />
              </div>
              <h3 className="text-sm font-medium text-foreground leading-tight">
                {category.name}
              </h3>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
