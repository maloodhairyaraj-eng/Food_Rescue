import { authStorage } from "./client";

const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

async function request(path, options = {}) {
  const token = authStorage.getToken();
  if (!token) throw new Error("Authentication required");
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("Unable to connect to the backend");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    if (response.status === 401) authStorage.clearToken();
    throw new Error(data?.message || `Request failed (${response.status})`);
  }
  return data;
}

export const getVolunteerDirectory = () => request("/volunteer/directory");
export const getVolunteerAvailability = () => request("/volunteer/availability");
export const updateVolunteerAvailability = (isAvailable) => request("/volunteer/availability", {
  method: "PATCH",
  body: JSON.stringify({ isAvailable }),
});
