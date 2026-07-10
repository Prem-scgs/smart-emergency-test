/**
 * HTTP methods ที่ API อนุญาตผ่าน CORS
 *
 * ใช้กับ Fastify CORS registration ใน server.ts ถ้าเพิ่ม endpoint method ใหม่
 * ต้องเพิ่มที่นี่ ไม่อย่างนั้น browser frontend จะโดน preflight block.
 */
export const corsMethods = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
];
