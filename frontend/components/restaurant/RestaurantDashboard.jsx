"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api/client";

import {
  LayoutDashboard,
  PlusCircle,
  List as ListIcon,
  Users,
  PackageOpen,
  BarChart3,
  Star,
  User as UserIcon,
  Settings,
  Bell,
  Leaf,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  Menu,
  XCircle,
  ShieldCheck,
  Edit3,
  Save,
  X,
  Globe,
  Shield,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authStorage } from "../../lib/api/client";


function formatDateTime(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeDonation(listing) {
  const statusLabels = {
    available: "Available",
    reserved: "Reserved",
    picked_up: "Picked Up",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };

  return {
    ...listing,
    food: listing.title,
    qty: `${listing.quantity} ${listing.quantityUnit}`,
    prepared: formatDateTime(listing.preparedAt),
    deadline: formatDateTime(listing.pickupEndAt),
    status:
      statusLabels[listing.status] ||
      listing.status,
    ngo: "Not available",
  };
}


function localDateTimeToISO(value) {
  if (!value || typeof value !== "string") {
    throw new Error("Date and time are required");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date and time");
  }

  return date.toISOString();
}


const PICKUP_STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Volunteer Assigned",
  picked_up: "Picked Up",
  collected: "Collected",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

function getPickupStatusLabel(status) {
  if (!status) return "Unknown";

  return (
    PICKUP_STATUS_LABELS[status] ||
    String(status).replaceAll("_", " ")
  );
}

export default function RestaurantDashboard() {

  const router = useRouter();


  async function handlePublishDonation(event) {
    event.preventDefault();

    if (publishingDonation) return;

    setDonationFormError("");
    setDonationFormSuccess("");

    try {
      if (!profile?.id) {
        throw new Error(
          "Restaurant organization profile is missing"
        );
      }

      if (
        !profile.isVerified ||
        profile.verificationStatus !== "approved"
      ) {
        throw new Error(
          "Your restaurant must be verified before publishing food."
        );
      }

      if (!profile.location) {
        throw new Error(
          "Restaurant pickup coordinates are missing."
        );
      }

      if (!donationForm.safetyConfirmed) {
        throw new Error(
          "Please confirm the food safety declaration."
        );
      }

      const quantity = Number(donationForm.quantity);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Quantity must be a positive number."
        );
      }

      const preparedAt = localDateTimeToISO(
        donationForm.preparedAt
      );

      const pickupStartAt = localDateTimeToISO(
        donationForm.pickupStartAt
      );

      const pickupEndAt = localDateTimeToISO(
        donationForm.pickupEndAt
      );

      const expiresAt = localDateTimeToISO(
        donationForm.expiresAt
      );

      const now = Date.now();

      if (new Date(preparedAt).getTime() > now) {
        throw new Error(
          "Preparation time cannot be in the future."
        );
      }

      if (new Date(expiresAt).getTime() <= now) {
        throw new Error(
          "Food expiry must be in the future."
        );
      }

      if (
        new Date(pickupStartAt).getTime() >=
        new Date(pickupEndAt).getTime()
      ) {
        throw new Error(
          "Pickup end time must be after pickup start time."
        );
      }

      if (
        new Date(pickupEndAt).getTime() >
        new Date(expiresAt).getTime()
      ) {
        throw new Error(
          "Pickup deadline cannot exceed food expiry."
        );
      }

      const latitude = Number(profile.location.latitude);
      const longitude = Number(profile.location.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error(
          "Restaurant coordinates are invalid."
        );
      }

      const payload = {
        title: donationForm.title.trim(),
        description: donationForm.description.trim(),
        foodType: donationForm.foodType,
        quantity,
        quantityUnit: donationForm.quantityUnit,
        preparedAt,
        pickupStartAt,
        pickupEndAt,
        expiresAt,
        pickupAddress:
          donationForm.pickupAddress.trim() ||
          profile.address,
        pickupLocation: {
          latitude,
          longitude,
        },
      };

      if (!payload.title) {
        throw new Error("Food name is required.");
      }

      if (!payload.pickupAddress) {
        throw new Error("Pickup address is required.");
      }

      setPublishingDonation(true);

      const response = await api.createFoodListing(payload);

      if (!response?.success || !response?.data?.listing?.id) {
        throw new Error(
          "Food listing was not confirmed by the server."
        );
      }


      let refreshedSuccessfully = false;

      try {
        const refreshed = await api.getMyFoodListings();

        if (
          refreshed?.success &&
          Array.isArray(refreshed.data?.listings)
        ) {
          setDonationsList(refreshed.data.listings);
          setDonationsError("");
          refreshedSuccessfully = true;
        }
      } catch (refreshError) {
        console.warn(
          "Donation published, but listing refresh failed:",
          refreshError
        );
      }

      if (!refreshedSuccessfully) {
        setDonationsError(
          "Donation published successfully, but the list could not be refreshed. Reload to view the latest records."
        );
      }


      setDonationForm({
        title: "",
        description: "",
        foodType: "veg",
        quantity: "",
        quantityUnit: "meals",
        preparedAt: "",
        pickupStartAt: "",
        pickupEndAt: "",
        expiresAt: "",
        pickupAddress: "",
        safetyConfirmed: false,
      });

      setDonationFormSuccess(
        refreshedSuccessfully
          ? "Food donation published successfully."
          : "Donation published successfully. Listing refresh is temporarily unavailable."
      );

      setDonationTab("All");
      setActiveTab("donations");
    } catch (error) {
      setDonationFormError(
        error instanceof Error
          ? error.message
          : "Unable to publish donation."
      );
    } finally {
      setPublishingDonation(false);
    }
  }


  const handleLogout = () => {
    authStorage.clearToken();
    router.replace("/");
    router.refresh();
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sub-navigation states
  const [donationTab, setDonationTab] = useState('All');

  const [donationForm, setDonationForm] = useState({
    title: "",
    description: "",
    foodType: "veg",
    quantity: "",
    quantityUnit: "meals",
    preparedAt: "",
    pickupStartAt: "",
    pickupEndAt: "",
    expiresAt: "",
    pickupAddress: "",
    safetyConfirmed: false,
  });

  const [publishingDonation, setPublishingDonation] =
    useState(false);

  const [donationFormError, setDonationFormError] =
    useState("");

  const [donationFormSuccess, setDonationFormSuccess] =
    useState("");

  function updateDonationField(field, value) {
    setDonationForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const [collabTab, setCollabTab] = useState('Active');
  const [impactTab, setImpactTab] = useState('History');

  // Profile & Settings States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [editForm, setEditForm] = useState({});

  const [notifications, setNotifications] = useState({
    collabRequests: true,
    donationUpdates: true,
    pickupNotifs: true,
    confirmations: true,
    urgentAlerts: true
  });

  // Mock Data
  const [donationsList, setDonationsList] = useState([]);

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  const [donorActionId, setDonorActionId] = useState(null);
  const [donorActionError, setDonorActionError] = useState("");
  const [donorActionSuccess, setDonorActionSuccess] = useState("");

  const [rejectingRequestId, setRejectingRequestId] =
    useState(null);

  const [rejectionReason, setRejectionReason] = useState("");

  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState("");

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create', label: 'Create Donation', icon: PlusCircle },
    { id: 'donations', label: 'My Donations', icon: ListIcon },
    { id: 'collaborations', label: 'NGO Collaborations', icon: Users },
    { id: 'containers', label: 'Container Management', icon: PackageOpen },
    { id: 'impact', label: 'Rescue History & Impact', icon: BarChart3 },
    { id: 'ratings', label: 'Ratings & Feedback', icon: Star },
    { id: 'profile', label: 'Restaurant Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ---------------------------------------------------------
  // SUB-VIEWS
  // ---------------------------------------------------------

  async function refreshDonations() {
    const response = await api.getMyFoodListings();

    if (!response?.success) {
      throw new Error("Unable to retrieve donations");
    }

    const listings = response.data?.listings;

    if (!Array.isArray(listings)) {
      throw new Error("Invalid donation list response");
    }

    setDonationsList(listings);
    setDonationsError("");
    return listings;
  }

  async function refreshIncomingRequests() {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const response = await api.getIncomingPickups();

      if (!response?.success) {
        throw new Error("Unable to retrieve pickup requests");
      }

      const requests =
        response.data?.pickupRequests ??
        response.data?.requests;

      if (!Array.isArray(requests)) {
        throw new Error(
          "Unexpected pickup request response structure"
        );
      }

      setIncomingRequests(requests);
      return requests;
    } catch (error) {
      setRequestsError(
        error instanceof Error
          ? error.message
          : "Failed to load pickup requests"
      );
      throw error;
    } finally {
      setRequestsLoading(false);
    }
  }



  async function handleApprovePickup(requestId) {
    if (donorActionId) return;

    setDonorActionId(requestId);
    setDonorActionError("");
    setDonorActionSuccess("");

    let mutationSucceeded = false;

    try {
      const response = await api.approvePickup(requestId);

      if (!response?.success) {
        throw new Error("Approval was not confirmed by the server");
      }

      mutationSucceeded = true;

      setDonorActionSuccess(
        "Pickup request approved successfully."
      );
    } catch (error) {
      setDonorActionError(
        error instanceof Error
          ? error.message
          : "Unable to approve pickup request"
      );
    } finally {
      if (mutationSucceeded) {
        const refreshed = await refreshAfterMutation();

        if (!refreshed) {
          setDonorActionSuccess(
            "Pickup approved. Some dashboard data could not be refreshed."
          );
        }
      }

      setDonorActionId(null);
    }
  }



  async function handleRejectPickup(requestId) {
    if (donorActionId) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setDonorActionError("A rejection reason is required.");
      return;
    }

    setDonorActionId(requestId);
    setDonorActionError("");
    setDonorActionSuccess("");

    let mutationSucceeded = false;

    try {
      const response = await api.rejectPickup(
        requestId,
        reason
      );

      if (!response?.success) {
        throw new Error("Rejection was not confirmed by the server");
      }

      mutationSucceeded = true;

      setRejectingRequestId(null);
      setRejectionReason("");

      setDonorActionSuccess(
        "Pickup request rejected successfully."
      );
    } catch (error) {
      setDonorActionError(
        error instanceof Error
          ? error.message
          : "Unable to reject pickup request"
      );
    } finally {
      if (mutationSucceeded) {
        const refreshed = await refreshAfterMutation();

        if (!refreshed) {
          setDonorActionSuccess(
            "Pickup rejected. Some dashboard data could not be refreshed."
          );
        }
      }

      setDonorActionId(null);
    }
  }




  async function handleCancelDonation(listing) {
    if (donorActionId) return;

    // Accept either raw database status or normalized UI status.
    const status = String(listing.status || "").toLowerCase();

    if (status !== "available") {
      setDonorActionError(
        "Only available donations can be cancelled from this screen."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel "${listing.title || listing.food}"?`
    );

    if (!confirmed) return;

    setDonorActionId(listing.id);
    setDonorActionError("");
    setDonorActionSuccess("");

    let mutationSucceeded = false;

    try {
      const response = await api.cancelFoodListing(listing.id);

      if (!response?.success) {
        throw new Error(
          "Cancellation was not confirmed by the server"
        );
      }

      mutationSucceeded = true;

      setDonorActionSuccess(
        "Food donation cancelled successfully."
      );
    } catch (error) {
      setDonorActionError(
        error instanceof Error
          ? error.message
          : "Unable to cancel donation"
      );
    } finally {
      if (mutationSucceeded) {
        const refreshed = await refreshAfterMutation();

        if (!refreshed) {
          setDonorActionSuccess(
            "Donation cancelled. Some dashboard data could not be refreshed."
          );
        }
      }

      setDonorActionId(null);
    }
  }




  async function refreshDonorData() {
    const results = await Promise.allSettled([
      refreshDonations(),
      refreshIncomingRequests(),
    ]);

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    if (failed.length > 0) {
      console.error(
        "Some donor data could not be refreshed:",
        failed.map((result) => result.reason)
      );
    }

    return failed.length === 0;
  }


  async function refreshAfterMutation() {
    const results = await Promise.allSettled([
      refreshDonations(),
      refreshIncomingRequests(),
    ]);

    const failures = results.filter(
      (result) => result.status === "rejected"
    );

    if (failures.length > 0) {
      console.warn(
        "Database action succeeded, but dashboard refresh was incomplete."
      );
    }

    return failures.length === 0;
  }


  // Reconcile completed pickup requests with the listing view.
  // The listing endpoint remains the primary source; a completed request
  // supplies a display-only fallback if the two endpoints disagree.
  const completedPickupListingIds = new Set(
    incomingRequests
      .filter((request) => request.status === "completed" && request.foodListingId)
      .map((request) => request.foodListingId)
  );

  const effectiveDonations = donationsList.map((listing) => {
    if (
      completedPickupListingIds.has(listing.id) &&
      !["completed", "cancelled", "expired"].includes(listing.status)
    ) {
      return { ...listing, status: "completed", statusReconciled: true };
    }
    return listing;
  });

  const mismatchedDonations = effectiveDonations.filter(
    (listing) => listing.statusReconciled
  );

  const activeDonations = effectiveDonations.filter(
    (listing) => listing.status === "available"
  ).length;

  const completedDonations = effectiveDonations.filter(
    (listing) => listing.status === "completed"
  ).length;

  const completedMeals = effectiveDonations
    .filter(
      (listing) =>
        listing.status === "completed" &&
        listing.quantityUnit === "meals"
    )
    .reduce(
      (total, listing) => total + Number(listing.quantity || 0),
      0
    );


  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 md:pb-6">
      <section className="bg-forest rounded-3xl p-8 text-paper shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-sage-light font-bold tracking-wider text-sm mb-2 uppercase">Good Evening,</p>
          <h2 className="text-4xl font-display font-bold tracking-tight mb-2">{profile?.name || "Restaurant"}</h2>
          <p className="text-lg text-sage italic font-display">Good food deserves a second destination.</p>
        </div>
        <Leaf className="absolute -bottom-10 -right-10 w-64 h-64 text-forest-deep opacity-50 -rotate-12" />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[

          {
            label: "Total Listings",
            value: donationsList.length,
            color: "text-forest",
          },
          {
            label: "Completed Meals",
            value: completedMeals,
            color: "text-forest",
          },
          {
            label: "Completed Donations",
            value: completedDonations,
            color: "text-forest",
          },
          {
            label: "Active Donations",
            value: activeDonations,
            color: "text-terracotta-deep",
          }

        ].map((stat, i) => (
          <div key={i} className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
            <p className="text-[10px] md:text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-3xl md:text-4xl font-display font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section>
        <button onClick={() => setActiveTab('create')} className="w-full md:w-auto px-8 py-4 bg-terracotta-deep hover:bg-forest text-paper rounded-2xl font-bold font-display tracking-wide uppercase shadow-sm transition-colors flex items-center justify-center gap-3 text-lg">
          <PlusCircle className="w-6 h-6" /> List Surplus Food
        </button>
      </section>
    </div>
  );


  const renderCreateDonation = () => (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">
          Create Food Donation
        </h2>

        <p className="text-sm text-ink-muted mt-1">
          Publish surplus food to eligible nearby partner NGOs.
        </p>
      </div>

      {donationFormError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          {donationFormError}
        </div>
      )}

      {donationFormSuccess && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
        >
          {donationFormSuccess}
        </div>
      )}

      <form
        onSubmit={handlePublishDonation}
        className="space-y-8 bg-paper p-8 rounded-2xl border border-line shadow-sm"
      >
        {/* SECTION A — FOOD INFORMATION */}
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">
            A. Food Information
          </h3>

          <div>
            <label className="block text-sm font-bold text-ink-muted mb-1">
              Food Name
            </label>

            <input
              type="text"
              required
              maxLength={150}
              placeholder="e.g., Fresh Vegetarian Meals"
              value={donationForm.title}
              onChange={(event) =>
                updateDonationField("title", event.target.value)
              }
              className="w-full p-3 bg-ivory border border-line rounded-xl focus:ring-2 focus:ring-forest outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-ink-muted mb-1">
                Food Type
              </label>

              <select
                value={donationForm.foodType}
                onChange={(event) =>
                  updateDonationField(
                    "foodType",
                    event.target.value
                  )
                }
                className="w-full p-3 bg-ivory border border-line rounded-xl outline-none"
              >
                <option value="veg">Vegetarian</option>
                <option value="non_veg">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-muted mb-1">
                Quantity
              </label>

              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="e.g., 25"
                value={donationForm.quantity}
                onChange={(event) =>
                  updateDonationField(
                    "quantity",
                    event.target.value
                  )
                }
                className="w-full p-3 bg-ivory border border-line rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-ink-muted mb-1">
                Unit
              </label>

              <select
                value={donationForm.quantityUnit}
                onChange={(event) =>
                  updateDonationField(
                    "quantityUnit",
                    event.target.value
                  )
                }
                className="w-full p-3 bg-ivory border border-line rounded-xl outline-none"
              >
                <option value="meals">Meals</option>
                <option value="kg">Kilograms</option>
                <option value="portions">Portions</option>
                <option value="packets">Packets</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink-muted mb-1">
              Additional Notes
            </label>

            <textarea
              rows={3}
              placeholder="Food description, packaging, allergens, handling instructions..."
              value={donationForm.description}
              onChange={(event) =>
                updateDonationField(
                  "description",
                  event.target.value
                )
              }
              className="w-full p-3 bg-ivory border border-line rounded-xl outline-none resize-none"
            />
          </div>
        </div>

        {/* SECTION B — PREPARATION AND PICKUP TIMES */}
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">
            B. Preparation &amp; Timing
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                field: "preparedAt",
                label: "Prepared At",
              },
              {
                field: "pickupStartAt",
                label: "Pickup Start",
              },
              {
                field: "pickupEndAt",
                label: "Pickup Deadline",
              },
              {
                field: "expiresAt",
                label: "Safe Until",
              },
            ].map((item) => (
              <div key={item.field}>
                <label className="block text-sm font-bold text-ink-muted mb-1">
                  {item.label}
                </label>

                <input
                  type="datetime-local"
                  required
                  value={donationForm[item.field]}
                  onChange={(event) =>
                    updateDonationField(
                      item.field,
                      event.target.value
                    )
                  }
                  className="w-full p-3 bg-ivory border border-line rounded-xl outline-none"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-ink-muted">
            Enter your local date and time. The application
            automatically converts it to a timezone-aware
            timestamp before submission.
          </p>
        </div>

        {/* SECTION C — PICKUP LOCATION */}
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">
            C. Pickup Location
          </h3>

          <div>
            <label className="block text-sm font-bold text-ink-muted mb-1">
              Pickup Address
            </label>

            <input
              type="text"
              value={donationForm.pickupAddress}
              onChange={(event) =>
                updateDonationField(
                  "pickupAddress",
                  event.target.value
                )
              }
              placeholder={
                profile?.address || "Restaurant pickup address"
              }
              className="w-full p-3 bg-ivory border border-line rounded-xl outline-none"
            />
          </div>

          <div className="bg-sage-light/30 border border-sage-light rounded-xl p-4">
            <p className="text-sm font-bold text-forest">
              Registered Restaurant Coordinates
            </p>

            <p className="text-xs text-ink-muted mt-1">
              Latitude:{" "}
              {profile?.location?.latitude ?? "Unavailable"}
            </p>

            <p className="text-xs text-ink-muted">
              Longitude:{" "}
              {profile?.location?.longitude ?? "Unavailable"}
            </p>

            <p className="text-xs text-ink-muted mt-2">
              These coordinates are used for PostGIS food
              discovery and smart NGO matching.
            </p>
          </div>
        </div>

        {/* SECTION D — SAFETY */}
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal border-b border-line pb-2 uppercase text-sm tracking-wider">
            D. Safety &amp; Packaging
          </h3>

          <label className="flex items-start gap-3 p-4 bg-sage-light/30 border border-sage-light rounded-xl cursor-pointer">
            <input
              type="checkbox"
              required
              checked={donationForm.safetyConfirmed}
              onChange={(event) =>
                updateDonationField(
                  "safetyConfirmed",
                  event.target.checked
                )
              }
              className="mt-1 w-4 h-4 accent-forest"
            />

            <span className="text-sm text-charcoal">
              <strong>Safety Declaration:</strong> I confirm
              that this food is suitable for donation,
              has been handled appropriately, and has
              not been served to customers.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={publishingDonation}
          className="w-full py-4 bg-forest hover:bg-forest-deep text-paper font-display font-bold uppercase tracking-wider rounded-xl shadow-sm transition-colors disabled:opacity-50"
        >
          {publishingDonation
            ? "Publishing Donation..."
            : "Publish Donation"}
        </button>
      </form>
    </div>
  );


  const renderMyDonations = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            My Donations
          </h2>

          <p className="text-sm text-ink-muted mt-1">
            Manage and track your food donations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            refreshDonorData().catch((error) => {
              setDonationsError(
                error instanceof Error
                  ? error.message
                  : "Unable to refresh donations"
              );
            });
          }}
          className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-bold text-forest hover:bg-sage-light/30"
        >
          Refresh Donations
        </button>
      </div>


      {donorActionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {donorActionError}
        </p>
      )}

      {donorActionSuccess && (
        <p
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {donorActionSuccess}
        </p>
      )}



      <div className="flex flex-wrap gap-2 mb-6">
        {[
          "All",
          "Available",
          "Reserved",
          "Picked Up",
          "Completed",
          "Cancelled",
          "Expired",
        ].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setDonationTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${donationTab === tab
              ? "bg-forest text-paper shadow-sm"
              : "bg-ivory border border-line text-ink-muted hover:text-charcoal"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>


      {donationsError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {donationsError}
        </p>
      )}
      {mismatchedDonations.length > 0 && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {mismatchedDonations.length} donation status(es) are displayed as completed based on completed NGO pickups, but the food-listings API returned an older status. Please verify backend consistency.
        </p>
      )}
      <div className="space-y-4">
        {effectiveDonations
          .map(normalizeDonation)
          .filter(
            (don) =>
              donationTab === "All" ||
              don.status === donationTab
          )
          .map((don) => (
            <div key={don.id} className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-display font-bold text-lg text-charcoal uppercase">Food: {don.food}</h4>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                  ${don.status === 'Completed' ? 'bg-st-fresh-bg text-st-fresh-fg' :
                      don.status === 'Awaiting Pickup' ? 'bg-st-soon-bg text-st-soon-fg' :
                        'bg-ivory border border-line text-ink-muted'}`}
                  >
                    Status: {don.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div><p className="text-ink-muted text-xs font-bold">Quantity</p><p className="font-medium text-charcoal">{don.qty}</p></div>
                  <div><p className="text-ink-muted text-xs font-bold">Prepared</p><p className="font-medium text-charcoal">{don.prepared}</p></div>
                  <div><p className="text-ink-muted text-xs font-bold">Deadline</p><p className="font-medium text-charcoal flex items-center gap-1"><Clock className="w-3 h-3 text-terracotta-deep" /> {don.deadline}</p></div>
                  <div><p className="text-ink-muted text-xs font-bold">Assigned NGO</p><p className="font-medium text-forest">{don.ngo}</p></div>
                </div>
              </div>

              <div className="bg-ivory px-6 py-3 border-t border-line">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-muted">
                    Listing ID: {don.id.slice(0, 8)}
                  </span>

                  {don.status === "Available" && (
                    <button
                      type="button"
                      disabled={Boolean(donorActionId)}
                      onClick={() => handleCancelDonation(don)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {donorActionId === don.id
                        ? "Cancelling..."
                        : "Cancel Donation"}
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
      </div>
    </div>
  );


  const renderCollaborations = () => {
    const pendingRequests = incomingRequests.filter(
      (request) => request.status === "pending"
    );

    const historyRequests = incomingRequests.filter(
      (request) => request.status !== "pending"
    );

    const visibleRequests =
      collabTab === "Incoming Requests"
        ? pendingRequests
        : historyRequests;

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">
              NGO Pickup Requests
            </h2>

            <p className="text-sm text-ink-muted mt-1">
              Review requests submitted for your food donations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              refreshIncomingRequests().catch(() => { });
            }}
            disabled={requestsLoading}
            className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-bold text-forest disabled:opacity-50"
          >
            {requestsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex bg-line/30 p-1 rounded-xl max-w-md">
          {["Incoming Requests", "History"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCollabTab(tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase ${collabTab === tab
                ? "bg-paper shadow-sm text-forest"
                : "text-ink-muted hover:text-charcoal"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {donorActionError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {donorActionError}
          </p>
        )}

        {donorActionSuccess && (
          <p
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {donorActionSuccess}
          </p>
        )}

        {requestsError && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {requestsError}
          </p>
        )}

        {requestsLoading && incomingRequests.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-10 text-center text-ink-muted">
            Loading NGO pickup requests...
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-ink-muted">
            {collabTab === "Incoming Requests"
              ? "No pending NGO pickup requests."
              : "No previous pickup decisions found."}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => {
              const ngoName =
                request.ngoName ||
                request.ngoOrganizationName ||
                request.ngoOrganization?.name ||
                "NGO";

              const foodTitle =
                request.foodTitle ||
                request.foodListingTitle ||
                request.foodListing?.title ||
                "Food donation";

              const isPending = request.status === "pending";
              const isProcessing =
                donorActionId === request.id;

              return (
                <div
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold uppercase text-charcoal">
                          {ngoName}
                        </h3>

                        <p className="mt-1 text-sm text-ink-muted">
                          Request for: {foodTitle}
                        </p>
                      </div>

                      <span className="rounded-full border border-line bg-ivory px-3 py-1 text-xs font-bold uppercase text-charcoal">
                        {getPickupStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold text-ink-muted">
                          Requested Quantity
                        </p>

                        <p className="font-medium text-charcoal">
                          {request.requestedQuantity ??
                            request.foodListing?.quantity ??
                            "Full listing"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-ink-muted">
                          Request ID
                        </p>

                        <p className="break-all font-medium text-charcoal">
                          {request.id}
                        </p>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="rounded-xl bg-ivory p-4">
                        <p className="mb-1 text-xs font-bold text-ink-muted">
                          NGO Notes
                        </p>

                        <p className="text-sm text-charcoal">
                          {request.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <div className="space-y-3 border-t border-line bg-ivory p-4">
                      {rejectingRequestId === request.id && (
                        <div className="space-y-2">
                          <label
                            htmlFor={`reason-${request.id}`}
                            className="block text-xs font-bold text-charcoal"
                          >
                            Reason for rejection
                          </label>

                          <textarea
                            id={`reason-${request.id}`}
                            rows={3}
                            value={rejectionReason}
                            onChange={(event) =>
                              setRejectionReason(event.target.value)
                            }
                            placeholder="Explain why the pickup request cannot be accepted."
                            className="w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:border-forest"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={Boolean(donorActionId)}
                          onClick={() =>
                            handleApprovePickup(request.id)
                          }
                          className="flex-1 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper hover:bg-forest-deep disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Processing..."
                            : "Approve Pickup"}
                        </button>

                        {rejectingRequestId !== request.id ? (
                          <button
                            type="button"
                            disabled={Boolean(donorActionId)}
                            onClick={() => {
                              setRejectingRequestId(request.id);
                              setRejectionReason("");
                              setDonorActionError("");
                            }}
                            className="flex-1 rounded-xl border border-red-200 bg-paper px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={Boolean(donorActionId)}
                              onClick={() =>
                                handleRejectPickup(request.id)
                              }
                              className="flex-1 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              Confirm Rejection
                            </button>

                            <button
                              type="button"
                              disabled={Boolean(donorActionId)}
                              onClick={() => {
                                setRejectingRequestId(null);
                                setRejectionReason("");
                              }}
                              className="rounded-xl border border-line bg-paper px-4 py-3 text-sm font-bold"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };


  const renderContainers = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Container Management</h2>
        <p className="text-sm text-ink-muted mt-1">Monitor partner NGO container inventory stored at your location.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">Total</p>
          <p className="text-3xl font-display font-bold text-forest">100</p>
        </div>
        <div className="bg-st-fresh-bg p-6 rounded-2xl border border-st-fresh-fg/20 shadow-sm text-center">
          <p className="text-xs font-bold text-st-fresh-fg uppercase tracking-wider mb-1">Available</p>
          <p className="text-3xl font-display font-bold text-forest">60</p>
        </div>
        <div className="bg-st-soon-bg p-6 rounded-2xl border border-st-soon-fg/20 shadow-sm text-center">
          <p className="text-xs font-bold text-st-soon-fg uppercase tracking-wider mb-1">In Circulation</p>
          <p className="text-3xl font-display font-bold text-terracotta-deep">40</p>
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-line bg-ivory"><h4 className="font-bold text-charcoal uppercase tracking-wider text-xs">Partner Container Inventory</h4></div>
        <div className="p-6">
          <h4 className="font-display font-bold text-lg text-charcoal mb-4 uppercase">XYZ Foundation</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div><p className="text-ink-muted text-xs font-bold">Assigned</p><p className="font-medium text-charcoal">50</p></div>
            <div><p className="text-ink-muted text-xs font-bold">Clean/Available</p><p className="font-medium text-forest">30</p></div>
            <div><p className="text-ink-muted text-xs font-bold">In Circulation</p><p className="font-medium text-terracotta-deep">20</p></div>
            <div><p className="text-ink-muted text-xs font-bold">Return Schedule</p><p className="font-medium text-charcoal">31 October</p></div>
          </div>
          <button className="py-2 px-4 bg-ivory text-forest font-bold text-sm border border-line rounded-lg hover:bg-sage-light">View Details</button>
        </div>
      </div>
    </div>
  );

  const renderImpact = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Rescue History & Impact</h2>
        <p className="text-sm text-ink-muted mt-1">Track your contribution to food rescue.</p>
      </div>

      <div className="flex bg-line/30 p-1 rounded-xl mb-6 max-w-xs">
        {['History', 'Dashboard'].map(tab => (
          <button key={tab} onClick={() => setImpactTab(tab)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${impactTab === tab ? 'bg-paper shadow-sm text-forest' : 'text-ink-muted hover:text-charcoal'}`}>
            {tab}
          </button>
        ))}
      </div>

      {impactTab === 'History' ? (
        <div className="space-y-4">
          <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider">Recent Completed Donations</h3>
          <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden divide-y divide-line">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 flex justify-between items-center hover:bg-ivory transition-colors">
                <div>
                  <h4 className="font-bold text-charcoal">Vegetable Biryani ({50 * i} meals)</h4>
                  <p className="text-xs text-ink-muted mt-1">Oct {30 - i} • NGO: Hope Foundation</p>
                </div>
                <span className="flex items-center gap-1 text-st-fresh-fg text-xs font-bold bg-st-fresh-bg px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Completed</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-forest p-8 rounded-3xl text-paper space-y-6">
            <h3 className="font-display font-bold text-sage-light text-lg">Overall Impact</h3>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Meals Rescued</p><p className="text-5xl font-display font-bold">1,240</p></div>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Food Collected (kg)</p><p className="text-3xl font-display font-bold">620</p></div>
            <div><p className="text-sm font-bold text-sage mb-1 uppercase">Successful Rescues</p><p className="text-3xl font-display font-bold">86</p></div>
          </div>
          <div className="bg-paper p-6 rounded-3xl border border-line shadow-sm flex flex-col justify-center">
            <h3 className="font-display font-bold text-charcoal text-lg mb-4">Estimated Environmental Impact</h3>
            <div className="bg-sage-light p-6 rounded-2xl text-center">
              <Leaf className="w-8 h-8 text-forest mx-auto mb-2" />
              <p className="text-sm font-bold text-forest uppercase mb-1">CO₂e Avoided</p>
              <p className="text-4xl font-display font-bold text-forest">1,550 kg</p>
              <p className="text-[10px] text-forest/70 mt-2">*Estimates based on standard food waste emissions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderRatings = () => (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      <div className="border-b border-line pb-4">
        <h2 className="text-2xl font-display font-bold text-forest uppercase">Ratings & Feedback</h2>
        <p className="text-sm text-ink-muted mt-1">Understand your donation performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-forest p-8 rounded-3xl text-paper text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-sage-light uppercase tracking-wider mb-2">Donor Reliability</p>
          <p className="text-6xl font-display font-bold mb-2">96<span className="text-2xl text-sage">/100</span></p>
          <span className="px-3 py-1 bg-sage/30 text-paper text-[10px] font-bold uppercase rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified Donor</span>
        </div>
        <div className="md:col-span-2 bg-paper p-6 rounded-3xl border border-line shadow-sm">
          <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2 mb-4">Performance Indicators</h4>
          <div className="space-y-4">
            {[
              { label: 'Listing Accuracy', val: '98%' },
              { label: 'Food Readiness at Pickup', val: '95%' },
              { label: 'Successful Handovers', val: '99%' },
              { label: 'Cancellation Rate', val: '2%' }
            ].map((ind, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-charcoal font-bold">{ind.label}</span>
                <span className="text-sm font-display font-bold text-forest">{ind.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden mt-6">
        <div className="p-6 border-b border-line bg-ivory"><h4 className="font-bold text-charcoal uppercase tracking-wider text-xs">NGO Feedback</h4></div>
        <div className="p-6 space-y-4">
          <div className="border-b border-line pb-4 last:border-0 last:pb-0">
            <div className="flex justify-between items-start mb-2">
              <h5 className="font-bold text-charcoal uppercase">XYZ Foundation</h5>
              <div className="flex text-gold"><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /></div>
            </div>
            <p className="text-sm text-ink-muted italic">
              &quot;Food is always packed perfectly in the containers and
              ready right on time. Great partner!&quot;
            </p>
            <p className="text-[10px] text-ink-muted font-bold mt-2 uppercase">Oct 28 • Vegetable Biryani</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (isEditingProfile) {
      return (
        <form onSubmit={(e) => { e.preventDefault(); setProfile(editForm); setIsEditingProfile(false); }} className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
          <div className="flex justify-between items-center border-b border-line pb-4">
            <h2 className="text-2xl font-display font-bold text-forest uppercase">Edit Profile</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditForm(profile); setIsEditingProfile(false); }} className="px-4 py-2 bg-ivory text-charcoal border border-line rounded-xl font-bold text-sm flex items-center gap-2"><X className="w-4 h-4" /> Cancel</button>
              <button type="submit" className="px-4 py-2 bg-forest text-paper rounded-xl font-bold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Business Information</h3>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Restaurant Name</label><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Description</label><textarea rows="3" value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest resize-none"></textarea></div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-ink-muted mb-1">Contact Person</label><input type="text" value={editForm.contactName} onChange={e => setEditForm({ ...editForm, contactName: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
              <div><label className="block text-xs font-bold text-ink-muted mb-1">Phone</label><input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h3 className="font-bold text-charcoal uppercase text-xs tracking-wider border-b border-line pb-2">Location & Operations</h3>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Full Address</label><input type="text" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
            <div><label className="block text-xs font-bold text-ink-muted mb-1">Operating Hours</label><input type="text" value={editForm.hours} onChange={e => setEditForm({ ...editForm, hours: e.target.value })} className="w-full p-2.5 bg-ivory border border-line rounded-lg text-sm outline-none focus:border-forest" /></div>
          </div>
        </form>
      );
    }
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex justify-between items-end border-b border-line pb-4">
          <div><h2 className="text-2xl font-display font-bold text-forest uppercase">Restaurant Profile</h2></div>
          <button onClick={() => { setEditForm(profile); setIsEditingProfile(true); }} className="px-4 py-2 bg-sage-light text-forest rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-sage transition-colors"><Edit3 className="w-4 h-4" /> Edit</button>
        </div>
        <div className="bg-paper p-8 rounded-2xl border border-line shadow-sm flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-forest text-paper flex items-center justify-center font-display font-bold text-2xl shrink-0">DB</div>
          <div>
            <div className="flex items-center gap-3 mb-1"><h3 className="text-2xl font-display font-bold text-charcoal uppercase">{profile?.name || "Restaurant"}</h3><span className="px-2 py-1 bg-st-fresh-bg text-st-fresh-fg text-[10px] font-bold uppercase rounded-md flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {profile.status}</span></div>
            <p className="text-sm font-bold text-forest mb-2">{profile.type}</p>
            <p className="text-sm text-ink-muted">{profile.desc}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Contact Information</h4>
            <div className="space-y-3 text-sm">
              <div><p className="text-ink-muted text-xs">Contact Person</p><p className="font-bold text-charcoal">{profile.contactName}</p></div>
              <div><p className="text-ink-muted text-xs">Email Address</p><p className="font-bold text-charcoal">{profile.email}</p></div>
              <div><p className="text-ink-muted text-xs">Phone Number</p><p className="font-bold text-charcoal">{profile.phone}</p></div>
            </div>
          </div>
          <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
            <h4 className="font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2">Location & Operations</h4>
            <div className="space-y-3 text-sm">
              <div><p className="text-ink-muted text-xs">Address</p><p className="font-bold text-charcoal">{profile.address}</p></div>
              <div><p className="text-ink-muted text-xs">City</p><p className="font-bold text-charcoal">{profile.city}</p></div>
              <div><p className="text-ink-muted text-xs">Operating Hours</p><p className="font-bold text-charcoal">{profile.hours}</p></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const toggleNotif = (key) => setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="border-b border-line pb-4"><h2 className="text-2xl font-display font-bold text-forest uppercase">Settings</h2></div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Globe className="w-4 h-4 text-forest" /> Account Preferences</div>
              <div className="flex justify-between items-center text-sm font-bold text-charcoal">Language<select className="bg-ivory border border-line rounded-lg px-3 py-1.5 outline-none"><option>English</option></select></div>
            </div>
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Shield className="w-4 h-4 text-forest" /> Security</div>
              <button className="w-full text-left flex justify-between items-center py-2 text-sm font-bold text-charcoal hover:text-forest transition-colors">Change Password <ChevronRight className="w-4 h-4 text-ink-muted" /></button>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-charcoal uppercase tracking-wider text-xs border-b border-line pb-2"><Bell className="w-4 h-4 text-forest" /> Notification Preferences</div>
              {[
                { key: 'collabRequests', label: 'NGO Collaboration Requests' },
                { key: 'donationUpdates', label: 'Donation Updates' },
                { key: 'pickupNotifs', label: 'Pickup Notifications' },
                { key: 'confirmations', label: 'Collection Confirmations' },
                { key: 'urgentAlerts', label: 'Urgent Deadline Alerts' }
              ].map(item => (
                <div key={item.key} className="flex justify-between items-center py-1">
                  <span className="text-sm text-charcoal font-bold">{item.label}</span>
                  <button onClick={() => toggleNotif(item.key)} className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-forest' : 'bg-line'}`}>
                    <div className={`w-4 h-4 rounded-full bg-paper absolute top-1 transition-transform ${notifications[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-st-error-bg/30 p-6 rounded-2xl border border-st-error-bg shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-bold text-st-error-fg uppercase tracking-wider text-xs border-b border-st-error-bg/50 pb-2">
                Account Management
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 text-sm font-bold text-charcoal hover:text-st-error-fg transition-colors py-1"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };


  useEffect(() => {
    let active = true;

    async function loadRestaurantData() {
      const [organizationResult, foodResult] =
        await Promise.allSettled([
          api.getMyOrganization(),
          api.getMyFoodListings(),
        ]);

      if (!active) return;

      if (
        organizationResult.status === "fulfilled" &&
        organizationResult.value?.success
      ) {
        const organization =
          organizationResult.value.data?.organization;

        if (organization) {
          const normalized = {
            ...organization,
            type: organization.organizationType,
            status:
              organization.isVerified &&
                organization.verificationStatus === "approved"
                ? "Verified Donor"
                : organization.verificationStatus || "Pending",
            desc: organization.description || "",
            phone: organization.contactPhone || "",
            city: "",
            hours: "",
            contactName: "",
            email: "",
          };

          setProfile(normalized);
          setEditForm(normalized);
          setProfileError("");
        } else {
          setProfileError("Organization profile not found");
        }
      } else {
        setProfileError(
          organizationResult.status === "rejected"
            ? organizationResult.reason?.message ||
            "Unable to load restaurant profile"
            : "Unable to load restaurant profile"
        );
      }

      if (
        foodResult.status === "fulfilled" &&
        foodResult.value?.success
      ) {
        setDonationsList(
          foodResult.value.data?.listings || []
        );
        setDonationsError("");
      } else {
        setDonationsError(
          foodResult.status === "rejected"
            ? foodResult.reason?.message ||
            "Unable to load food listings"
            : "Unable to load food listings"
        );
      }

      setProfileLoading(false);
      setDonationsLoading(false);
    }

    loadRestaurantData();
    // Fetch pickup statuses on initial load and when the user returns to the tab.
    Promise.resolve().then(() => {
      if (active) refreshIncomingRequests().catch(() => {});
    });
    const onFocus = () => {
      if (active) refreshDonorData().catch(() => {});
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      active = false;
    };
  }, []);



  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <p className="text-lg font-bold text-forest">
          Loading restaurant dashboard...
        </p>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-6 text-center">
        <h2 className="text-xl font-bold text-forest">
          Restaurant Profile Unavailable
        </h2>

        <p className="mt-3 text-sm text-ink-muted">
          {profileError || "No restaurant organization found."}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-forest px-5 py-3 text-paper font-bold"
        >
          Retry
        </button>
      </div>
    );
  }



  // ---------------------------------------------------------
  // MAIN RENDER (Mobile-First Layout)
  // ---------------------------------------------------------
  return (
    <div className="h-screen bg-ivory flex flex-col md:flex-row text-charcoal font-body overflow-hidden">

      {/* Mobile Header */}
      <header className="md:hidden bg-paper border-b border-line px-4 py-3 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -ml-2 text-forest"><Menu className="w-6 h-6" /></button>
          <Leaf className="w-6 h-6 text-forest" />
          <h1 className="text-lg font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-paper border-r border-line transform transition-transform duration-300 ease-in-out flex flex-col md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-line shrink-0">
          <Leaf className="w-8 h-8 text-forest" />
          <h1 className="text-xl font-display font-bold text-forest tracking-tight">ZeroWaste</h1>
        </div>
        <div className="md:hidden p-4 flex justify-end border-b border-line shrink-0">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-ink-muted p-2"><XCircle className="w-6 h-6" /></button>
        </div>
        <div className="px-6 py-4 text-[10px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Food Provider Portal</div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
          {sidebarItems.map((item) => (
            <button
              key={item.id}


              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);

                if (item.id === "donations") {
                  refreshDonorData().catch((error) => {
                    console.error("Failed to refresh donations:", error);
                    setDonationsError(
                      error instanceof Error
                        ? error.message
                        : "Unable to refresh donations"
                    );
                  });
                }

                if (item.id === "collaborations" || item.id === "dashboard") {
                  refreshDonorData().catch(() => {});
                }
              }}


              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-sage-light text-forest shadow-sm' : 'text-ink-muted hover:bg-ivory hover:text-forest'}`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-forest' : 'text-ink-muted shrink-0'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-ivory p-4 md:p-10 relative">
        <div className="hidden md:flex justify-end items-center mb-8 gap-6">
          <button className="relative p-2 text-ink-muted hover:text-forest transition-colors">
            <Bell className="w-6 h-6" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-terracotta-deep rounded-full border-2 border-ivory"></span>
          </button>
          <div className="flex items-center gap-3 pl-6 border-l border-line cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setActiveTab('profile')}>
            <div className="text-right hidden sm:block">

              <p className="text-sm font-bold text-forest leading-tight">
                {profile?.name || "Restaurant"}
              </p>

              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">
                {profile?.type || "Food Provider"}
              </p>

            </div>
            <div className="w-10 h-10 bg-forest text-paper rounded-full flex items-center justify-center font-display font-bold">DB</div>
          </div>
        </div>

        {/* Tab Routing */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'create' && renderCreateDonation()}
        {activeTab === 'donations' && renderMyDonations()}
        {activeTab === 'collaborations' && renderCollaborations()}
        {activeTab === 'containers' && renderContainers()}
        {activeTab === 'impact' && renderImpact()}
        {activeTab === 'ratings' && renderRatings()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-paper border-t border-line pb-safe flex justify-around p-3 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'create', icon: PlusCircle, label: 'Donate' },
          { id: 'donations', icon: ListIcon, label: 'Manage' },
        ].map(item => (
          <button key={item.id} onClick={() => {
          setActiveTab(item.id);
          if (item.id === "donations" || item.id === "dashboard") {
            refreshDonorData().catch(() => {});
          }
        }} className={`flex flex-col items-center gap-1 p-2 min-w-[64px] ${activeTab === item.id ? 'text-forest' : 'text-ink-muted'}`}>
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}