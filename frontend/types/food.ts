
export type FoodType =
  | "veg"
  | "non_veg"
  | "vegan"
  | "mixed";

export type QuantityUnit =
  | "meals"
  | "kg"
  | "packets"
  | "portions";

export type FoodListingStatus =
  | "available"
  | "reserved"
  | "picked_up"
  | "completed"
  | "expired"
  | "cancelled";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface FoodListing {
  id: string;
  donorOrganizationId: string;
  donorName: string;
  title: string;
  description: string | null;
  foodType: FoodType;
  quantity: number;
  quantityUnit: QuantityUnit;
  preparedAt: string | null;
  expiresAt: string;
  pickupStartAt: string;
  pickupEndAt: string;
  pickupAddress: string;
  pickupLocation: GeoLocation;
  status: FoodListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FoodListingFilters {
  foodType?: FoodType;
  limit?: number;
  offset?: number;
}

export interface CreateFoodListingInput {
  title: string;
  description?: string | null;
  foodType: FoodType;
  quantity: number;
  quantityUnit?: QuantityUnit;
  preparedAt?: string | null;
  expiresAt: string;
  pickupStartAt: string;
  pickupEndAt: string;
  pickupAddress: string;
  pickupLocation: GeoLocation;
}

export interface UpdateFoodListingInput {
  title?: string;
  description?: string | null;
  quantity?: number;
  quantityUnit?: QuantityUnit;
  preparedAt?: string | null;
  expiresAt?: string;
  pickupStartAt?: string;
  pickupEndAt?: string;
  pickupAddress?: string;
  pickupLocation?: GeoLocation;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface FoodListingPage {
  listings: FoodListing[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
