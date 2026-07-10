/**
 * Public API ของ incident-alert feature
 *
 * Feature นี้เป็น owner ของ alert/notification artifacts, visibility, sound preference,
 * detail navigation และ popup UI. Realtime hook ภายในยังแยกไว้ใน model เพื่อลด import React โดยไม่จำเป็น.
 */
export type {
  Alert,
  AlertSeverity,
  Notification,
  NotificationType,
  SseEvent,
} from './model/types.ts'
export * from './lib/artifacts.ts'
export * from './lib/audio.ts'
export * from './lib/navigation.ts'
export * from './lib/preferences.ts'
export * from './lib/visibility.ts'
export * from './ui/alert-display.tsx'
