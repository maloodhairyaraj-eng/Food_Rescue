
export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected";

export type OrganizationType =
  | "ngo"
  | "restaurant"
  | "hostel"
  | "caterer"
  | "other_donor";

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Organization {
  id: string;
  ownerUserId: string;
  name: string;
  organizationType: OrganizationType;
  description: string | null;
  contactPhone: string | null;
  address: string | null;
  location: GeoLocation | null;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;

  // Returned only to owner or admin.
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateOrganizationInput {
  name: string;
  organizationType: OrganizationType;
  description?: string | null;
  contactPhone?: string | null;
  address: string;
  location: GeoLocation;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
  contactPhone?: string | null;
  address?: string;
  location?: GeoLocation;
}
