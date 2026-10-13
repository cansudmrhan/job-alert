import { getRedis, isRedisConfigured } from "./redis";
import type { Alert } from "./types";

type Env = Record<string, string | undefined>;

type LimitKind = "search" | "cv";

export type Limits = {
  searchPerIp: number;
  searchGlobal: number;
  cvPerIp: number;
  cvGlobal: number;
  alertsPerEmail: number;
  alertsGlobal: number;
};

function intFromEnv(name: string, fallback: number, env: Env): number {
  const parsed = Number.parseInt(env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getLimits(env: Env = process.env): Limits {
  return {
    searchPerIp: intFromEnv("DEMO_SEARCH_PER_IP", 10, env),
    searchGlobal: intFromEnv("DEMO_SEARCH_GLOBAL", 40, env),
    cvPerIp: intFromEnv("DEMO_CV_PER_IP", 10, env),
    cvGlobal: intFromEnv("DEMO_CV_GLOBAL", 40, env),
    alertsPerEmail: intFromEnv("DEMO_ALERTS_PER_EMAIL", 3, env),
    alertsGlobal: intFromEnv("DEMO_ALERTS_GLOBAL", 25, env),
  };
}

export interface CounterStore {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

function redisCounterStore(): CounterStore {
  const redis = getRedis();
  return {
    incr: (key) => redis.incr(key),
    decr: (key) => redis.decr(key),
    expire: async (key, seconds) => {
      await redis.expire(key, seconds);
    },
  };
}

type ConsumeResult = { allowed: true } | { allowed: false; scope: "ip" | "global" };

const DAY_SECONDS = 24 * 60 * 60;

function dayStamp(now: Date): string {
  return now.toISOString().slice(0, 10);
}

async function bump(store: CounterStore, key: string): Promise<number> {
  const count = await store.incr(key);
  if (count === 1) await store.expire(key, DAY_SECONDS + 3600);
  return count;
}

// Counts one use against the per-IP and global daily caps. Over-limit attempts
// are rolled back so they don't eat into other visitors' budget.
export async function consumeDailyQuota(
  store: CounterStore,
  kind: LimitKind,
  ip: string,
  limits: Limits = getLimits(),
  now: Date = new Date()
): Promise<ConsumeResult> {
  const perIp = kind === "search" ? limits.searchPerIp : limits.cvPerIp;
  const global = kind === "search" ? limits.searchGlobal : limits.cvGlobal;
  const day = dayStamp(now);
  const ipKey = `limit:${kind}:ip:${ip}:${day}`;
  const globalKey = `limit:${kind}:global:${day}`;

  const ipCount = await bump(store, ipKey);
  if (ipCount > perIp) {
    await store.decr(ipKey);
    return { allowed: false, scope: "ip" };
  }

  const globalCount = await bump(store, globalKey);
  if (globalCount > global) {
    await store.decr(globalKey);
    await store.decr(ipKey);
    return { allowed: false, scope: "global" };
  }

  return { allowed: true };
}

// Fails open when Redis is not configured (local dev without Upstash).
export async function consumeQuota(kind: LimitKind, ip: string): Promise<ConsumeResult> {
  if (!isRedisConfigured()) return { allowed: true };
  try {
    return await consumeDailyQuota(redisCounterStore(), kind, ip);
  } catch {
    return { allowed: true };
  }
}

type AlertCapResult = { allowed: true } | { allowed: false; scope: "email" | "global" };

export function checkAlertCaps(
  alerts: Pick<Alert, "email">[],
  email: string,
  limits: Limits = getLimits()
): AlertCapResult {
  if (alerts.length >= limits.alertsGlobal) return { allowed: false, scope: "global" };
  const mine = alerts.filter((a) => a.email.toLowerCase() === email.toLowerCase()).length;
  if (mine >= limits.alertsPerEmail) return { allowed: false, scope: "email" };
  return { allowed: true };
}

type Budget = { monthlyUsd: number; costPerResultUsd: number };

function floatFromEnv(name: string, fallback: number, env: Env): number {
  const parsed = Number.parseFloat(env[name] ?? "");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getBudget(env: Env = process.env): Budget {
  return {
    monthlyUsd: floatFromEnv("APIFY_MONTHLY_BUDGET_USD", 4, env),
    costPerResultUsd: floatFromEnv("APIFY_COST_PER_RESULT_USD", 0.002, env),
  };
}

export interface BudgetStore {
  get(key: string): Promise<number>;
  incrByFloat(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
}

function redisBudgetStore(): BudgetStore {
  const redis = getRedis();
  return {
    get: async (key) => Number((await redis.get<number | string>(key)) ?? 0) || 0,
    incrByFloat: (key, amount) => redis.incrbyfloat(key, amount),
    expire: async (key, seconds) => {
      await redis.expire(key, seconds);
    },
  };
}

const MONTH_SECONDS = 32 * 24 * 60 * 60;

export function budgetKey(now: Date = new Date()): string {
  return `budget:apify:${now.toISOString().slice(0, 7)}`;
}

export async function isBudgetExhausted(
  store: BudgetStore,
  budget: Budget = getBudget(),
  now: Date = new Date()
): Promise<boolean> {
  return (await store.get(budgetKey(now))) >= budget.monthlyUsd;
}

export async function recordApifyUsage(
  store: BudgetStore,
  resultsCount: number,
  budget: Budget = getBudget(),
  now: Date = new Date()
): Promise<number> {
  const cost = Math.max(0, resultsCount) * budget.costPerResultUsd;
  const key = budgetKey(now);
  const total = await store.incrByFloat(key, cost);
  await store.expire(key, MONTH_SECONDS);
  return total;
}

export async function budgetExhausted(): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  try {
    return await isBudgetExhausted(redisBudgetStore());
  } catch {
    return false;
  }
}

export async function trackApifyUsage(resultsCount: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    await recordApifyUsage(redisBudgetStore(), resultsCount);
  } catch {
  }
}

export const LIMIT_MESSAGES = {
  budget:
    "The monthly demo budget for live job searches has been reached. Cached results are still shown; live search returns next month.",
  search:
    "This public demo has reached its daily search limit. Please try again tomorrow, or run it yourself with your own API keys.",
  cv: "The daily limit for live CV analyses on this demo has been reached, so here is a sample result instead.",
  alertEmail: "This demo limits how many alerts one email address can have. Delete an existing alert to add another.",
  alertGlobal: "This demo has reached its overall alert limit. Please try again later.",
} as const;
