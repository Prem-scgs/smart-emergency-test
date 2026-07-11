/**
 * สร้าง error payload มาตรฐานของ API
 *
 * Frontend หลายจุดอ่าน `error`, `code`, `statusCode` เพื่อแสดงข้อความ/จัดการ retry
 * ถ้าเปลี่ยน shape ต้องทดสอบ admin detail, settings และ mobile create incident.
 */
/**
 * สร้าง error payload มาตรฐานของ API
 *
 * Frontend หลายจุดอ่าน `error`, `code`, `statusCode` เพื่อแสดงข้อความ/จัดการ retry
 * ถ้าเปลี่ยน shape ต้องทดสอบ admin detail, settings และ mobile create incident.
 */
/**
 * สร้าง error payload มาตรฐานของ API
 *
 * Frontend หลายจุดอ่าน `error`, `code`, `statusCode` เพื่อแสดงข้อความ/จัดการ retry
 * ถ้าเปลี่ยน shape ต้องทดสอบ admin detail, settings และ mobile create incident.
 */
/**
 * สร้าง error payload มาตรฐานของ API
 *
 * Frontend หลายจุดอ่าน `error`, `code`, `statusCode` เพื่อแสดงข้อความ/จัดการ retry
 * ถ้าเปลี่ยน shape ต้องทดสอบ admin detail, settings และ mobile create incident.
 */
export function buildApiErrorPayload(
  statusCode: number,
  code: string,
  message: string
) {
  return {
    error: message,
    code,
    statusCode,
  };
}

export function getHttpErrorStatus(error: unknown, replyStatusCode: number) {
  const errorStatusCode =
    error && typeof error === "object" && "statusCode" in error
      ? (error as { statusCode?: unknown }).statusCode
      : undefined;
  if (
    typeof errorStatusCode === "number" &&
    errorStatusCode >= 400 &&
    errorStatusCode <= 599
  ) {
    return errorStatusCode;
  }
  return replyStatusCode >= 400 ? replyStatusCode : 500;
}
