import { randomBytes } from "node:crypto";
export function createSseTicketStore(options: { ttlMs: number; now?: () => number; maxTickets?: number }) {
  const now = options.now ?? Date.now; const tickets = new Map<string, { subject: string; expiresAt: number }>();
  const maxTickets = options.maxTickets ?? 1000;
  const cleanup = () => {
    const currentTime = now();
    for (const [ticket, value] of tickets) if (value.expiresAt < currentTime) tickets.delete(ticket);
    while (tickets.size >= maxTickets) tickets.delete(tickets.keys().next().value!);
  };
  return { issue(subject: string) { cleanup(); const ticket = randomBytes(24).toString("base64url"); tickets.set(ticket, { subject, expiresAt: now() + options.ttlMs }); return ticket; },
    consume(ticket: string) { const value = tickets.get(ticket); tickets.delete(ticket); return value && value.expiresAt >= now() ? value.subject : null; },
    size() { return tickets.size; } };
}
export const sseTickets = createSseTicketStore({ ttlMs: 60_000 });
