import { Redis } from "@upstash/redis";
import { errors } from "./errors";
import type { Alert } from "./types";

let client: Redis | null = null;

export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw errors.notConfigured("Alerts need Upstash setup");
    }
    client = new Redis({ url, token });
  }
  return client;
}

const ALERTS_KEY = "alerts";
const SEEN_PREFIX = "alert:seen:";

export async function saveAlert(alert: Alert) {
  const redis = getRedis();
  await redis.hset(ALERTS_KEY, { [alert.id]: JSON.stringify(alert) });
}

export async function getAllAlerts(): Promise<Alert[]> {
  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, string>>(ALERTS_KEY);
  if (!raw) return [];
  return Object.values(raw).map((v) =>
    typeof v === "string" ? (JSON.parse(v) as Alert) : (v as unknown as Alert)
  );
}

export async function getAlertsByEmail(email: string): Promise<Alert[]> {
  const alerts = await getAllAlerts();
  return alerts.filter((a) => a.email.toLowerCase() === email.toLowerCase());
}

export async function deleteAlert(id: string, email: string): Promise<boolean> {
  const redis = getRedis();
  const raw = await redis.hget<string | Alert>(ALERTS_KEY, id);
  if (!raw) return false;
  const alert = typeof raw === "string" ? (JSON.parse(raw) as Alert) : raw;
  if (alert.email.toLowerCase() !== email.toLowerCase()) return false;

  await redis.hdel(ALERTS_KEY, id);
  await redis.del(`${SEEN_PREFIX}${id}`);
  return true;
}

// The unguessable alert id is the credential for the emailed stop link.
export async function deleteAlertById(id: string): Promise<boolean> {
  const redis = getRedis();
  const removed = await redis.hdel(ALERTS_KEY, id);
  await redis.del(`${SEEN_PREFIX}${id}`);
  return removed > 0;
}

export async function getSeenJobIds(alertId: string): Promise<Set<string>> {
  const redis = getRedis();
  const members = await redis.smembers(`${SEEN_PREFIX}${alertId}`);
  return new Set(members);
}

export async function markJobsSeen(alertId: string, jobIds: string[]) {
  if (jobIds.length === 0) return;
  const redis = getRedis();
  const key = `${SEEN_PREFIX}${alertId}`;
  const [first, ...rest] = jobIds;
  await redis.sadd(key, first, ...rest);
  // Searches look back at most 14 days, so 30 days of memory is enough.
  await redis.expire(key, 30 * 24 * 60 * 60);
}
