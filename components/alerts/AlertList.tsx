"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getCountry } from "@/lib/locations";
import { ALERT_EMAIL_STORAGE_KEY } from "@/lib/storage";
import type { Alert } from "@/lib/types";

const RANGE_LABELS: Record<Alert["range"], string> = {
  "24h": "24h",
  week: "Week",
  "2weeks": "2 weeks",
};

export default function AlertList() {
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ALERT_EMAIL_STORAGE_KEY);
      if (saved) setEmail(saved);
    } catch {
      // localStorage may be unavailable.
    }
  }, []);

  useEffect(() => {
    if (!email) return;
    void loadAlerts(email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function loadAlerts(forEmail: string) {
    setLoading(true);
    setError(null);
    setNeedsSetup(false);
    try {
      const res = await fetch(`/api/alerts?email=${encodeURIComponent(forEmail)}`);
      const body = await res.json();
      if (body.error === "Alerts need Upstash setup") {
        setNeedsSetup(true);
        return;
      }
      if (!res.ok) throw new Error(body.error || "Failed to load alerts");
      setAlerts(body.alerts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  function handleSaveEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem(ALERT_EMAIL_STORAGE_KEY, trimmed);
    } catch {
      // localStorage may be unavailable; ignore.
    }
    setEmail(trimmed);
  }

  async function handleDelete(id: string) {
    if (!email) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/alerts?id=${encodeURIComponent(id)}&email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to delete alert");
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alert");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="mb-1 text-lg font-semibold">My Alerts</h2>
      <p className="mb-3 text-sm text-gray-500">Enter your email to see and delete your alerts</p>

      {!email ? (
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
            />
          </div>
          <Button onClick={handleSaveEmail}>View Alerts</Button>
        </div>
      ) : needsSetup ? (
        <p className="text-sm text-gray-500">Alerts need Upstash setup.</p>
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading alerts...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : alerts.length === 0 ? (
        <p className="text-sm text-gray-500">No alerts yet for {email}.</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const countryLabels = alert.countries
              .map((c) => getCountry(c)?.label)
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{alert.keyword}</p>
                  <p className="text-xs text-gray-500">
                    {countryLabels} · LinkedIn · {RANGE_LABELS[alert.range] ?? "24h"} ·{" "}
                    {alert.email}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleDelete(alert.id)}
                  disabled={deletingId === alert.id}
                >
                  {deletingId === alert.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
