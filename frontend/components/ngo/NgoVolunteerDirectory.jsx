
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  Truck,
  UserRound,
  AlertCircle,
} from "lucide-react";

import { api } from "../../lib/api/client";

export default function NgoVolunteerDirectory() {
  const [volunteers, setVolunteers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVolunteers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.getVolunteerDirectory();

      if (
        !response?.success ||
        !Array.isArray(response?.data?.volunteers)
      ) {
        throw new Error("Invalid volunteer directory response");
      }

      setVolunteers(response.data.volunteers);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load volunteers"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  let cancelled = false;

  async function fetchInitialVolunteers() {
    try {
      const response = await api.getVolunteerDirectory();

      if (cancelled) return;

      if (
        !response?.success ||
        !Array.isArray(response?.data?.volunteers)
      ) {
        throw new Error(
          "Invalid volunteer directory response"
        );
      }

      setVolunteers(response.data.volunteers);
      setError("");
    } catch (err) {
      if (cancelled) return;

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load volunteers"
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void fetchInitialVolunteers();

  return () => {
    cancelled = true;
  };
}, []);

  const filtered = volunteers.filter((volunteer) =>
    (volunteer.fullName || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-forest">
            Volunteer Directory
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            View registered volunteers and their current availability.
          </p>
        </div>

        <button
          type="button"
          onClick={loadVolunteers}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2 font-bold text-forest disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3">
        <Search className="h-5 w-5 text-ink-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search volunteers by name..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
        >
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-ink-muted">
          Loading volunteers...
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-12 text-center text-ink-muted">
          No volunteers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((volunteer) => {
            const status = volunteer.isBusy
              ? "On Assignment"
              : volunteer.canAssign
                ? "Available"
                : "Unavailable";

            return (
              <div
                key={volunteer.id}
                className="rounded-2xl border border-line bg-paper p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-sage-light p-3 text-forest">
                    <UserRound className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-charcoal">
                      {volunteer.fullName}
                    </h3>

                    <p className="mt-1 text-xs text-ink-muted">
                      {status}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      volunteer.canAssign
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-sm text-ink-muted">
                  <Truck className="h-4 w-4 text-forest" />
                  Transport:{" "}
                  {volunteer.vehicleType || "Not specified"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
