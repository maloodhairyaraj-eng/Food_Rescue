
export type PickupRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export type AssignmentStatus =
  | "assigned"
  | "picked_up"
  | "completed"
  | "cancelled";

export interface PickupRequest {
  id: string;
  foodListingId: string;
  ngoOrganizationId: string;
  requestedByUserId: string;
  requestedQuantity: number;
  status: PickupRequestStatus;
  notes: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  foodTitle: string;
  listingStatus: string;
  expiresAt: string;
  ngoName: string;
  donorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface VolunteerAssignment {
  id: string;
  pickupRequestId: string;
  volunteerUserId: string;
  assignedByUserId: string;
  status: AssignmentStatus;
  assignedAt: string;
  pickedUpAt: string | null;
  completedAt: string | null;
  foodListingId: string;
  foodTitle: string;
  pickupStatus: string;
  listingStatus: string;
  ngoName: string;
  donorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
