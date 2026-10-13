import { describe, expect, it } from "vitest";
import {
  budgetKey,
  checkAlertCaps,
  consumeDailyQuota,
  getBudget,
  getLimits,
  isBudgetExhausted,
  recordApifyUsage,
  type BudgetStore,
  type CounterStore,
  type Limits,
} from "@/lib/limits";

function memoryStore(): CounterStore & { expiries: Map<string, number> } {
  const counts = new Map<string, number>();
  const expiries = new Map<string, number>();
  return {
    expiries,
    async incr(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts.get(key) as number;
    },
    async decr(key) {
      counts.set(key, (counts.get(key) ?? 0) - 1);
      return counts.get(key) as number;
    },
    async expire(key, seconds) {
      expiries.set(key, seconds);
    },
  };
}

const limits: Limits = {
  searchPerIp: 2,
  searchGlobal: 3,
  cvPerIp: 1,
  cvGlobal: 2,
  alertsPerEmail: 3,
  alertsGlobal: 25,
};

describe("daily quota", () => {
  it("blocks an IP after its daily cap", async () => {
    const store = memoryStore();
    expect((await consumeDailyQuota(store, "search", "1.1.1.1", limits)).allowed).toBe(true);
    expect((await consumeDailyQuota(store, "search", "1.1.1.1", limits)).allowed).toBe(true);
    expect(await consumeDailyQuota(store, "search", "1.1.1.1", limits)).toEqual({
      allowed: false,
      scope: "ip",
    });
  });

  it("enforces the global cap across IPs", async () => {
    const store = memoryStore();
    await consumeDailyQuota(store, "search", "a", limits);
    await consumeDailyQuota(store, "search", "b", limits);
    await consumeDailyQuota(store, "search", "c", limits);
    expect(await consumeDailyQuota(store, "search", "d", limits)).toEqual({
      allowed: false,
      scope: "global",
    });
  });

  it("does not let blocked attempts eat the budget", async () => {
    const store = memoryStore();
    await consumeDailyQuota(store, "cv", "a", limits);
    for (let i = 0; i < 5; i++) await consumeDailyQuota(store, "cv", "a", limits);
    // Only one successful use was counted globally, so another IP still fits.
    expect((await consumeDailyQuota(store, "cv", "b", limits)).allowed).toBe(true);
  });

  it("tracks kinds separately and sets an expiry", async () => {
    const store = memoryStore();
    await consumeDailyQuota(store, "cv", "a", limits);
    expect((await consumeDailyQuota(store, "search", "a", limits)).allowed).toBe(true);
    expect(store.expiries.size).toBeGreaterThan(0);
  });

  it("reads limits from env with defaults", () => {
    expect(getLimits({})).toMatchObject({
      searchPerIp: 10,
      searchGlobal: 40,
      cvPerIp: 10,
      cvGlobal: 40,
      alertsPerEmail: 3,
      alertsGlobal: 25,
    });
    expect(getLimits({ DEMO_SEARCH_PER_IP: "4", DEMO_CV_GLOBAL: "oops" })).toMatchObject({
      searchPerIp: 4,
      cvGlobal: 40,
    });
  });
});

describe("alert caps", () => {
  it("allows up to 3 alerts per email, case-insensitively", () => {
    const alerts = [{ email: "A@x.com" }, { email: "a@x.com" }, { email: "a@X.com" }];
    expect(checkAlertCaps(alerts, "a@x.com", limits)).toEqual({ allowed: false, scope: "email" });
    expect(checkAlertCaps(alerts, "b@x.com", limits).allowed).toBe(true);
  });

  it("enforces the global alert cap", () => {
    const alerts = Array.from({ length: 25 }, (_, i) => ({ email: `u${i}@x.com` }));
    expect(checkAlertCaps(alerts, "new@x.com", limits)).toEqual({ allowed: false, scope: "global" });
  });
});

function memoryBudget(): BudgetStore {
  const values = new Map<string, number>();
  return {
    async get(key) {
      return values.get(key) ?? 0;
    },
    async incrByFloat(key, amount) {
      values.set(key, (values.get(key) ?? 0) + amount);
      return values.get(key) as number;
    },
    async expire() {},
  };
}

describe("apify budget guard", () => {
  const now = new Date("2026-10-13T10:00:00Z");

  it("reads defaults and env overrides", () => {
    expect(getBudget({})).toEqual({ monthlyUsd: 4, costPerResultUsd: 0.002 });
    expect(getBudget({ APIFY_MONTHLY_BUDGET_USD: "1.5", APIFY_COST_PER_RESULT_USD: "0.01" })).toEqual({
      monthlyUsd: 1.5,
      costPerResultUsd: 0.01,
    });
  });

  it("accumulates results * cost and stops at the budget", async () => {
    const store = memoryBudget();
    const budget = { monthlyUsd: 4, costPerResultUsd: 0.002 };
    expect(await isBudgetExhausted(store, budget, now)).toBe(false);
    await recordApifyUsage(store, 1000, budget, now); // $2
    expect(await isBudgetExhausted(store, budget, now)).toBe(false);
    await recordApifyUsage(store, 1000, budget, now); // $4
    expect(await isBudgetExhausted(store, budget, now)).toBe(true);
  });

  it("resets each month", async () => {
    const store = memoryBudget();
    const budget = { monthlyUsd: 1, costPerResultUsd: 1 };
    await recordApifyUsage(store, 5, budget, now);
    expect(await isBudgetExhausted(store, budget, now)).toBe(true);
    expect(await isBudgetExhausted(store, budget, new Date("2026-11-01T00:00:00Z"))).toBe(false);
    expect(budgetKey(now)).toBe("budget:apify:2026-10");
  });
});
