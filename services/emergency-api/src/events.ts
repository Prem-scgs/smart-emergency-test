import { EventEmitter } from "node:events";

/**
 * In-process realtime event bus ของ API
 *
 * ใช้ส่ง `incident.created` และ `incident.status_updated` จาก route ไป SSE endpoint
 * ข้อควรระวัง: ถ้า production มีหลาย API instance ต้องเปลี่ยนเป็น shared pub/sub.
 */
export type EmergencyEvent = {
  type: "incident.created" | "incident.status_updated";
  payload: unknown;
};

export const emergencyEvents = new EventEmitter();

export function emitEmergencyEvent(event: EmergencyEvent) {
  emergencyEvents.emit(event.type, event.payload);
}
