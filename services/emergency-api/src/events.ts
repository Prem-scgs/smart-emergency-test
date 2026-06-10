import { EventEmitter } from "node:events";

export type EmergencyEvent = {
  type: "incident.created";
  payload: unknown;
};

export const emergencyEvents = new EventEmitter();

export function emitEmergencyEvent(event: EmergencyEvent) {
  emergencyEvents.emit(event.type, event.payload);
}
