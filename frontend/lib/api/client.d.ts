
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}

export interface AuthUser {
    id: string;
    full_name?: string;
    fullName?: string;
    email: string;
    role: "ngo" | "donor" | "volunteer" | "admin";
    is_active?: boolean;
    isActive?: boolean;
}

export interface LoginData {
    accessToken: string;
    user?: AuthUser;
}

export interface RegisterData {
    user: AuthUser;
}

export class ApiError extends Error {
    status: number;
    details: Array<{
        field?: string;
        message: string;
    }>;
}

export const authStorage: {
    getToken(): string | null;
    setToken(token: string): void;
    clearToken(): void;
    isAuthenticated(): boolean;
};

export const api: {
    login(credentials: {
        email: string;
        password: string;
    }): Promise<ApiResponse<LoginData>>;


    getVolunteerDirectory(): Promise<
        ApiResponse<{
            volunteers: Array<{
                id: string;
                fullName: string;
                vehicleType: string | null;
                isAvailable: boolean;
                isBusy: boolean;
                canAssign: boolean;
            }>;
        }>
    >;

    getVolunteerAvailability(): Promise<
        ApiResponse<{
            availability: {
                isAvailable: boolean;
                vehicleType: string | null;
            };
        }>
    >;

    updateVolunteerAvailability(
        isAvailable: boolean
    ): Promise<
        ApiResponse<{
            availability: {
                isAvailable: boolean;
                vehicleType: string | null;
            };
        }>
    >;


    register(payload: {
        fullName: string;
        email: string;
        password: string;
        role: "ngo" | "donor" | "volunteer";
    }): Promise<ApiResponse<RegisterData>>;

    getMe(): Promise<ApiResponse<{ user: AuthUser }>>;

    getMyOrganization(): Promise<ApiResponse<unknown>>;

    createOrganization(
        payload: unknown
    ): Promise<ApiResponse<unknown>>;

    createFoodListing(
        payload: unknown
    ): Promise<ApiResponse<unknown>>;

    getMyFoodListings(): Promise<ApiResponse<unknown>>;

    cancelFoodListing(
        id: string
    ): Promise<ApiResponse<unknown>>;

    getNearbyFood(
        radiusKm?: number
    ): Promise<ApiResponse<unknown>>;

    getMatchingFood(
        params?: Record<string, string | number>
    ): Promise<ApiResponse<unknown>>;

    createPickupRequest(
        foodListingId: string,
        notes?: string
    ): Promise<ApiResponse<unknown>>;

    getIncomingPickups(): Promise<ApiResponse<unknown>>;

    getMyPickupRequests(): Promise<ApiResponse<unknown>>;

    approvePickup(
        id: string
    ): Promise<ApiResponse<unknown>>;

    rejectPickup(
        id: string,
        reason: string
    ): Promise<ApiResponse<unknown>>;

    assignVolunteer(
        pickupId: string,
        volunteerUserId: string
    ): Promise<ApiResponse<unknown>>;

    getVolunteerAssignments(): Promise<ApiResponse<unknown>>;

    getVolunteerAssignmentById(
        id: string
    ): Promise<ApiResponse<unknown>>;

    updateAssignmentStatus(
        id: string,
        status: "picked_up" | "completed"
    ): Promise<ApiResponse<unknown>>;
};
