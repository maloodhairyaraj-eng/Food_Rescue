"use client";

import { useCallback, useEffect, useState } from "react";
import { getVolunteerAvailability, updateVolunteerAvailability } from "../../lib/api/volunteer-directory";

export default function VolunteerAvailability() {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getVolunteerAvailability();
      const value = response?.data?.availability;
      if (typeof value?.isAvailable !== "boolean") throw new Error("Invalid availability response");
      setAvailability(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load availability");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function toggle() {
    if (!availability || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await updateVolunteerAvailability(!availability.isAvailable);
      const value = response?.data?.availability;
      if (typeof value?.isAvailable !== "boolean") throw new Error("Availability update not confirmed");
      setAvailability(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update availability");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-b border-line bg-paper px-6 py-4" aria-label="Volunteer availability">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-forest">Volunteer Availability</h2>
          <p className="text-sm text-ink-muted">Control whether NGOs can assign you new pickups.</p>
        </div>
        <button type="button" aria-pressed={availability?.isAvailable === true} disabled={loading || saving || !availability} onClick={toggle}
          className={`rounded-xl px-5 py-2 text-sm font-bold disabled:opacity-50 ${availability?.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
          {loading ? "Loading..." : saving ? "Saving..." : availability?.isAvailable ? "Available" : "Unavailable"}
        </button>
      </div>
      {error && <p role="alert" className="mx-auto mt-2 max-w-6xl text-sm text-red-700">{error}</p>}
    </section>
  );
}
