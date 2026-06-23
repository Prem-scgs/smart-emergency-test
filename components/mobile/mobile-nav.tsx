'use client'

import { cn } from '@/lib/utils'

type NavItem = 'home' | 'history'

interface MobileNavProps {
  active: NavItem
  onNavigate: (item: NavItem) => void
}

const navItems = [
  { id: 'home' as const, label: 'หน้าหลัก' },
  { id: 'history' as const, label: 'ประวัติ' },
]

export function MobileNav({ active, onNavigate }: MobileNavProps) {
  return (
    <nav className="bg-card border-b">
      <div className="flex items-center h-12">
        {navItems.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex-1 h-full flex items-center justify-center transition-colors relative',
                'text-sm font-medium',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export type { NavItem }
