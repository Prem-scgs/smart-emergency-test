export const INCIDENT_STATUS_ORDER = [
  "reported",
  "acknowledged",
  "coordinating",
  "dispatched",
  "on_scene",
  "closed",
] as const;

export type IncidentWorkflowStatus = (typeof INCIDENT_STATUS_ORDER)[number];

export type IncidentStatusRole = "agency_admin" | "super_admin";

type IncidentStatusTransitionInput = {
  role: IncidentStatusRole;
  fromStatus: IncidentWorkflowStatus;
  toStatus: IncidentWorkflowStatus;
  note?: string | null;
};

type IncidentStatusTransitionResult =
  | {
      ok: true;
      transition: {
        fromStatus: IncidentWorkflowStatus;
        toStatus: IncidentWorkflowStatus;
        note: string | null;
      };
    }
  | {
      ok: false;
      statusCode: 400 | 403;
      code: string;
      error: string;
    };

export function validateIncidentStatusTransition(
  input: IncidentStatusTransitionInput
): IncidentStatusTransitionResult {
  const fromIndex = INCIDENT_STATUS_ORDER.indexOf(input.fromStatus);
  const toIndex = INCIDENT_STATUS_ORDER.indexOf(input.toStatus);

  if (fromIndex === toIndex) {
    return {
      ok: false,
      statusCode: 400,
      code: "INCIDENT_STATUS_UNCHANGED",
      error: "Incident is already in the requested status",
    };
  }

  if (input.role === "agency_admin" && toIndex !== fromIndex + 1) {
    return {
      ok: false,
      statusCode: 403,
      code: "INCIDENT_STATUS_TRANSITION_FORBIDDEN",
      error: "Agency admins can only move an incident to the next status",
    };
  }

  const normalizedNote = input.note?.trim() || null;

  if (toIndex < fromIndex && !normalizedNote) {
    return {
      ok: false,
      statusCode: 400,
      code: "INCIDENT_STATUS_REASON_REQUIRED",
      error: "A reason is required when moving an incident backward",
    };
  }

  return {
    ok: true,
    transition: {
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      note: normalizedNote,
    },
  };
}
