
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Leaf,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";

import {
  api,
  authStorage,
  ApiError,
} from "../../lib/api/client";

type Role = "donor" | "ngo";

type OrganizationType =
  | "ngo"
  | "restaurant"
  | "hostel"
  | "caterer"
  | "other_donor";

type OrganizationForm = {
  name: string;
  organizationType: OrganizationType;
  description: string;
  contactPhone: string;
  address: string;
  latitude: string;
  longitude: string;
};

const initialForm: OrganizationForm = {
  name: "",
  organizationType: "restaurant",
  description: "",
  contactPhone: "",
  address: "",
  latitude: "",
  longitude: "",
};

function dashboardForRole(role: Role) {
  return role === "ngo" ? "/ngo" : "/restaurant";
}

function parseLocation(
  latitudeValue: string,
  longitudeValue: string
) {
  if (
    !latitudeValue.trim() ||
    !longitudeValue.trim()
  ) {
    throw new Error(
      "Latitude and longitude are required."
    );
  }

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error("Invalid latitude.");
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid longitude.");
  }

  return { latitude, longitude };
}

export default function OnboardingPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] =
    useState<OrganizationForm>(initialForm);

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkAccount = useCallback(async () => {
    setChecking(true);
    setError("");

    try {
      if (!authStorage.getToken()) {
        router.replace("/");
        return;
      }

      const meResponse = await api.getMe();
      const user = meResponse?.data?.user;

      if (!user) {
        throw new Error("Unable to retrieve your account.");
      }

      if (
        user.role !== "donor" &&
        user.role !== "ngo"
      ) {
        if (user.role === "volunteer") {
          router.replace("/volunteer");
        } else {
          router.replace("/");
        }
        return;
      }

      if (
        user.is_active === false ||
        user.isActive === false
      ) {
        throw new Error("Your account is disabled.");
      }

      setRole(user.role);

      setForm((previous) => ({
        ...previous,
        organizationType:
          user.role === "ngo"
            ? "ngo"
            : previous.organizationType === "ngo"
              ? "restaurant"
              : previous.organizationType,
      }));

      try {
        const organizationResponse =
          await api.getMyOrganization();

        if (
          organizationResponse?.data?.organization?.id
        ) {
          router.replace(
            dashboardForRole(user.role)
          );
          return;
        }

        throw new Error(
          "Unexpected organization response."
        );
      } catch (organizationError) {
        if (
          organizationError instanceof ApiError &&
          organizationError.status === 404
        ) {
          // No organization yet. Show onboarding form.
          return;
        }

        throw organizationError;
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to verify account."
      );
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    // Run the asynchronous check after mounting.
    void Promise.resolve().then(checkAccount);
  }, [checkAccount]);

  function updateField(
    field: keyof OrganizationForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!role || submitting) return;

    setError("");
    setSuccess("");

    try {
      const name = form.name.trim();
      const address = form.address.trim();
      const contactPhone = form.contactPhone.trim();

      if (name.length < 3 || name.length > 200) {
        throw new Error(
          "Organization name must contain 3–200 characters."
        );
      }

      if (
        address.length < 5 ||
        address.length > 500
      ) {
        throw new Error(
          "Address must contain 5–500 characters."
        );
      }

      if (
        contactPhone &&
        (contactPhone.length < 7 ||
          contactPhone.length > 20)
      ) {
        throw new Error(
          "Contact phone must contain 7–20 characters."
        );
      }

      if (form.description.length > 2000) {
        throw new Error(
          "Description cannot exceed 2000 characters."
        );
      }

      const location = parseLocation(
        form.latitude,
        form.longitude
      );

      const organizationType =
        role === "ngo"
          ? "ngo"
          : form.organizationType;

      if (
        role === "donor" &&
        ![
          "restaurant",
          "hostel",
          "caterer",
          "other_donor",
        ].includes(organizationType)
      ) {
        throw new Error(
          "Invalid food provider category."
        );
      }

      setSubmitting(true);

      // Check again to avoid creating duplicate organizations.
      try {
        const existing = await api.getMyOrganization();

        if (existing?.data?.organization?.id) {
          router.replace(dashboardForRole(role));
          return;
        }

        throw new Error(
          "Unable to confirm organization state."
        );
      } catch (lookupError) {
        if (
          !(lookupError instanceof ApiError) ||
          lookupError.status !== 404
        ) {
          throw lookupError;
        }
      }

      const response = await api.createOrganization({
        name,
        organizationType,
        description: form.description.trim(),
        ...(contactPhone ? { contactPhone } : {}),
        address,
        location,
      });

      if (!response?.success) {
        throw new Error(
          "Organization creation was not confirmed."
        );
      }

      // Verify persisted record instead of trusting only POST.
      const verified = await api.getMyOrganization();

      if (!verified?.data?.organization?.id) {
        throw new Error(
          "Organization saved, but verification failed. Retry checking your profile."
        );
      }

      setSuccess(
        "Organization created successfully. Verification may still be pending."
      );

      router.replace(dashboardForRole(role));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to complete onboarding."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    authStorage.clearToken();
    router.replace("/");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-forest font-bold">
          Checking your organization profile...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-ivory px-4 py-10 font-body">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8 text-forest" />
            <h1 className="font-display text-2xl font-bold text-forest">
              ZeroWaste
            </h1>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-sm font-bold text-charcoal"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="rounded-3xl border border-line bg-paper p-6 shadow-sm sm:p-10">
          <div className="mb-6 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-forest" />
            <div>
              <h2 className="font-display text-2xl font-bold text-forest">
                Complete Organization Profile
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Finish setting up your account.
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 flex gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {!role ? (
            <button
              type="button"
              onClick={() => void checkAccount()}
              className="rounded-xl bg-forest px-5 py-3 font-bold text-paper"
            >
              Retry Account Check
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="org-name"
                  className="mb-1 block text-sm font-bold text-charcoal"
                >
                  Organization Name
                </label>

                <input
                  id="org-name"
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.name}
                  onChange={(event) =>
                    updateField("name", event.target.value)
                  }
                  className="w-full rounded-xl border border-line bg-ivory p-3 outline-none focus:border-forest"
                />
              </div>

              <div>
                <label
                  htmlFor="org-type"
                  className="mb-1 block text-sm font-bold text-charcoal"
                >
                  Organization Type
                </label>

                {role === "ngo" ? (
                  <input
                    id="org-type"
                    readOnly
                    value="NGO"
                    className="w-full rounded-xl border border-line bg-ivory p-3"
                  />
                ) : (
                  <select
                    id="org-type"
                    value={form.organizationType}
                    onChange={(event) =>
                      updateField(
                        "organizationType",
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-line bg-ivory p-3"
                  >
                    <option value="restaurant">
                      Restaurant
                    </option>
                    <option value="hostel">
                      Hostel / Hotel
                    </option>
                    <option value="caterer">
                      Caterer
                    </option>
                    <option value="other_donor">
                      Other Food Provider
                    </option>
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="org-description"
                  className="mb-1 block text-sm font-bold text-charcoal"
                >
                  Description (Optional)
                </label>

                <textarea
                  id="org-description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-ivory p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="org-phone"
                  className="mb-1 block text-sm font-bold text-charcoal"
                >
                  Contact Phone (Optional)
                </label>

                <input
                  id="org-phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(event) =>
                    updateField(
                      "contactPhone",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-line bg-ivory p-3"
                />
              </div>

              <div>
                <label
                  htmlFor="org-address"
                  className="mb-1 block text-sm font-bold text-charcoal"
                >
                  Organization Address
                </label>

                <textarea
                  id="org-address"
                  required
                  minLength={5}
                  maxLength={500}
                  rows={2}
                  value={form.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className="w-full rounded-xl border border-line bg-ivory p-3"
                />
              </div>

              <div className="rounded-xl border border-line bg-ivory p-4">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-forest" />
                  <h3 className="font-bold text-forest">
                    Organization Coordinates
                  </h3>
                </div>

                <p className="mb-4 text-xs text-ink-muted">
                  Enter the coordinates of your actual
                  organization location. These enable
                  nearby food discovery and navigation.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="org-latitude"
                      className="mb-1 block text-sm font-bold"
                    >
                      Latitude
                    </label>

                    <input
                      id="org-latitude"
                      type="number"
                      step="any"
                      min={-90}
                      max={90}
                      required
                      value={form.latitude}
                      onChange={(event) =>
                        updateField(
                          "latitude",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-line bg-paper p-3"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="org-longitude"
                      className="mb-1 block text-sm font-bold"
                    >
                      Longitude
                    </label>

                    <input
                      id="org-longitude"
                      type="number"
                      step="any"
                      min={-180}
                      max={180}
                      required
                      value={form.longitude}
                      onChange={(event) =>
                        updateField(
                          "longitude",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-line bg-paper p-3"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-forest py-4 font-bold text-paper hover:bg-forest-deep disabled:opacity-50"
              >
                {submitting
                  ? "Saving Organization..."
                  : "Complete Organization Setup"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
