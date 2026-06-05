'use client'

import { Home, History, User, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = 'home' | 'history' | 'location' | 'profile'

interface MobileNavProps {
  active: NavItem
  onNavigate: (item: NavItem) => void
}

const navItems = [
  { id: 'home' as const, label: 'Home', icon: Home },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'location' as const, label: 'Location', icon: MapPin },
  { id: 'profile' as const, label: 'Profile', icon: User },
]

export function MobileNav({ active, onNavigate }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t safe-area-inset z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
                'touch-target',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export type { NavItem }
