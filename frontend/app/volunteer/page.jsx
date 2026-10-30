"use client";

import AuthGuard from "../../components/auth/AuthGuard";
import VolunteerDashboard from "../../components/volunteer/VolunteerDashboard";
import VolunteerAvailability from "../../components/volunteer/VolunteerAvailability";

export default function VolunteerPage() {
  return (
    <AuthGuard allowedRole="volunteer">
      <VolunteerAvailability />
      <VolunteerDashboard />
    </AuthGuard>
  );
}
