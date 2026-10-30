
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Truck,
  Users,
  PackageOpen,
  BarChart3,
  User as UserIcon,
  Settings,
  Bell,
  Leaf,
  Clock,
  MapPin,
  ArrowRight,
  Edit3,
  Save,
  X,
  Globe,
  Shield,
  LogOut,
  Zap,
} from "lucide-react";

import { api, authStorage } from "../../lib/api/client";
import { getVolunteerDirectory } from "../../lib/api/volunteer-directory";

const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "requests", label: "Food Requests", icon: Search },
  { id: "collaborations", label: "Collaborations", icon: Users },
  { id: "volunteers", label: "Volunteers", icon: Truck },
  { id: "containers", label: "Containers", icon: PackageOpen },
  { id: "impact", label: "History & Impact", icon: BarChart3 },
  { id: "profile", label: "NGO Profile", icon: UserIcon },
  { id: "settings", label: "Settings", icon: Settings },
];

function normalizeOrganization(response) {
  const organization =
    response?.data?.organization ?? response?.data;

  if (!organization || !organization.id) {
    return null;
  }

  return {
    ...organization,
    name: organization.name || "NGO",
    type: organization.organizationType || "ngo",
    status:
      organization.verificationStatus ||
      organization.verification_status ||
      "pending",
    description: organization.description || "",
    phone: organization.contactPhone || "",
    address: organization.address || "",
  };
}

function formatDeadline(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString();
}

function getDirectionsUrl(location) {
  if (!location) return null;

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const destination = encodeURIComponent(
    `${latitude},${longitude}`
  );

  return (
    "https://www.google.com/maps/dir/" +
    `?api=1&destination=${destination}&travelmode=driving`
  );
}

export default function NgoDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");

  const [loading, setLoading] = useState(true);
  const [foodError, setFoodError] = useState("");
  const [foodListings, setFoodListings] = useState([]);

  const [discoveryMode, setDiscoveryMode] =
    useState("recommended");

  const [radiusKm, setRadiusKm] = useState(10);
  const [foodType, setFoodType] = useState("");

  const [pickupStatus, setPickupStatus] = useState({});

  const [selectedOffer, setSelectedOffer] = useState(null);


  const [myPickupRequests, setMyPickupRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");


  const [assigningRequestId, setAssigningRequestId] = useState(null);
  const [volunteerUserId, setVolunteerUserId] = useState("");
  const [volunteerDirectory, setVolunteerDirectory] = useState([]);
  const [volunteerSearch, setVolunteerSearch] = useState("");
  const [volunteersLoading, setVolunteersLoading] = useState(false);
  const [volunteersError, setVolunteersError] = useState("");
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");
  const assignmentInFlight = useRef(false);



  const [isEditingProfile, setIsEditingProfile] =
    useState(false);

  const [editForm, setEditForm] = useState({});

  const [notifications, setNotifications] = useState({
    newOffers: true,
    urgent: true,
    volunteer: true,
    collaborations: true,
  });

  const fetchFoodData = useCallback(async () => {
    try {
      let response;

      if (discoveryMode === "recommended") {
        response = await api.getMatchingFood({
          radiusKm,
          ...(foodType ? { foodType } : {}),
        });
      } else {
        response = await api.getNearbyFood(radiusKm);
      }

      if (!response?.success) {
        throw new Error("Unable to retrieve food listings");
      }

      setFoodListings(response.data?.listings ?? []);
      setFoodError("");
    } catch (error) {
      setFoodListings([]);
      setFoodError(
        error instanceof Error
          ? error.message
          : "Failed to load available food"
      );
    } finally {
      setLoading(false);
    }
  }, [discoveryMode, radiusKm, foodType]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await api.getMyOrganization();

        if (!active) return;

        const organization = normalizeOrganization(response);

        setProfile(organization);
        setEditForm(organization || {});

        if (!organization) {
          setProfileError(
            "No NGO organization profile found. Complete onboarding."
          );
        }
      } catch (error) {
        if (!active) return;

        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to load organization profile"
        );
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadMyPickupRequests().catch(() => {});
    });
    return () => { active = false; };
    // Initial history load only; subsequent refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        fetchFoodData();
      }
    });

    return () => {
      active = false;
    };
  }, [fetchFoodData]);


  async function loadVolunteerDirectory() {
    setVolunteersLoading(true);
    setVolunteersError("");
    try {
      const response = await getVolunteerDirectory();
      if (!response?.success || !Array.isArray(response?.data?.volunteers)) {
        throw new Error("Invalid volunteer directory response");
      }
      setVolunteerDirectory(response.data.volunteers);
    } catch (error) {
      setVolunteerDirectory([]);
      setVolunteersError(error instanceof Error ? error.message : "Unable to load volunteers");
    } finally {
      setVolunteersLoading(false);
    }
  }

  async function handleAssignVolunteer(requestId) {
    if (assignmentInFlight.current) return;

    const volunteerId = volunteerUserId.trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(volunteerId) || !volunteerDirectory.some((v) => v.id === volunteerId && v.canAssign)) {
      setAssignmentError("Select an available volunteer from the directory.");
      return;
    }

    assignmentInFlight.current = true;
    setAssignmentLoading(true);
    setAssignmentError("");
    setAssignmentSuccess("");

    let assigned = false;

    try {
      const response = await api.assignVolunteer(
        requestId,
        volunteerId
      );

      if (!response?.success) {
        throw new Error("Volunteer assignment failed");
      }

      assigned = true;

      setAssignmentSuccess(
        "Volunteer assigned successfully."
      );

      setAssigningRequestId(null);
      setVolunteerUserId("");
      void loadVolunteerDirectory();
    } catch (error) {
      setAssignmentError(
        error instanceof Error
          ? error.message
          : "Unable to assign volunteer"
      );
    } finally {
      assignmentInFlight.current = false;
      setAssignmentLoading(false);
    }

    if (assigned) {
      try {
        await loadMyPickupRequests();
      } catch {
        setAssignmentSuccess(
          "Volunteer assigned successfully, but request history could not be refreshed."
        );
      }
    }
  }


  async function loadMyPickupRequests() {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const response = await api.getMyPickupRequests();

      if (!response?.success) {
        throw new Error("Unable to retrieve pickup requests");
      }

      const requests = response.data?.requests;

      if (!Array.isArray(requests)) {
        throw new Error(
          "Invalid pickup request response structure"
        );
      }

      setMyPickupRequests(requests);
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


  async function handleRequestPickup(foodListingId) {
    setPickupStatus((previous) => ({
      ...previous,
      [foodListingId]: "loading",
    }));

    try {
      const response = await api.createPickupRequest(
        foodListingId,
        "Available to collect the complete food listing."
      );

      if (!response?.success) {
        throw new Error("Pickup request failed");
      }

      setPickupStatus((previous) => ({
        ...previous,
        [foodListingId]: "success",
      }));


      setSelectedOffer(null);

      const refreshResults = await Promise.allSettled([
        fetchFoodData(),
        loadMyPickupRequests(),
      ]);

      for (const result of refreshResults) {
        if (result.status === "rejected") {
          console.warn(
            "Pickup created, but a dashboard refresh failed:",
            result.reason
          );
        }
      }

    } catch (error) {
      console.error("Pickup request failed:", error);

      setPickupStatus((previous) => ({
        ...previous,
        [foodListingId]: "error",
      }));
    }
  }

  function handleProfileSave(event) {
    event.preventDefault();

    // Profile editing will be connected to the
    // organization update API in the onboarding step.
    setIsEditingProfile(false);
  }

  function handleLogout() {
    authStorage.clearToken();
    router.replace("/");
    router.refresh();
  }

  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto space-y-10">
      <section className="text-center space-y-6">
        <div>
          <h2 className="text-4xl font-display font-bold text-forest uppercase tracking-tight">
            Welcome Back, {profile?.name || "Partner"}
          </h2>

          <p className="text-lg text-ink-muted mt-2 font-display italic">
            Every meal deserves a purpose.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm font-bold text-terracotta-deep uppercase tracking-widest pt-4">
          <div className="h-px bg-line flex-1 max-w-[100px]" />
          <span>Rescue Food ✱ Reduce Waste</span>
          <div className="h-px bg-line flex-1 max-w-[100px]" />
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pickup Requests", value: myPickupRequests.length },
          { label: "Completed Requests", value: myPickupRequests.filter((r) => r.status === "completed").length },
          { label: "Available", value: foodListings.length },
          { label: "Collections Today", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-paper p-6 rounded-2xl border border-line shadow-sm text-center"
          >
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
              {stat.label}
            </p>

            <p className="text-4xl font-display font-bold text-forest">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className="rounded-xl bg-forest px-6 py-3 text-paper font-bold hover:bg-forest-deep"
        >
          Discover Available Food
        </button>
      </div>
    </div>
  );

  const renderFoodRequests = () => (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            Food Requests Flow
          </h2>

          <p className="text-sm text-ink-muted mt-1">
            Discover and request available surplus food.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-ivory border border-line rounded-lg px-3 py-2">
            <span className="text-xs font-bold">Radius</span>

            <select
              value={radiusKm}
              onChange={(event) => {
                setLoading(true);
                setRadiusKm(Number(event.target.value));
              }}
              className="bg-transparent text-sm outline-none"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
              <option value={50}>50 km</option>
            </select>
          </label>

          <label className="flex items-center gap-2 bg-ivory border border-line rounded-lg px-3 py-2">
            <span className="text-xs font-bold">Food Type</span>

            <select
              value={foodType}
              onChange={(event) => {
                setLoading(true);
                setFoodType(event.target.value);
              }}
              className="bg-transparent text-sm outline-none"
            >
              <option value="">All</option>
              <option value="veg">Vegetarian</option>
              <option value="non_veg">Non-Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex bg-line/30 p-1 rounded-xl max-w-sm">
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setDiscoveryMode("recommended");
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 ${discoveryMode === "recommended"
            ? "bg-paper shadow-sm text-forest"
            : "text-ink-muted"
            }`}
        >
          <Zap className="w-4 h-4" />
          Smart Match
        </button>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setDiscoveryMode("nearby");
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase flex items-center justify-center gap-2 ${discoveryMode === "nearby"
            ? "bg-paper shadow-sm text-forest"
            : "text-ink-muted"
            }`}
        >
          <MapPin className="w-4 h-4" />
          Nearby
        </button>
      </div>

      {foodError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {foodError}

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchFoodData();
            }}
            className="ml-3 font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="md:col-span-2 py-12 text-center text-ink-muted font-bold animate-pulse">
            Analyzing available food...
          </div>
        ) : foodListings.length === 0 ? (
          <div className="md:col-span-2 py-12 text-center text-ink-muted border border-dashed border-line rounded-2xl">
            No available food listings found in this area.
          </div>
        ) : (
          foodListings.map((food) => {
            const directionsUrl = getDirectionsUrl(
              food.pickupLocation
            );

            const requestState = pickupStatus[food.id];

            return (
              <div
                key={food.id}
                className="bg-paper rounded-2xl shadow-sm border border-line overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-display font-bold text-charcoal pr-4">
                      {food.title}
                    </h4>

                    {discoveryMode === "recommended" &&
                      typeof food.matchScore === "number" && (
                        <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full border border-line bg-ivory">
                          {food.matchScore}% Match
                        </span>
                      )}
                  </div>

                  <div className="space-y-3 text-sm text-ink-muted">
                    <p className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-sage" />
                      <span className="font-bold text-charcoal">
                        {food.donorName || "Food Provider"}
                      </span>
                    </p>

                    <p className="flex items-center gap-2">
                      <PackageOpen className="w-4 h-4 text-sage" />
                      {food.quantity} {food.quantityUnit}
                    </p>

                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sage" />
                      {food.distanceKm != null
                        ? `${food.distanceKm} km away`
                        : "Distance unavailable"}
                    </p>

                    {food.estimatedTravelMinutes != null && (
                      <p className="text-xs">
                        Estimated travel:{" "}
                        {food.estimatedTravelMinutes} minutes
                        (approximate)
                      </p>
                    )}

                    <p className="flex items-center gap-2 text-terracotta-deep font-bold">
                      <Clock className="w-4 h-4" />
                      Pickup deadline:{" "}
                      {formatDeadline(
                        food.pickupEndAt || food.expiresAt
                      )}
                    </p>
                  </div>

                  {directionsUrl && (
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-5 text-sm font-bold text-forest hover:underline"
                    >
                      <MapPin className="w-4 h-4" />
                      Open in Google Maps
                    </a>
                  )}
                </div>

                <div className="bg-ivory p-4 border-t border-line">
                  {requestState === "success" ? (
                    <p className="text-center text-sm font-bold text-forest">
                      Pickup request submitted successfully.
                    </p>
                  ) : requestState === "error" ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-700 text-center">
                        Unable to submit pickup request.
                      </p>

                      <button
                        type="button"
                        onClick={() => setSelectedOffer(food.id)}
                        className="w-full rounded-xl bg-forest p-3 text-paper font-bold"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : selectedOffer !== food.id ? (
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(food.id)}
                      className="w-full py-3 rounded-xl font-bold text-sm bg-forest hover:bg-forest-deep text-paper flex items-center justify-center gap-2"
                    >
                      View Details &amp; Request
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-forest uppercase text-center">
                        Confirm Pickup Request
                      </p>

                      <p className="text-xs text-ink-muted">
                        You are requesting the entire available
                        listing. Volunteer assignment happens
                        after donor approval.
                      </p>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOffer(null)}
                          className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-paper border border-line"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={requestState === "loading"}
                          onClick={() => handleRequestPickup(food.id)}
                          className="flex-1 py-2.5 rounded-lg font-bold text-sm bg-terracotta-deep text-paper disabled:opacity-50"
                        >
                          {requestState === "loading"
                            ? "Submitting..."
                            : "Request Pickup"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );


  const renderPickupHistory = () => {
    const filteredRequests = myPickupRequests.filter(
      (request) =>
        requestFilter === "all" ||
        request.status === requestFilter
    );

    const formatRequestDate = (value) => {
      if (!value) return "Not available";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Not available";
      }

      return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    };

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">
              My Pickup Requests
            </h2>

            <p className="text-sm text-ink-muted mt-1">
              Track food requests and donor decisions.
            </p>
          </div>

          <button
            type="button"
            disabled={requestsLoading}
            onClick={() => {
              loadMyPickupRequests().catch(() => { });
            }}
            className="rounded-xl border border-line bg-paper px-4 py-2 text-sm font-bold text-forest disabled:opacity-50"
          >
            {requestsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            "all",
            "pending",
            "approved",
            "assigned",
            "picked_up",
            "completed",
            "rejected",
            "expired",
          ].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setRequestFilter(status)}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase ${requestFilter === status
                ? "bg-forest text-paper"
                : "bg-paper border border-line text-ink-muted"
                }`}
            >
              {status.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {assignmentError && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {assignmentError}
          </div>
        )}

        {assignmentSuccess && (
          <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {assignmentSuccess}
          </div>
        )}

        {requestsError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {requestsError}
          </div>
        )}

        {requestsLoading && myPickupRequests.length === 0 ? (
          <div className="rounded-2xl border border-line bg-paper p-10 text-center">
            Loading pickup requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-ink-muted">
            No pickup requests found for this status.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm"
              >
                <div className="p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-charcoal">
                        {request.foodTitle}
                      </h3>

                      <p className="mt-1 text-sm text-ink-muted">
                        Donor: {request.donorName}
                      </p>
                    </div>

                    <span className="rounded-full bg-sage-light px-3 py-1 text-xs font-bold uppercase text-forest">
                      {request.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-bold text-ink-muted">
                        Requested Quantity
                      </p>

                      <p className="font-bold text-charcoal">
                        {request.requestedQuantity}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink-muted">
                        Requested At
                      </p>

                      <p className="font-bold text-charcoal">
                        {formatRequestDate(request.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink-muted">
                        Donor Decision
                      </p>

                      <p className="font-bold text-charcoal">
                        {formatRequestDate(request.decidedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-ink-muted">
                        Last Updated
                      </p>

                      <p className="font-bold text-charcoal">
                        {formatRequestDate(request.updatedAt)}
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

                  {request.decisionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="mb-1 text-xs font-bold text-red-700">
                        Donor Decision Reason
                      </p>

                      <p className="text-sm text-red-700">
                        {request.decisionReason}
                      </p>
                    </div>
                  )}

                  {request.status === "approved" && (
                    <section className="space-y-3 border-t border-line pt-4" aria-label="Volunteer assignment">
                      <h4 className="text-sm font-bold uppercase text-forest">Volunteer Assignment</h4>
                      {assigningRequestId !== request.id ? (
                        <button
                          type="button"
                          disabled={assignmentLoading}
                          onClick={() => {
                            setAssigningRequestId(request.id);
                            setVolunteerUserId("");
                            setVolunteerSearch("");
                            setVolunteerDirectory([]);
                            void loadVolunteerDirectory();
                            setAssignmentError("");
                            setAssignmentSuccess("");
                          }}
                          className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper disabled:opacity-50"
                        >
                          Assign Volunteer
                        </button>
                      ) : (
                        <div className="space-y-3 rounded-xl bg-ivory p-4">
                          <label htmlFor={`volunteer-${request.id}`} className="block text-sm font-bold text-charcoal">
                            Search registered volunteers
                          </label>
                          <input
                            id={`volunteer-${request.id}`}
                            type="search"
                            value={volunteerSearch}
                            onChange={(event) => setVolunteerSearch(event.target.value)}
                            placeholder="Search by name"
                            className="w-full rounded-xl border border-line bg-paper p-3 text-sm outline-none focus:border-forest"
                          />
                          {volunteersLoading && <p className="text-sm text-ink-muted">Loading volunteers...</p>}
                          {volunteersError && <p role="alert" className="text-sm text-red-700">{volunteersError}</p>}
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            {volunteerDirectory.filter((v) =>
                              (v.fullName || "").toLowerCase().includes(volunteerSearch.trim().toLowerCase())
                            ).map((volunteer) => (
                              <button
                                type="button"
                                key={volunteer.id}
                                disabled={!volunteer.canAssign || assignmentLoading}
                                onClick={() => setVolunteerUserId(volunteer.id)}
                                aria-pressed={volunteerUserId === volunteer.id}
                                className={`w-full rounded-xl border p-3 text-left text-sm disabled:opacity-50 ${volunteerUserId === volunteer.id ? "border-forest bg-sage-light/40" : "border-line bg-paper"}`}
                              >
                                <span className="font-bold">{volunteer.fullName}</span>
                                <span className="block text-xs text-ink-muted">
                                  {volunteer.isBusy ? "On assignment" : volunteer.canAssign ? "Available" : "Unavailable"}
                                  {volunteer.vehicleType ? ` · ${volunteer.vehicleType}` : ""}
                                </span>
                              </button>
                            ))}
                            {!volunteersLoading && !volunteersError && volunteerDirectory.length === 0 && (
                              <p className="text-sm text-ink-muted">No registered volunteers found.</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              disabled={assignmentLoading || volunteersLoading || !volunteerDirectory.some((v) => v.id === volunteerUserId && v.canAssign)}
                              onClick={() => handleAssignVolunteer(request.id)}
                              className="rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper disabled:opacity-50"
                            >
                              {assignmentLoading ? "Assigning..." : "Confirm Assignment"}
                            </button>
                            <button
                              type="button"
                              disabled={assignmentLoading}
                              onClick={() => {
                                setAssigningRequestId(null);
                                setVolunteerUserId("");
                                setAssignmentError("");
                              }}
                              className="rounded-xl border border-line bg-paper px-5 py-3 text-sm font-bold text-charcoal disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  const renderPlaceholder = (Icon, message) => (
    <div className="flex flex-col items-center justify-center min-h-64 rounded-2xl border border-dashed border-line bg-paper p-8 text-center text-ink-muted">
      <Icon className="mb-4 h-10 w-10 text-sage" />
      <p>{message}</p>
    </div>
  );

  const renderProfile = () => {
    if (profileError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {profileError}
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="text-ink-muted">
          Loading organization profile...
        </div>
      );
    }

    if (isEditingProfile) {
      return (
        <form
          onSubmit={handleProfileSave}
          className="max-w-4xl mx-auto space-y-6"
        >
          <div className="flex justify-between items-center border-b border-line pb-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-forest uppercase">
                Edit NGO Profile
              </h2>

              <p className="text-sm text-ink-muted">
                Update your organization&apos;s operational details.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditForm(profile);
                  setIsEditingProfile(false);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold border border-line flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-bold text-paper bg-forest flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>

          <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">
                Organization Name
              </label>

              <input
                value={editForm.name || ""}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    name: event.target.value,
                  })
                }
                className="w-full p-3 rounded-lg border border-line bg-ivory"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">
                Description
              </label>

              <textarea
                value={editForm.description || ""}
                onChange={(event) =>
                  setEditForm({
                    ...editForm,
                    description: event.target.value,
                  })
                }
                className="w-full p-3 rounded-lg border border-line bg-ivory"
                rows={4}
              />
            </div>

            <p className="text-xs text-ink-muted">
              Profile changes are not yet saved to the backend.
              Organization update integration is the next step.
            </p>
          </div>
        </form>
      );
    }

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">
              NGO Profile
            </h2>

            <p className="text-sm text-ink-muted mt-1">
              Manage your organization information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-forest bg-sage-light flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        <div className="bg-paper p-8 rounded-2xl border border-line shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-forest text-paper flex items-center justify-center text-xl font-bold">
              {profile.name.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 className="text-2xl font-display font-bold">
                {profile.name}
              </h3>

              <p className="text-sm text-ink-muted">
                Verification: {profile.status}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <p>
              <strong>Type:</strong> {profile.type}
            </p>

            <p>
              <strong>Description:</strong>{" "}
              {profile.description || "Not provided"}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {profile.phone || "Not provided"}
            </p>

            <p>
              <strong>Address:</strong>{" "}
              {profile.address || "Not provided"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const toggleNotification = (key) => {
      setNotifications((previous) => ({
        ...previous,
        [key]: !previous[key],
      }));
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            Settings
          </h2>

          <p className="text-sm text-ink-muted">
            Manage account preferences and notifications.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-charcoal">
            <Globe className="w-4 h-4" />
            Account Preferences
          </h3>

          <p className="text-sm text-ink-muted">
            Language preferences will be available in a
            future update.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold">
            <Bell className="w-4 h-4" />
            Notification Preferences
          </h3>

          {[
            { key: "newOffers", label: "New Food Offers" },
            { key: "urgent", label: "Urgent Donations" },
            { key: "volunteer", label: "Volunteer Updates" },
            {
              key: "collaborations",
              label: "Collaboration Requests",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <span className="text-sm">{item.label}</span>

              <button
                type="button"
                aria-label={`Toggle ${item.label}`}
                aria-pressed={notifications[item.key]}
                onClick={() => toggleNotification(item.key)}
                className={`w-11 h-6 rounded-full relative ${notifications[item.key]
                  ? "bg-forest"
                  : "bg-line"
                  }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-paper absolute top-1 transition-transform ${notifications[item.key]
                    ? "translate-x-6"
                    : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          ))}

          <p className="text-xs text-ink-muted">
            These preferences are currently stored only
            during this page session.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold">
            <Shield className="w-4 h-4" />
            Account Security
          </h3>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-forest"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>

          <p className="text-xs text-ink-muted">
            Account deletion is not available in this
            version.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-ivory flex flex-col text-charcoal font-body overflow-hidden">
      <header className="bg-paper border-b border-line px-6 py-4 flex items-center justify-between shrink-0 z-20">
        <div className="w-64 flex items-center gap-3">
          <Leaf className="w-8 h-8 text-forest" />

          <h1 className="text-xl font-display font-bold text-forest tracking-tight">
            ZeroWaste
          </h1>
        </div>

        <div className="flex items-center justify-end gap-6">
          <button
            type="button"
            aria-label="Open settings"
            onClick={() => setActiveTab("settings")}
            className="p-2 text-ink-muted hover:text-forest"
          >
            <Settings className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 pl-6 border-l border-line">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-forest">
                {profile?.name || "NGO"}
              </p>

              <p className="text-xs text-ink-muted">
                {profile?.status || "Verification pending"}
              </p>
            </div>

            <div className="w-10 h-10 bg-forest text-paper rounded-full flex items-center justify-center font-bold">
              {profile?.name
                ? profile.name.slice(0, 2).toUpperCase()
                : "NG"}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-paper border-r border-line flex-col overflow-y-auto shrink-0 pb-6 z-10 hidden md:flex">
          <nav className="flex-1 px-4 pt-6 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"

                  onClick={() => {
                    setActiveTab(item.id);

                    if (item.id === "collaborations") {
                      loadMyPickupRequests().catch(() => { });
                    }
                  }}

                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === item.id
                    ? "bg-sage-light text-forest shadow-sm"
                    : "text-ink-muted hover:bg-ivory hover:text-forest"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto bg-ivory p-6 md:p-10 relative">
          {activeTab === "dashboard" && renderDashboard()}

          {activeTab === "requests" && renderFoodRequests()}

          {activeTab === "collaborations" && renderPickupHistory()}

          {activeTab === "volunteers" &&
            renderPlaceholder(
              Truck,
              "Volunteer directory pending frontend integration."
            )}

          {activeTab === "containers" &&
            renderPlaceholder(
              PackageOpen,
              "Container tracking is not yet implemented."
            )}

          {activeTab === "impact" &&
            renderPlaceholder(
              BarChart3,
              "Impact analytics integration is pending."
            )}

          {activeTab === "profile" && renderProfile()}

          {activeTab === "settings" && renderSettings()}
        </main>
      </div>
    </div>
  );
}
