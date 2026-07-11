'use client'

import { Ambulance, Bug, Car, Flame, HeartHandshake, LifeBuoy, Luggage, ShieldAlert, Waves, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getCategoryDisplayLabel, useReferenceCategories } from '@/shared/reference'
import type { EmergencyCategory } from '@/entities/incident'
import { cn } from '@/shared/utils'
import { useMobileI18n } from '@/shared/i18n/mobile'

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

/**
 * Category grid หน้าแรกของ mobile
 *
 * แสดงหมวดจาก reference API พร้อม fallback icon map ถ้าแก้ category/icon ต้องทดสอบ
 * mobile create incident เพราะค่าที่เลือกถูกส่งต่อไป payload builder.
 */
interface EmergencyCategoriesGridProps {
  onSelectCategory: (category: EmergencyCategory) => void
}

/**
 * จุดเริ่มเลือกประเภทเหตุของ mobile flow. ใช้ master category ตาม locale จึงไม่ควร hard-code label
 * หรือส่งข้อความที่แปลแล้วกลับไป API; callback ต้องส่ง category id เดิมเพื่อสร้าง incident ถูกหมวด.
 */
export function EmergencyCategoriesGrid({ onSelectCategory }: EmergencyCategoriesGridProps) {
  const { categories } = useReferenceCategories()
  const { language } = useMobileI18n()
  const preferThai = language === 'th'

  return (
    <div className="grid grid-cols-2 gap-3">
      {categories.map(category => {
        const Icon = iconMap[category.icon] || ShieldAlert

        return (
          <Card
            key={category.id}
            className={cn('cursor-pointer transition-all duration-200 active:scale-[0.98]', 'hover:shadow-md hover:border-primary/30', 'touch-target')}
            onClick={() => onSelectCategory(category.id)}
            role="button"
            tabIndex={0}
            aria-label={getCategoryDisplayLabel(category, preferThai) + ' - ' + category.description}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectCategory(category.id)
              }
            }}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center">
              <div className={cn('mb-3 flex h-14 w-14 items-center justify-center rounded-xl', category.bgColor)}>
                <Icon className={cn('h-7 w-7', category.color)} />
              </div>
              <h3 className="text-sm font-medium text-foreground leading-tight">
                {getCategoryDisplayLabel(category, preferThai)}
              </h3>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
