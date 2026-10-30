
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

import { api, authStorage } from "../../lib/api/client";

const ROLE_ROUTES = {
  ngo: "/ngo",
  donor: "/restaurant",
  volunteer: "/volunteer",
};

export default function AuthGuard({
  allowedRole,
  children,
}) {
  const router = useRouter();

  const [authState, setAuthState] = useState({
    status: "checking",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const token = authStorage.getToken();

      if (!token) {
        if (!cancelled) {
          router.replace("/");
        }
        return;
      }

      try {
        // Verify JWT against the actual backend.
        const response = await api.getMe();
        const user = response?.data?.user;

        if (!user) {
          throw new Error("User profile missing");
        }

        const isActive =
          user.isActive !== false &&
          user.is_active !== false;

        if (!isActive) {
          throw new Error("Account disabled");
        }

        if (user.role !== allowedRole) {
          if (!cancelled) {
            const correctRoute = ROLE_ROUTES[user.role];

            router.replace(correctRoute || "/");
          }
          return;
        }

        if (!cancelled) {
          setAuthState({
            status: "authenticated",
            user,
          });
        }
      } catch (error) {
        if (cancelled) return;

        // Only authentication failures should
        // invalidate the stored session.
        if (
          error?.status === 401 ||
          error?.status === 403
        ) {
          authStorage.clearToken();
          router.replace("/");
          return;
        }

        setAuthState({
          status: "error",
          user: null,
        });
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [allowedRole, router]);

  if (authState.status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-ivory p-6 text-center">
        <h1 className="text-xl font-bold text-forest">
          Unable to verify your session
        </h1>

        <p className="mt-3 text-sm text-ink-muted">
          Please check your connection and try again.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-forest px-5 py-3 font-bold text-paper"
        >
          Retry
        </button>
      </main>
    );
  }

  if (authState.status !== "authenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ShieldCheck className="h-12 w-12 text-forest" />
            <Loader2 className="absolute -right-4 -bottom-3 h-6 w-6 animate-spin text-forest" />
          </div>

          <p className="font-bold text-forest">
            Verifying your session...
          </p>

          <p className="text-sm text-ink-muted">
            Connecting securely to ZeroWaste
          </p>
        </div>
      </main>
    );
  }

  return children;
}
