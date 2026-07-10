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
