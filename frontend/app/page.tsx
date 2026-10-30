
"use client";

import React, {
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  Leaf,
  Store,
  HeartHandshake,
  Truck,
  ArrowRight,
  ArrowLeft,
  MapPin,
} from "lucide-react";

import {
  api,
  authStorage,
  ApiError,
} from "../lib/api/client";

type Role = "donor" | "ngo" | "volunteer";

type View =
  | "login"
  | "role-select"
  | "signup-common"
  | "signup-specific";

type DonorType =
  | "restaurant"
  | "hostel"
  | "caterer"
  | "other_donor";

interface SignupForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  businessCategory: DonorType;
  description: string;
  address: string;
  latitude: string;
  longitude: string;
}

const initialForm: SignupForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  organizationName: "",
  businessCategory: "restaurant",
  description: "",
  address: "",
  latitude: "",
  longitude: "",
};

const roleRoutes: Record<Role, string> = {
  donor: "/restaurant",
  ngo: "/ngo",
  volunteer: "/volunteer",
};

const inputClass =
  "w-full rounded-xl border border-line bg-ivory " +
  "px-4 py-3 text-sm text-charcoal outline-none " +
  "focus:border-forest focus:ring-1 focus:ring-forest";

function parseCoordinates(
  latitudeInput: string,
  longitudeInput: string
) {
  if (
    !latitudeInput.trim() ||
    !longitudeInput.trim()
  ) {
    throw new Error(
      "Organization latitude and longitude are required."
    );
  }

  const latitude = Number(latitudeInput);
  const longitude = Number(longitudeInput);

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      "Latitude must be between -90 and 90."
    );
  }

  if (
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  return { latitude, longitude };
}

function buildOrganizationPayload(
  form: SignupForm,
  role: "donor" | "ngo"
) {
  const name = form.organizationName.trim();
  const address = form.address.trim();
  const phone = form.phone.trim();
  const description = form.description.trim();

  if (name.length < 3 || name.length > 200) {
    throw new Error(
      "Organization name must contain 3–200 characters."
    );
  }

  if (address.length < 5 || address.length > 500) {
    throw new Error(
      "Address must contain 5–500 characters."
    );
  }

  if (
    phone &&
    (phone.length < 7 || phone.length > 20)
  ) {
    throw new Error(
      "Phone number must contain 7–20 characters."
    );
  }

  if (description.length > 2000) {
    throw new Error(
      "Description cannot exceed 2000 characters."
    );
  }

  const allowedDonorTypes: DonorType[] = [
    "restaurant",
    "hostel",
    "caterer",
    "other_donor",
  ];

  if (
    role === "donor" &&
    !allowedDonorTypes.includes(form.businessCategory)
  ) {
    throw new Error("Invalid business category.");
  }

  return {
    name,
    organizationType:
      role === "ngo"
        ? "ngo"
        : form.businessCategory,
    description,
    ...(phone ? { contactPhone: phone } : {}),
    address,
    location: parseCoordinates(
      form.latitude,
      form.longitude
    ),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export default function AuthPage() {
  const router = useRouter();

  const [view, setView] =
    useState<View>("login");

  const [role, setRole] =
    useState<Role | null>(null);

  const [formData, setFormData] =
    useState<SignupForm>(initialForm);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  function updateField(
    field: keyof SignupForm,
    value: string
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function changeView(nextView: View) {
    setError("");
    setSuccess("");
    setView(nextView);
  }

  function selectRole(selectedRole: Role) {
    setRole(selectedRole);
    setFormData(initialForm);
    changeView("signup-common");
  }

  async function checkOrganizationAndRedirect(
    authenticatedRole: Role
  ) {
    if (authenticatedRole === "volunteer") {
      router.replace("/volunteer");
      return;
    }

    try {
      const response = await api.getMyOrganization();

      if (
        response?.success &&
        response.data?.organization?.id
      ) {
        router.replace(roleRoutes[authenticatedRole]);
        return;
      }

      throw new Error(
        "Organization response was incomplete."
      );
    } catch (caughtError) {
      if (
        caughtError instanceof ApiError &&
        caughtError.status === 404
      ) {
        router.replace("/onboarding");
        return;
      }

      throw caughtError;
    }
  }

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await api.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      const accessToken =
        response?.data?.accessToken;

      if (!accessToken) {
        throw new Error(
          "Login failed: access token missing."
        );
      }

      authStorage.setToken(accessToken);

      const meResponse = await api.getMe();
      const user = meResponse?.data?.user;

      if (!user) {
        throw new Error(
          "Unable to retrieve authenticated user."
        );
      }

      if (
        user.is_active === false ||
        user.isActive === false
      ) {
        throw new Error("Your account is disabled.");
      }

      if (
        user.role !== "donor" &&
        user.role !== "ngo" &&
        user.role !== "volunteer"
      ) {
        throw new Error(
          "No dashboard is available for this role."
        );
      }

      await checkOrganizationAndRedirect(user.role);
    } catch (caughtError) {
      // Clear credentials only when authentication or
      // authorization is actually invalid.
      if (
        caughtError instanceof ApiError &&
        [401, 403].includes(caughtError.status)
      ) {
        authStorage.clearToken();
      }

      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  function handleCommonSignup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!role) {
      setError("Select an account role.");
      return;
    }

    if (formData.name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }

    if (formData.password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      formData.password !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    changeView("signup-specific");
  }

  async function handleSignupComplete(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!role || isLoading) return;

    setError("");
    setSuccess("");

    let organizationPayload:
      | ReturnType<typeof buildOrganizationPayload>
      | null = null;

    // Validate everything before registering the user.
    try {
      if (role !== "volunteer") {
        organizationPayload =
          buildOrganizationPayload(formData, role);
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      return;
    }

    setIsLoading(true);

    let accountCreated = false;
    let organizationCreated = false;

    try {
      const email =
        formData.email.trim().toLowerCase();

      // STEP 1: Create the user account.
      const registration = await api.register({
        fullName: formData.name.trim(),
        email,
        password: formData.password,
        role,
      });

      if (!registration?.success) {
        throw new Error(
          "Account registration was not confirmed."
        );
      }

      accountCreated = true;

      // STEP 2: Log in automatically.
      const login = await api.login({
        email,
        password: formData.password,
      });

      const accessToken =
        login?.data?.accessToken;

      if (!accessToken) {
        throw new Error(
          "Account created, but automatic login failed."
        );
      }

      authStorage.setToken(accessToken);

      // STEP 3: Validate authenticated identity.
      const me = await api.getMe();
      const user = me?.data?.user;

      if (!user || user.role !== role) {
        throw new Error(
          "Authenticated account role does not match signup."
        );
      }

      if (
        user.is_active === false ||
        user.isActive === false
      ) {
        throw new Error(
          "Your account is not active."
        );
      }

      // Volunteers do not create organizations.
      if (role === "volunteer") {
        router.replace("/volunteer");
        return;
      }

      if (!organizationPayload) {
        throw new Error(
          "Organization details are missing."
        );
      }

      // STEP 4: Check if organization already exists.
      let existingOrganization = null;

      try {
        const existing =
          await api.getMyOrganization();

        existingOrganization =
          existing?.data?.organization || null;
      } catch (caughtError) {
        if (
          !(caughtError instanceof ApiError) ||
          caughtError.status !== 404
        ) {
          throw caughtError;
        }
      }

      // STEP 5: Create only if missing.
      if (!existingOrganization?.id) {
        const created =
          await api.createOrganization(
            organizationPayload
          );

        if (!created?.success) {
          throw new Error(
            "Organization creation failed."
          );
        }
      }

      // STEP 6: Verify persisted organization.
      const verified =
        await api.getMyOrganization();

      if (
        !verified?.success ||
        !verified?.data?.organization?.id
      ) {
        throw new Error(
          "Organization could not be verified."
        );
      }

      organizationCreated = true;

      // STEP 7: Go directly to dashboard.
      router.replace(roleRoutes[role]);
    } catch (caughtError) {
      let message = getErrorMessage(caughtError);

      if (accountCreated && !organizationCreated) {
        message =
          "Your account was created, but organization " +
          "setup could not be completed. " +
          "Please sign in with the same account to " +
          "finish onboarding. Do not register again. " +
          message;

        setView("login");
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function renderToggle() {
    return (
      <div className="mb-8 flex rounded-xl bg-line/30 p-1">
        <button
          type="button"
          onClick={() => changeView("login")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${
            view === "login"
              ? "bg-paper text-forest shadow-sm"
              : "text-ink-muted"
          }`}
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={() => changeView("role-select")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${
            view !== "login"
              ? "bg-paper text-forest shadow-sm"
              : "text-ink-muted"
          }`}
        >
          Sign Up
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex bg-ivory font-body">
      {/* BRAND PANEL */}
      <section className="hidden lg:flex w-1/2 bg-forest text-paper flex-col justify-center p-16 relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <Leaf className="w-10 h-10 text-sage" />
            <h1 className="text-3xl font-display font-bold">
              ZeroWaste
            </h1>
          </div>

          <h2 className="text-5xl font-display font-bold leading-tight mb-6">
            Good food deserves a second destination.
          </h2>

          <p className="text-lg text-sage-light">
            Connect local food providers, NGOs and
            volunteers to rescue surplus food and
            create measurable community impact.
          </p>

          <div className="mt-8 flex gap-4 text-sm font-bold text-gold uppercase">
            <span>Rescue Food</span>
            <span>•</span>
            <span>Reduce Waste</span>
            <span>•</span>
            <span>Create Impact</span>
          </div>
        </div>

        <Leaf className="absolute -bottom-24 -right-24 w-96 h-96 text-forest-deep opacity-40" />
      </section>

      {/* AUTH PANEL */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-xl sm:p-10">
          <div className="lg:hidden mb-8 flex items-center justify-center gap-2">
            <Leaf className="w-8 h-8 text-forest" />
            <h1 className="text-2xl font-bold text-forest">
              ZeroWaste
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {success}
            </div>
          )}

          {/* LOGIN */}
          {view === "login" && (
            <div>
              {renderToggle()}

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block text-sm font-bold"
                  >
                    Email Address
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 block text-sm font-bold"
                  >
                    Password
                  </label>

                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-forest py-3.5 font-bold text-paper disabled:opacity-50"
                >
                  {isLoading
                    ? "Signing in..."
                    : "Login"}
                </button>

                <p className="text-center text-sm text-ink-muted">
                  New to ZeroWaste?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      changeView("role-select")
                    }
                    className="font-bold text-forest hover:underline"
                  >
                    Create an account
                  </button>
                </p>
              </form>
            </div>
          )}

          {/* ROLE SELECTION */}
          {view === "role-select" && (
            <div>
              {renderToggle()}

              <h2 className="mb-5 text-xl font-display font-bold text-forest">
                Select Your Role
              </h2>

              <div className="space-y-3">
                {[
                  {
                    id: "donor" as Role,
                    title: "Food Provider / Donor",
                    description:
                      "Restaurants, hotels and caterers.",
                    icon: Store,
                  },
                  {
                    id: "ngo" as Role,
                    title: "NGO / Charity",
                    description:
                      "Organizations rescuing and distributing food.",
                    icon: HeartHandshake,
                  },
                  {
                    id: "volunteer" as Role,
                    title: "Volunteer",
                    description:
                      "Individuals helping collect and deliver food.",
                    icon: Truck,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectRole(item.id)}
                      className="w-full flex items-center gap-4 rounded-xl border border-line p-4 text-left hover:border-forest hover:bg-sage-light/30"
                    >
                      <div className="rounded-full bg-sage-light p-3 text-forest">
                        <Icon className="w-6 h-6" />
                      </div>

                      <div>
                        <h3 className="font-bold text-charcoal">
                          {item.title}
                        </h3>
                        <p className="text-xs text-ink-muted">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACCOUNT DETAILS */}
          {view === "signup-common" && (
            <div>
              <button
                type="button"
                onClick={() => changeView("role-select")}
                className="mb-6 flex items-center gap-2 text-sm font-bold text-forest"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-forest">
                  Account Details
                </h2>
                <span className="rounded-lg bg-sage-light px-3 py-1 text-xs font-bold text-forest">
                  Step 1/2
                </span>
              </div>

              <form
                onSubmit={handleCommonSignup}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Full Name
                  </label>

                  <input
                    required
                    minLength={2}
                    value={formData.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Email Address
                  </label>

                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Contact Phone
                  </label>

                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(event) =>
                      updateField(
                        "phone",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Password
                  </label>

                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold">
                    Confirm Password
                  </label>

                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={(event) =>
                      updateField(
                        "confirmPassword",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest py-3.5 font-bold text-paper"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ORGANIZATION / VOLUNTEER DETAILS */}
          {view === "signup-specific" && (
            <div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() =>
                  changeView("signup-common")
                }
                className="mb-6 flex items-center gap-2 text-sm font-bold text-forest disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-forest">
                  {role === "donor"
                    ? "Food Provider Details"
                    : role === "ngo"
                      ? "NGO Details"
                      : "Volunteer Registration"}
                </h2>

                <span className="rounded-lg bg-sage-light px-3 py-1 text-xs font-bold text-forest">
                  Step 2/2
                </span>
              </div>

              <form
                onSubmit={handleSignupComplete}
                className="max-h-[55vh] space-y-4 overflow-y-auto pr-2"
              >
                {role === "volunteer" ? (
                  <div className="rounded-xl border border-sage-light bg-sage-light/30 p-5">
                    <Truck className="mb-3 h-7 w-7 text-forest" />

                    <h3 className="font-bold text-forest">
                      Volunteer Account
                    </h3>

                    <p className="mt-2 text-sm text-ink-muted">
                      Your volunteer account will be
                      created using the details entered
                      in Step 1. You can view assignments
                      after logging in.
                    </p>

                    <p className="mt-3 text-xs text-ink-muted">
                      Transport preferences and availability
                      will be configured when the volunteer
                      profile API is integrated.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-bold">
                        {role === "ngo"
                          ? "Official NGO Name"
                          : "Business Name"}
                      </label>

                      <input
                        required
                        minLength={3}
                        maxLength={200}
                        value={formData.organizationName}
                        onChange={(event) =>
                          updateField(
                            "organizationName",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    {role === "donor" && (
                      <div>
                        <label className="mb-1 block text-xs font-bold">
                          Business Category
                        </label>

                        <select
                          value={formData.businessCategory}
                          onChange={(event) =>
                            updateField(
                              "businessCategory",
                              event.target.value
                            )
                          }
                          className={inputClass}
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
                      </div>
                    )}

                    <div>
                      <label className="mb-1 block text-xs font-bold">
                        Organization Description (Optional)
                      </label>

                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={formData.description}
                        onChange={(event) =>
                          updateField(
                            "description",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold">
                        Full Organization Address
                      </label>

                      <textarea
                        required
                        minLength={5}
                        maxLength={500}
                        rows={2}
                        value={formData.address}
                        onChange={(event) =>
                          updateField(
                            "address",
                            event.target.value
                          )
                        }
                        className={inputClass}
                      />
                    </div>

                    <div className="rounded-xl border border-line bg-ivory p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-forest" />

                        <h3 className="text-sm font-bold text-forest">
                          Organization Location
                        </h3>
                      </div>

                      <p className="mb-4 text-xs text-ink-muted">
                        Enter your actual organization
                        coordinates for nearby food
                        discovery and pickup navigation.
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-bold">
                            Latitude
                          </label>

                          <input
                            required
                            type="number"
                            step="any"
                            min={-90}
                            max={90}
                            placeholder="26.9124"
                            value={formData.latitude}
                            onChange={(event) =>
                              updateField(
                                "latitude",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold">
                            Longitude
                          </label>

                          <input
                            required
                            type="number"
                            step="any"
                            min={-180}
                            max={180}
                            placeholder="75.7873"
                            value={formData.longitude}
                            onChange={(event) =>
                              updateField(
                                "longitude",
                                event.target.value
                              )
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-ink-muted">
                      Organization verification is handled
                      separately by the administrator.
                      Registration does not automatically
                      grant verified status.
                    </p>
                  </>
                )}

                <label className="flex items-start gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 accent-forest"
                  />

                  <span>
                    I agree to the Terms &amp;
                    Conditions and Privacy Policy.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-terracotta-deep py-3.5 font-bold text-paper disabled:opacity-50"
                >
                  {isLoading
                    ? "Creating Account..."
                    : "Create Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
