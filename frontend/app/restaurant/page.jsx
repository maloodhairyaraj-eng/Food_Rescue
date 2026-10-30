
"use client";

import AuthGuard from "../../components/auth/AuthGuard";
import LogoutButton from "../../components/auth/LogoutButton";
import RestaurantDashboard from "../../components/restaurant/RestaurantDashboard";

export default function RestaurantPage() {
  return (
    <AuthGuard allowedRole="donor">
      <div className="min-h-screen">
        <div className="flex justify-end border-b border-line bg-paper px-6 py-3">
          <LogoutButton />
        </div>

        <RestaurantDashboard />
      </div>
    </AuthGuard>
  );
}
