
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authStorage } from "../../lib/api/client";

export default function LogoutButton({
  className = "",
  showIcon = true,
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    // Remove JWT from the current browser session.
    authStorage.clearToken();

    // Navigate to the login screen.
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className={
        `inline-flex items-center justify-center gap-2 ` +
        `rounded-xl border border-line px-4 py-2.5 ` +
        `text-sm font-bold text-forest ` +
        `hover:bg-sage-light/30 ` +
        `disabled:opacity-50 ${className}`
      }
    >
      {showIcon && <LogOut className="h-4 w-4" />}

      {loggingOut ? "Signing out..." : "Logout"}
    </button>
  );
}
