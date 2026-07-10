'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/features/incident-alert/model/notification-context'
import { NotificationCenter } from './notification-center'

/**
 * Bell trigger ของ notification center ใน admin header
 *
 * อ่าน unread count จาก incident-alert provider เดียวกับ popup เพื่อให้ badge,
 * drawer และ realtime visibility ใช้ source เดียวกัน.
 */
export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
        aria-label="แจ้งเตือน"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full min-w-[1.25rem]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      
      <NotificationCenter isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
