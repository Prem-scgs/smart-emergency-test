'use client'
import { X, Trash2, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getEmergencyCategoryLabel } from '@/lib/emergency-category-utils'
import { useNotifications } from '@/lib/notification-context'
import { getLocationDisplayName, useLocationLookupMaps } from '@/lib/reference-locations'
import { cn } from '@/lib/utils'

interface NotificationCenterProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationCenter({ isOpen, onOpenChange }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications()
  const { provinceByCode, districtByCode } = useLocationLookupMaps()

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
  }

  const getLocationLabel = (notification: (typeof notifications)[number]) => {
    const province = notification.provinceCode ? provinceByCode[notification.provinceCode] : undefined
    const district = notification.districtCode ? districtByCode[notification.districtCode] : undefined
    const provinceLabel = getLocationDisplayName(province) || notification.province || ''
    const districtLabel = getLocationDisplayName(district) || notification.district || ''
    return [districtLabel, provinceLabel].filter(Boolean).join(', ')
  }

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] flex flex-col">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between w-full">
            <DrawerTitle>แจ้งเตือน ({unreadCount})</DrawerTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  ลบทั้งหมด
                </Button>
              )}
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <p>ไม่มีแจ้งเตือน</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 flex gap-3 hover:bg-accent/50 transition-colors cursor-pointer',
                    !notification.read && 'bg-accent/20'
                  )}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  {/* Indicator dot */}
                  <div className="flex-shrink-0 mt-1">
                    {!notification.read ? (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium truncate">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    {getLocationLabel(notification) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {getLocationLabel(notification)}
                      </p>
                    )}
                    {notification.category && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {getEmergencyCategoryLabel(notification.category, notification.category)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {notification.actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      type="button"
                      onClick={() => {
                        window.location.href = notification.actionUrl as string
                      }}
                    >
                      ดู
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes}นาทีที่แล้ว`
  if (hours < 24) return `${hours}ชั่วโมงที่แล้ว`
  if (days < 7) return `${days}วันที่แล้ว`
  return new Date(date).toLocaleDateString('th-TH')
}
