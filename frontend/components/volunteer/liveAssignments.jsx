
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Truck,
  MapPin,
  Clock,
  PackageCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Navigation,
} from "lucide-react";

import { api } from "../../lib/api/client";
import {
  getGoogleMapsDirectionsUrl,
} from "../../lib/maps";

function extractAssignments(response) {
  if (!response?.success) {
    throw new Error(
      response?.message || "Unable to retrieve assignments"
    );
  }

  const data = response.data;

  const assignments =
    data?.assignments ??
    data?.volunteerAssignments;

  if (!Array.isArray(assignments)) {
    throw new Error(
      "Unexpected assignment response. Verify the backend API contract."
    );
  }

  return assignments;
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(status) {
  const labels = {
    assigned: "Assigned",
    approved: "Approved",
    picked_up: "Picked Up",
    collected: "Collected",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  return labels[status] || status || "Unknown";
}

function normalizeAssignment(raw) {
  const food = raw.foodListing || raw.food || {};
  const pickup = raw.pickupRequest || {};

  const pickupLocation =
    raw.pickupLocation ??
    food.pickupLocation ??
    pickup.pickupLocation ??
    null;

  const ngoLocation =
    raw.ngoLocation ??
    raw.ngoOrganization?.location ??
    null;

  return {
    id: raw.id,
    status: raw.status,
    title:
      raw.foodTitle ||
      raw.foodListingTitle ||
      food.title ||
      "Food pickup",
    quantity:
      raw.quantity ??
      raw.requestedQuantity ??
      food.quantity ??
      null,
    quantityUnit:
      raw.quantityUnit ||
      food.quantityUnit ||
      "",
    donorName:
      raw.donorName ||
      raw.donorOrganization?.name ||
      food.donorName ||
      "Food provider",
    ngoName:
      raw.ngoName ||
      raw.ngoOrganization?.name ||
      "NGO",
    pickupAddress:
      raw.pickupAddress ||
      food.pickupAddress ||
      "Address unavailable",
    pickupLocation,
    ngoLocation,
    pickupEndAt:
      raw.pickupEndAt ||
      food.pickupEndAt ||
      null,
  };
}

export default function LiveAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const mounted = useRef(false);
  const requestSequence = useRef(0);
  const processingRef = useRef(false);

  const loadAssignments = useCallback(async () => {
    const sequence = ++requestSequence.current;

    try {
      const response = await api.getVolunteerAssignments();
      const records = extractAssignments(response);

      if (
        !mounted.current ||
        sequence !== requestSequence.current
      ) {
        return;
      }

      setAssignments(records.map(normalizeAssignment));
      setError("");
    } catch (caughtError) {
      if (
        !mounted.current ||
        sequence !== requestSequence.current
      ) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load assignments"
      );
    } finally {
      if (
        mounted.current &&
        sequence === requestSequence.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Start asynchronous loading without synchronous
    // setState inside the effect body.
    Promise.resolve().then(() => {
      if (mounted.current) {
        loadAssignments();
      }
    });

    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [loadAssignments]);

  async function refresh() {
    setLoading(true);
    await loadAssignments();
  }

  async function updateStatus(assignment, nextStatus) {
    if (processingRef.current) return;

    const action =
      nextStatus === "picked_up"
        ? "confirm food collection"
        : "confirm delivery completion";

    if (
      !window.confirm(
        `Are you sure you want to ${action}?`
      )
    ) {
      return;
    }

    processingRef.current = true;
    setProcessingId(assignment.id);
    setError("");
    setNotice("");

    let confirmed = false;

    try {
      const response = await api.updateAssignmentStatus(
        assignment.id,
        nextStatus
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Status update failed"
        );
      }

      confirmed = true;

      setNotice(
        nextStatus === "picked_up"
          ? "Food collection recorded successfully."
          : "Delivery completion recorded successfully."
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update assignment"
      );
    } finally {
      processingRef.current = false;
      setProcessingId(null);
    }

    // Refresh separately: a failed GET must not make
    // a successful database update appear to have failed.
    if (confirmed) {
      try {
        await refresh();
      } catch {
        // loadAssignments already reports read failures.
      }
    }
  }

  return (
    <section className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            My Pickup Assignments
          </h2>

          <p className="mt-1 text-sm text-ink-muted">
            View assigned food rescues and update their progress.
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm font-bold text-forest disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-line bg-paper p-12 text-center">
          <p className="animate-pulse font-bold text-forest">
            Loading your assignments...
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper p-12 text-center">
          <Truck className="mx-auto mb-4 h-10 w-10 text-sage" />

          <h3 className="font-bold text-charcoal">
            No assignments yet
          </h3>

          <p className="mt-2 text-sm text-ink-muted">
            An NGO must assign you to an approved pickup
            before it appears here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {assignments.map((assignment) => {
            const pickupUrl =
              getGoogleMapsDirectionsUrl(
                assignment.pickupLocation
              );

            const deliveryUrl =
              getGoogleMapsDirectionsUrl(
                assignment.ngoLocation
              );

            const canCollect =
              assignment.status === "assigned";

            const canComplete =
              assignment.status === "picked_up";

            const isProcessing =
              processingId === assignment.id;

            return (
              <article
                key={assignment.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm"
              >
                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold text-charcoal">
                        {assignment.title}
                      </h3>

                      <p className="mt-1 text-sm text-ink-muted">
                        {assignment.donorName}
                      </p>
                    </div>

                    <span className="rounded-full bg-sage-light px-3 py-1 text-xs font-bold text-forest">
                      {formatStatus(assignment.status)}
                    </span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <p className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-sage" />
                      {assignment.quantity ?? "Unknown"}{" "}
                      {assignment.quantityUnit}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-sage" />
                      {assignment.pickupAddress}
                    </p>

                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-sage" />
                      Deadline:{" "}
                      {formatDate(assignment.pickupEndAt)}
                    </p>

                    <p className="text-xs text-ink-muted">
                      Receiving NGO: {assignment.ngoName}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {pickupUrl && (
                      <a
                        href={pickupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-forest hover:bg-sage-light/30"
                      >
                        <Navigation className="h-4 w-4" />
                        Pickup Directions
                      </a>
                    )}

                    {deliveryUrl && (
                      <a
                        href={deliveryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-forest hover:bg-sage-light/30"
                      >
                        <MapPin className="h-4 w-4" />
                        NGO Directions
                      </a>
                    )}
                  </div>
                </div>

                {(canCollect || canComplete) && (
                  <div className="border-t border-line bg-ivory p-4">
                    <button
                      type="button"
                      disabled={Boolean(processingId)}
                      onClick={() =>
                        updateStatus(
                          assignment,
                          canCollect
                            ? "picked_up"
                            : "completed"
                        )
                      }
                      className="w-full rounded-xl bg-forest px-5 py-3 font-bold text-paper hover:bg-forest-deep disabled:opacity-50"
                    >
                      {isProcessing
                        ? "Updating..."
                        : canCollect
                        ? "Confirm Food Collected"
                        : "Confirm Delivery Completed"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
