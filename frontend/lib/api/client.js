// frontend/lib/api/client.js
import { mockFoodListings, mockNgoProfile } from '../mocks/fixtures';

// We use the environment variable as required, falling back to the proposed URL
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1';

// Toggle this to false once the backend developer confirms endpoints are ready
const USE_MOCKS = true; 

export const api = {
  getFoodListings: async (lat, lng, radius) => {
    if (USE_MOCKS) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, data: mockFoodListings };
    }
    const res = await fetch(`${BASE_URL}/food-listings?lat=${lat}&lng=${lng}&radius=${radius}`);
    return res.json();
  },

  requestPickup: async (listingId, notes) => {
    if (USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Pickup requested successfully!' };
    }
    const res = await fetch(`${BASE_URL}/pickup-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId, notes })
    });
    return res.json();
  },

  getProfile: async () => {
    if (USE_MOCKS) {
      return { success: true, data: mockNgoProfile };
    }
    const res = await fetch(`${BASE_URL}/ngo/me`);
    return res.json();
  }
};