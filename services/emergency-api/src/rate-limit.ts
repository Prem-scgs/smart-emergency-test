type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

/**
 * Rate limiter แบบ in-memory สำหรับ endpoint ที่ถูกกดซ้ำง่าย
 *
 * ใช้กับ incident create และ share attempts เพื่อกัน mobile/user ยิง request รัว ๆ
 * ข้อจำกัดคือ state อยู่ใน process เดียว ถ้า production มีหลาย API instance
 * ต้องเปลี่ยนเป็น shared store เช่น Redis ไม่อย่างนั้นแต่ละ instance จะนับแยกกัน
 */
export function createInMemoryRateLimiter(options: RateLimitOptions) {
  const now = options.now ?? (() => Date.now());
  const requests = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const windowStart = currentTime - options.windowMs;
      const existing = requests.get(key) ?? [];
      const recent = existing.filter((timestamp) => timestamp > windowStart);

      if (recent.length >= options.maxRequests) {
        const retryAfterMs = Math.max(options.windowMs - (currentTime - recent[0]), 0);
        requests.set(key, recent);
        return {
          allowed: false,
          retryAfterMs,
        };
      }

      recent.push(currentTime);
      requests.set(key, recent);

      return {
        allowed: true,
        retryAfterMs: 0,
      };
    },
  };
}
