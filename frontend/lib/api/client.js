
const BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api/v1"
).replace(/\/$/, "");

const TOKEN_KEY = "accessToken";

export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const authStorage = {
  getToken() {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("accessToken");
  },

  setToken(token) {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("accessToken", token);
  },

  clearToken() {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("accessToken");
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  },
};

async function fetchWithAuth(endpoint, options = {}) {
  const {
    skipAuth = false,
    redirectOnUnauthorized = true,
    ...fetchOptions
  } = options;

  const token = skipAuth ? null : authStorage.getToken();

  const headers = new Headers(fetchOptions.headers);

  if (
    fetchOptions.body != null &&
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the server. Please try again.",
      0
    );
  }

  const raw = await response.text();

  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new ApiError(
        "Invalid response received from server",
        response.status
      );
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      authStorage.clearToken();

      if (
        redirectOnUnauthorized &&
        typeof window !== "undefined"
      ) {
        window.location.replace("/");
      }
    }

    throw new ApiError(
      data.message || `Request failed (${response.status})`,
      response.status,
      data.errors || []
    );
  }

  return data;
}

export const api = {
  // AUTHENTICATION
  login: (credentials) =>
    fetchWithAuth("/auth/login", {
      method: "POST",
      skipAuth: true,
      redirectOnUnauthorized: false,
      body: JSON.stringify(credentials),
    }),

  register: (payload) =>
    fetchWithAuth("/auth/register", {
      method: "POST",
      skipAuth: true,
      redirectOnUnauthorized: false,
      body: JSON.stringify(payload),
    }),

  getMe: () => fetchWithAuth("/auth/me"),

  // ORGANIZATIONS
  getMyOrganization: () =>
    fetchWithAuth("/organizations/me"),

  createOrganization: (payload) =>
    fetchWithAuth("/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // FOOD LISTINGS
  createFoodListing: (payload) =>
    fetchWithAuth("/food-listings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),


  // VOLUNTEER DIRECTORY
  getVolunteerDirectory: () =>
    fetchWithAuth("/volunteer/directory"),

  getVolunteerAvailability: () =>
    fetchWithAuth("/volunteer/availability"),

  updateVolunteerAvailability: (isAvailable) =>
    fetchWithAuth("/volunteer/availability", {
      method: "PATCH",
      body: JSON.stringify({ isAvailable }),
    }),


  getMyFoodListings: () =>
    fetchWithAuth("/food-listings/mine"),

  cancelFoodListing: (id) =>
    fetchWithAuth(`/food-listings/${id}/cancel`, {
      method: "PATCH",
    }),

  // FOOD DISCOVERY
  getNearbyFood: (radiusKm = 5) =>
    fetchWithAuth(
      `/food-listings/nearby?radiusKm=${encodeURIComponent(radiusKm)}`
    ),

  getMatchingFood: (params = {}) => {
    const query = new URLSearchParams(params).toString();

    return fetchWithAuth(
      `/food-listings/matches${query ? `?${query}` : ""}`
    );
  },

  // PICKUP REQUESTS
  createPickupRequest: (foodListingId, notes = "") =>
    fetchWithAuth("/pickup-requests", {
      method: "POST",
      body: JSON.stringify({
        foodListingId,
        notes,
      }),
    }),

  getIncomingPickups: () =>
    fetchWithAuth("/pickup-requests/incoming"),

  getMyPickupRequests: () =>
    fetchWithAuth("/pickup-requests/mine"),

  approvePickup: (id) =>
    fetchWithAuth(`/pickup-requests/${id}/approve`, {
      method: "PATCH",
    }),

  rejectPickup: (id, reason) =>
    fetchWithAuth(`/pickup-requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),

  assignVolunteer: (pickupId, volunteerUserId) =>
    fetchWithAuth(`/pickup-requests/${pickupId}/assign`, {
      method: "POST",
      body: JSON.stringify({ volunteerUserId }),
    }),

  // VOLUNTEER
  getVolunteerAssignments: () =>
    fetchWithAuth("/volunteer/assignments"),

  getVolunteerAssignmentById: (id) =>
    fetchWithAuth(`/volunteer/assignments/${id}`),

  updateAssignmentStatus: (id, status) =>
    fetchWithAuth(
      `/volunteer/assignments/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    ),
};
