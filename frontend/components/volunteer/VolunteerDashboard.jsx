
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  UserRound,
  Settings,
  Bell,
  Leaf,
  Clock,
  MapPin,
  CheckCircle2,
  Navigation,
  PackageOpen,
  XCircle,
  ShieldCheck,
  Menu,
  Globe,
  LogOut,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import { api, authStorage } from "../../lib/api/client";

const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assignments", label: "My Assignments", icon: ClipboardList },
  { id: "history", label: "Rescue History", icon: History },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

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

function mapsUrl(location) {
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

function normalizeAssignment(raw) {
  return {
    id: raw.id,
    status: raw.status,
    food: raw.foodTitle || "Food donation",
    quantity: raw.quantity,
    quantityUnit: raw.quantityUnit || "",
    restaurant: raw.donorName || "Food provider",
    restaurantAddress:
      raw.pickupAddress || "Address unavailable",
    pickupLocation: raw.pickupLocation || null,
    ngo: raw.ngoName || "Receiving NGO",
    ngoAddress: raw.ngoAddress || "Address unavailable",
    ngoLocation: raw.ngoLocation || null,
    deadline: raw.pickupEndAt || null,
    assignedAt: raw.assignedAt || null,
    completedAt: raw.completedAt || null,
  };
}

export default function VolunteerDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [assignmentTab, setAssignmentTab] = useState("active");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] =
    useState(true);
  const [availabilitySaving, setAvailabilitySaving] =
    useState(false);
  const [availabilityError, setAvailabilityError] =
    useState("");


  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const [notifications, setNotifications] = useState({
    newAssignments: true,
    updates: true,
    deadlines: true,
    completion: true,
  });

  const requestIdRef = useRef(0);
  const mutationRef = useRef(false);

  const loadData = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const [meResponse, assignmentResponse] =
        await Promise.all([
          api.getMe(),
          api.getVolunteerAssignments(),
        ]);

      if (requestId !== requestIdRef.current) return;

      const user = meResponse?.data?.user;

      if (!user || user.role !== "volunteer") {
        throw new Error("Volunteer account required");
      }

      const records = assignmentResponse?.data?.assignments;

      if (!assignmentResponse?.success || !Array.isArray(records)) {
        throw new Error("Unable to retrieve volunteer assignments");
      }

      setProfile(user);
      setAssignments(records.map(normalizeAssignment));
      setError("");
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) return;

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load volunteer data"
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) loadData();
    });

    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
  }

  async function handleStatusUpdate(assignment, nextStatus) {
    if (mutationRef.current) return;

    const valid =
      (assignment.status === "assigned" &&
        nextStatus === "picked_up") ||
      (assignment.status === "picked_up" &&
        nextStatus === "completed");

    if (!valid) {
      setError("Invalid assignment status transition.");
      return;
    }

    const confirmed = window.confirm(
      nextStatus === "picked_up"
        ? "Confirm food collection?"
        : "Confirm delivery completion?"
    );

    if (!confirmed) return;

    mutationRef.current = true;
    setProcessingId(assignment.id);
    setError("");
    setNotice("");

    let succeeded = false;

    try {
      const response = await api.updateAssignmentStatus(
        assignment.id,
        nextStatus
      );

      if (!response?.success) {
        throw new Error("Status update failed");
      }

      succeeded = true;

      setNotice(
        nextStatus === "picked_up"
          ? "Food collection recorded successfully."
          : "Delivery completed successfully."
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update assignment"
      );
    } finally {
      mutationRef.current = false;
      setProcessingId(null);
    }

    if (succeeded) {
      setRefreshing(true);
      await loadData();
    }
  }

  function handleLogout() {
    authStorage.clearToken();
    router.replace("/");
    router.refresh();
  }

  function navigate(tab) {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }

  const activeAssignments = assignments.filter(
    (assignment) =>
      assignment.status === "assigned" ||
      assignment.status === "picked_up"
  );


  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    setAvailabilityError("");

    try {
      const response = await api.getVolunteerAvailability();

      if (
        !response?.success ||
        typeof response?.data?.availability?.isAvailable !==
        "boolean"
      ) {
        throw new Error(
          "Invalid availability response."
        );
      }

      setAvailability(response.data.availability);
    } catch (error) {
      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "Unable to load availability."
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);
  

  const completedAssignments = assignments.filter(
    (assignment) => assignment.status === "completed"
  );

  const completedMeals = completedAssignments
    .filter((assignment) => assignment.quantityUnit === "meals")
    .reduce(
      (sum, assignment) => sum + Number(assignment.quantity || 0),
      0
    );

  const displayedAssignments =
    assignmentTab === "completed"
      ? completedAssignments
      : assignmentTab === "all"
        ? assignments
        : activeAssignments;

  const displayName =
    profile?.full_name ||
    profile?.fullName ||
    "Volunteer";

  function renderAssignmentCard(assignment) {
    const pickupDirections = mapsUrl(assignment.pickupLocation);
    const ngoDirections = mapsUrl(assignment.ngoLocation);

    const canPickup = assignment.status === "assigned";
    const canComplete = assignment.status === "picked_up";
    const isProcessing = processingId === assignment.id;

    return (
      <div
        key={assignment.id}
        className="bg-paper border border-line rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-5 space-y-5">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h3 className="font-display font-bold text-lg text-charcoal">
                {assignment.restaurant}
              </h3>

              <p className="text-sm text-ink-muted mt-1">
                {assignment.food}
              </p>
            </div>

            <span className="bg-sage-light text-forest text-xs font-bold px-3 py-1 rounded-full uppercase">
              {assignment.status.replaceAll("_", " ")}
            </span>
          </div>

          <div className="bg-ivory rounded-xl p-4 border border-line flex gap-3">
            <PackageOpen className="w-6 h-6 text-forest shrink-0" />

            <div>
              <p className="font-bold text-charcoal">
                {assignment.food}
              </p>

              <p className="text-sm text-ink-muted">
                {assignment.quantity ?? "Unknown"}{" "}
                {assignment.quantityUnit}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-2 border-terracotta-deep pl-4">
              <p className="text-xs uppercase font-bold text-ink-muted">
                Pickup From
              </p>

              <p className="font-bold text-charcoal">
                {assignment.restaurant}
              </p>

              <p className="text-sm text-ink-muted">
                {assignment.restaurantAddress}
              </p>

              {pickupDirections && (
                <a
                  href={pickupDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-sm font-bold text-forest hover:underline"
                >
                  <Navigation className="w-4 h-4" />
                  Pickup Directions
                </a>
              )}
            </div>

            <div className="border-l-2 border-forest pl-4">
              <p className="text-xs uppercase font-bold text-ink-muted">
                Deliver To
              </p>

              <p className="font-bold text-charcoal">
                {assignment.ngo}
              </p>

              <p className="text-sm text-ink-muted">
                {assignment.ngoAddress}
              </p>

              {ngoDirections && (
                <a
                  href={ngoDirections}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-sm font-bold text-forest hover:underline"
                >
                  <MapPin className="w-4 h-4" />
                  NGO Directions
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <Clock className="w-4 h-4" />
            Pickup deadline: {formatDate(assignment.deadline)}
          </div>
        </div>

        {(canPickup || canComplete) && (
          <div className="p-4 bg-ivory border-t border-line">
            <button
              type="button"
              disabled={Boolean(processingId)}
              onClick={() =>
                handleStatusUpdate(
                  assignment,
                  canPickup ? "picked_up" : "completed"
                )
              }
              className={`w-full py-3 rounded-xl font-bold text-sm text-paper disabled:opacity-50 ${canPickup
                ? "bg-terracotta-deep hover:bg-terracotta"
                : "bg-forest hover:bg-forest-deep"
                }`}
            >
              {isProcessing
                ? "Updating..."
                : canPickup
                  ? "Confirm Food Collected"
                  : "Confirm Delivery Completed"}
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderDashboard() {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <section className="bg-paper border border-line rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-2xl font-display font-bold text-forest uppercase">
                Hi, {displayName}
              </h2>

              <p className="text-sm text-ink-muted mt-1">
                Welcome to your Volunteer Portal
              </p>
            </div>

            <span className="bg-st-fresh-bg text-st-fresh-fg px-4 py-2 rounded-xl text-sm font-bold">
              <ShieldCheck className="inline w-4 h-4 mr-1" />
              Volunteer
            </span>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Completed",
              value: completedAssignments.length,
            },
            {
              label: "Meals",
              value: completedMeals,
            },
            {
              label: "Active",
              value: activeAssignments.length,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-paper p-4 md:p-6 rounded-2xl border border-line shadow-sm text-center"
            >
              <p className="text-xs font-bold text-ink-muted uppercase">
                {stat.label}
              </p>

              <p className="text-3xl font-display font-bold text-forest mt-2">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <button
          type="button"
          onClick={() => navigate("assignments")}
          className="w-full py-4 rounded-xl bg-forest text-paper font-bold hover:bg-forest-deep"
        >
          Go to My Assignments
        </button>
      </div>
    );
  }

  function renderAssignments() {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-forest uppercase">
              My Assignments
            </h2>

            <p className="text-sm text-ink-muted">
              Manage your assigned food rescue tasks.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-paper border border-line text-sm font-bold text-forest disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex bg-line/30 p-1 rounded-xl">
          {["active", "completed", "all"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAssignmentTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${assignmentTab === tab
                ? "bg-paper shadow-sm text-forest"
                : "text-ink-muted"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {displayedAssignments.length === 0 ? (
          <div className="p-10 text-center bg-paper border border-dashed border-line rounded-2xl">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-sage" />

            <p className="font-bold text-charcoal">
              No assignments found
            </p>

            <p className="text-sm text-ink-muted mt-2">
              An NGO must assign you to an approved pickup.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedAssignments.map(renderAssignmentCard)}
          </div>
        )}
      </div>
    );
  }

  function renderHistory() {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            Rescue History
          </h2>

          <p className="text-sm text-ink-muted">
            Your completed food rescue assignments.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-4">
          <div className="bg-forest p-6 rounded-2xl text-paper text-center">
            <p className="text-xs font-bold uppercase">
              Completed Pickups
            </p>

            <p className="text-4xl font-display font-bold mt-2">
              {completedAssignments.length}
            </p>
          </div>

          <div className="bg-paper p-6 rounded-2xl border border-line text-center">
            <p className="text-xs font-bold text-ink-muted uppercase">
              Meals Delivered
            </p>

            <p className="text-4xl font-display font-bold text-terracotta-deep mt-2">
              {completedMeals}
            </p>
          </div>
        </section>

        {completedAssignments.length === 0 ? (
          <p className="text-sm text-ink-muted text-center py-10">
            No completed rescues yet.
          </p>
        ) : (
          <div className="space-y-4">
            {completedAssignments.map(renderAssignmentCard)}
          </div>
        )}
      </div>
    );
  }

  function renderProfile() {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            My Profile
          </h2>

          <p className="text-sm text-ink-muted">
            Information retrieved from your account.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-forest text-paper flex items-center justify-center text-xl font-bold">
              {displayName.slice(0, 2).toUpperCase()}
            </div>

            <div>
              <h3 className="text-xl font-bold text-charcoal">
                {displayName}
              </h3>

              <p className="text-sm text-forest font-bold">
                Volunteer
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-ink-muted">Email</p>
              <p className="font-bold">
                {profile?.email || "Unavailable"}
              </p>
            </div>

            <div>
              <p className="text-ink-muted">Role</p>
              <p className="font-bold capitalize">
                {profile?.role || "Volunteer"}
              </p>
            </div>

            <div>
              <p className="text-ink-muted">Account Status</p>
              <p className="font-bold">
                {profile?.is_active === false ||
                  profile?.isActive === false
                  ? "Disabled"
                  : "Active"}
              </p>
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            Transportation preferences, locality and
            emergency contacts require a dedicated
            volunteer profile API before they can be
            edited or saved.
          </p>
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="border-b border-line pb-4">
          <h2 className="text-2xl font-display font-bold text-forest uppercase">
            Settings
          </h2>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-charcoal">
            <Bell className="w-4 h-4" />
            Notification Preferences
          </h3>

          {[
            { key: "newAssignments", label: "New Assignments" },
            { key: "updates", label: "Assignment Updates" },
            { key: "deadlines", label: "Deadline Reminders" },
            { key: "completion", label: "Task Completion" },
          ].map((item) => (
            <div
              key={item.key}
              className="flex justify-between items-center"
            >
              <span className="text-sm font-bold">
                {item.label}
              </span>

              <button
                type="button"
                aria-label={`Toggle ${item.label}`}
                aria-pressed={notifications[item.key]}
                onClick={() =>
                  setNotifications((previous) => ({
                    ...previous,
                    [item.key]: !previous[item.key],
                  }))
                }
                className={`w-11 h-6 rounded-full relative ${notifications[item.key]
                  ? "bg-forest"
                  : "bg-line"
                  }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-paper rounded-full ${notifications[item.key]
                    ? "left-6"
                    : "left-1"
                    }`}
                />
              </button>
            </div>
          ))}

          <p className="text-xs text-ink-muted">
            These preferences are currently local to
            this dashboard session.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-charcoal">
            <Globe className="w-4 h-4" />
            Account Preferences
          </h3>

          <p className="text-sm text-ink-muted">
            Additional account settings will be
            available in a future update.
          </p>
        </div>

        <div className="bg-paper p-6 rounded-2xl border border-line space-y-4">
          <h3 className="flex items-center gap-2 font-bold text-charcoal">
            <ShieldCheck className="w-4 h-4" />
            Security
          </h3>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-bold text-forest"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="font-bold text-forest animate-pulse">
          Loading volunteer dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-ivory flex flex-col md:flex-row text-charcoal font-body overflow-hidden">
      <header className="md:hidden bg-paper border-b border-line px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-forest"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Leaf className="w-6 h-6 text-forest" />

          <h1 className="text-lg font-display font-bold text-forest">
            ZeroWaste
          </h1>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh assignments"
          className="text-forest"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-paper border-r border-line transition-transform duration-300 flex flex-col md:relative md:translate-x-0 ${isMobileMenuOpen
          ? "translate-x-0"
          : "-translate-x-full"
          }`}
      >
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-line">
          <Leaf className="w-8 h-8 text-forest" />

          <h1 className="text-xl font-display font-bold text-forest">
            ZeroWaste
          </h1>
        </div>

        <div className="md:hidden p-4 flex justify-end">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 text-xs font-bold text-ink-muted uppercase">
          Volunteer Portal
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm ${activeTab === item.id
                  ? "bg-sage-light text-forest shadow-sm"
                  : "text-ink-muted hover:bg-ivory"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-ivory p-4 md:p-10">
        <div className="hidden md:flex justify-end items-center mb-8 gap-4">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm font-bold text-forest disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="max-w-3xl mx-auto mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 flex items-start gap-2"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="max-w-3xl mx-auto mb-5 p-4 rounded-xl border border-green-200 bg-green-50 text-sm text-green-800 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {notice}
          </div>
        )}

        {activeTab === "dashboard" && renderDashboard()}
        {activeTab === "assignments" && renderAssignments()}
        {activeTab === "history" && renderHistory()}
        {activeTab === "profile" && renderProfile()}
        {activeTab === "settings" && renderSettings()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-paper border-t border-line flex justify-around p-3 z-30">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Home" },
          { id: "assignments", icon: ClipboardList, label: "Tasks" },
          { id: "history", icon: History, label: "History" },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              className={`flex flex-col items-center gap-1 p-2 ${activeTab === item.id
                ? "text-forest"
                : "text-ink-muted"
                }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
