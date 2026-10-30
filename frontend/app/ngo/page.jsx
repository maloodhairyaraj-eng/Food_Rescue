
"use client";

import AuthGuard from "../../components/auth/AuthGuard";
import LogoutButton from "../../components/auth/LogoutButton";
import NgoDashboard from "../../components/ngo/NgoDashboard";

export default function NgoPage() {
  return (
    <AuthGuard allowedRole="ngo">
      <div className="min-h-screen">
        <div className="flex justify-end border-b border-line bg-paper px-6 py-3">
          <LogoutButton />
        </div>

        <NgoDashboard />
      </div>
    </AuthGuard>
  );
}
