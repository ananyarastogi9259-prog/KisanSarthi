// ============================================================
// frontend/src/lib/auth/context.tsx
// Supabase Authentication Context for KisanSarthi
// ============================================================
// Replaces previous mock local JSON authentication with real
// Supabase Auth while preserving the existing useAuth() interface.
// - Supports email/password login and registration
// - Listens to onAuthStateChange for seamless session lifecycle
// - Provides current user identity and loading state
// - Ensures Bearer tokens can be retrieved for backend API requests
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export type AuthActionResult =
  | { ok: true; user: AuthUser; confirmationRequired?: boolean }
  | {
      ok: false;
      code:
        | "email_taken"
        | "invalid_credentials"
        | "invalid_input"
        | "network_error"
        | "email_not_confirmed"
        | "confirmation_required";
      message?: string;
    };

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (name: string, email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Normalizes a Supabase User object into our application AuthUser shape
 */
function mapSupabaseUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = typeof meta?.['full_name'] === "string" ? meta['full_name'].trim() : "";
  const metaName = typeof meta?.['name'] === "string" ? meta['name'].trim() : "";
  const name = fullName || metaName || user.email?.split("@")[0] || "Farmer";

  return {
    id: user.id,
    email: user.email || "",
    name,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data?.session?.user) {
        setUser(null);
      } else {
        setUser(mapSupabaseUser(data.session.user));
      }
    } catch (err) {
      console.error("Failed to restore session:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session restoration
    void refresh();

    // Listen to live auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
        let { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        // If email is not confirmed, auto-confirm via backend and retry sign in
        const msg = (error?.message || "").toLowerCase();
        const errCode = (error as { code?: string })?.code || "";
        if (errCode === "email_not_confirmed" || msg.includes("email not confirmed")) {
          const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
          await fetch(`${apiUrl}/auth/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim() }),
          }).catch(() => null);

          // Retry sign in after auto-confirmation
          const retry = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          data = retry.data;
          error = retry.error;
        }

        if (error || !data?.user) {
          return { ok: false, code: "invalid_credentials" };
        }

        const authUser = mapSupabaseUser(data.user)!;
        setUser(authUser);
        return { ok: true, user: authUser };
      } catch {
        return { ok: false, code: "network_error" };
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<AuthActionResult> => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const cleanEmail = email.trim();
        const cleanName = name.trim();

        // 1. Register & auto-confirm via backend API (bypasses Supabase email rate limits)
        let backendSucceeded = false;
        let serverErrorMsg = "";
        try {
          const res = await fetch(`${apiUrl}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
          });
          const json = await res.json().catch(() => null);
          if (res.ok && json?.success) {
            backendSucceeded = true;
          } else if (json?.message) {
            serverErrorMsg = json.message;
          }
        } catch (e) {
          console.warn("Backend register API unreachable, attempting direct Supabase signup:", e);
        }

        // If backend returned a specific validation error, surface it directly to the user
        if (!backendSucceeded && serverErrorMsg) {
          return { ok: false, code: "invalid_input", message: serverErrorMsg };
        }

        // 2. Sign in to obtain active Supabase JWT session
        let signInData: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["data"] = { user: null, session: null };
        let signInError: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>["error"] = null;
        {
          const res1 = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          signInData = res1.data;
          signInError = res1.error;
        }

        // If sign-in failed right after backend confirmed the account, retry once after a short delay
        if (backendSucceeded && (!signInData?.user || !signInData?.session)) {
          await new Promise((r) => setTimeout(r, 1200));
          const res2 = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
          signInData = res2.data;
          signInError = res2.error;
        }

        if (signInData?.user && signInData?.session) {
          const authUser = mapSupabaseUser(signInData.user)!;
          setUser(authUser);
          return { ok: true, user: authUser };
        }

        // If backend confirmed the account but sign-in still fails, guide user to login page
        if (backendSucceeded) {
          return {
            ok: false,
            code: "confirmation_required",
            message: "Account created! Please go to Login and sign in with your email and password.",
          };
        }

        // 3. Fallback direct Supabase signUp if backend was bypassed
        if (!backendSucceeded) {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: { data: { full_name: cleanName } },
          });

          if (error) {
            const msg = (error.message || "").toLowerCase();
            if (msg.includes("already registered") || msg.includes("user already exists")) {
              return { ok: false, code: "email_taken" };
            }
            return { ok: false, code: "network_error" };
          }

          if (data?.user && data?.session) {
            const authUser = mapSupabaseUser(data.user)!;
            setUser(authUser);
            return { ok: true, user: authUser };
          }
        }

        if (signInError) {
          return { ok: false, code: "invalid_credentials" };
        }

        return { ok: false, code: "network_error" };
      } catch (err) {
        console.error("Register exception:", err);
        return { ok: false, code: "network_error" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}
