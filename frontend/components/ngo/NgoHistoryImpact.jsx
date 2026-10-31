
"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  PackageCheck,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

import { authStorage } from "../../lib/api/client";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatCard({ title, value, Icon }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="flex items-center gap-3 text-forest">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-bold">
          {title}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold text-charcoal">
        {value}
      </p>
    </div>
  );
}

export default function NgoHistoryImpact() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadHistory() {
      try {
        const token = authStorage.getToken();

        if (!token) {
          throw new Error(
            "Session expired. Please sign in again."
          );
        }

        const response = await fetch(
          `${API_BASE}/pickup-requests/mine`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
            "Unable to load pickup history"
          );
        }

        if (!Array.isArray(result.data?.requests)) {
          throw new Error(
            "Invalid pickup history response"
          );
        }

        if (!controller.signal.aborted) {
          setRequests(result.data.requests);
          setError("");
          setLoading(false);
        }
      } catch (caughtError) {
        if (controller.signal.aborted) return;

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load history"
        );

        setLoading(false);
      }
    }

    void loadHistory();

    return () => controller.abort();
  }, [refreshKey]);

  const completed = requests.filter(
    (request) => request.status === "completed"
  );

  const pending = requests.filter(
    (request) => request.status === "pending"
  );

  const mealsRescued = completed.reduce(
    (total, request) =>
      total + (
        Number(request.requestedQuantity) || 0
      ),
    0
  );

  const completionRate = requests.length
    ? Math.round(
        (completed.length / requests.length) * 100
      )
    : 0;

  const filteredRequests = requests.filter(
    (request) =>
      filter === "all" ||
      request.status === filter
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">
            History & Impact
          </h1>

          <p className="mt-2 text-sm text-ink-muted">
            Track your organization's food rescue
            activities and completed collections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            setRefreshKey((value) => value + 1);
          }}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm font-bold text-forest disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-paper p-12 text-center text-ink-muted">
          Loading rescue history...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Requests"
              value={requests.length}
              Icon={BarChart3}
            />

            <StatCard
              title="Completed Rescues"
              value={completed.length}
              Icon={CheckCircle2}
            />

            <StatCard
              title="Units Rescued"
              value={mealsRescued}
              Icon={PackageCheck}
            />

            <StatCard
              title="Completion Rate"
              value={`${completionRate}%`}
              Icon={TrendingUp}
            />
          </div>

          <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-forest" />

              <h2 className="text-lg font-bold text-forest">
                Request Summary
              </h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-ink-muted">
                  Pending
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {pending.length}
                </p>
              </div>

              <div>
                <p className="text-sm text-ink-muted">
                  Approved
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {
                    requests.filter(
                      (r) => r.status === "approved"
                    ).length
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-ink-muted">
                  Completed
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {completed.length}
                </p>
              </div>
            </div>
          </div>

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-forest">
                Pickup History
              </h2>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
                className="rounded-xl border border-line bg-paper px-4 py-3 text-sm"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-ink-muted">
                No pickup requests found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-line bg-paper p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-charcoal">
                          {request.foodTitle || "Food Donation"}
                        </h3>

                        <p className="mt-1 text-sm text-ink-muted">
                          Donor: {request.donorName || "Unknown"}
                        </p>

                        <p className="mt-1 text-sm text-ink-muted">
                          Quantity: {request.requestedQuantity ?? "N/A"}
                        </p>

                        <p className="mt-1 text-xs text-ink-muted">
                          Requested: {formatDate(request.createdAt)}
                        </p>
                      </div>

                      <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        request.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : request.status === "approved"
                            ? "bg-blue-100 text-blue-800"
                            : request.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
