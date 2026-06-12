type RateLimitOptions = {
  maxRequests: number;
  windowMs: number;
  now?: () => number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

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
