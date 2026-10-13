"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import CountrySelect from "@/components/search/CountrySelect";
import RangeToggle from "@/components/search/RangeToggle";
import { getCountry } from "@/lib/locations";
import type { Range } from "@/lib/types";
import { ALERT_EMAIL_STORAGE_KEY } from "@/lib/storage";

type CreateAlertModalProps = {
  defaultKeyword: string;
  defaultCountries: string[];
  defaultRange: Range;
  onClose: () => void;
};

export default function CreateAlertModal({
  defaultKeyword,
  defaultCountries,
  defaultRange,
  onClose,
}: CreateAlertModalProps) {
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [countries, setCountries] = useState<string[]>(defaultCountries);
  const [range, setRange] = useState<Range>(defaultRange);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(ALERT_EMAIL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleCreate() {
    if (!keyword || countries.length === 0 || !email) {
      setError("Please fill in all fields.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, countries, range, email }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Something went wrong");
      }
      try {
        localStorage.setItem(ALERT_EMAIL_STORAGE_KEY, email.trim());
      } catch {
        // localStorage may be unavailable (e.g. private browsing); ignore.
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const countryLabels = countries.map((c) => getCountry(c)?.label).filter(Boolean).join(", ");

  return (
    <Modal onClose={onClose}>
      {done ? (
        <>
          <h2 className="mb-2 text-lg font-semibold">Alert created ✅</h2>
          <p className="text-sm text-gray-600">
            We&apos;ll email {email} whenever a new &quot;{keyword}&quot; job appears in{" "}
            {countryLabels}.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-semibold">Create Alert</h2>

          <label className="mb-1 block text-xs font-medium text-gray-500">Keyword</label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />

          <label className="mb-1 mt-3 block text-xs font-medium text-gray-500">Countries</label>
          <CountrySelect value={countries} onChange={setCountries} />

          <label className="mb-1 mt-3 block text-xs font-medium text-gray-500">Time range</label>
          <RangeToggle value={range} onChange={setRange} />

          <label className="mb-1 mt-3 block text-xs font-medium text-gray-500">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Saving..." : "Create"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
