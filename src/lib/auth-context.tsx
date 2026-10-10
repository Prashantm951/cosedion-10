import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  verifyOtp: async () => ({ success: false }),
  resendConfirmation: async () => ({ success: false }),
  signOut: async () => {},
});

const CURRENT_SESSION_KEY = "threatlens_active_user_session";
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) return false;
  if (trimmed.includes("..")) return false;
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial cached session for instant UX
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(CURRENT_SESSION_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.email && isValidEmail(parsed.email)) {
            setUser(parsed);
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Fetch active Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email && isValidEmail(session.user.email)) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email,
          };
          setUser(authUser);
          if (typeof window !== "undefined") {
            localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
          }
        } else {
          // If no active Supabase session, clear stale cache
          if (typeof window !== "undefined") {
            localStorage.removeItem(CURRENT_SESSION_KEY);
          }
          setUser(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 3. Subscribe to real-time auth changes (e.g. email verification link clicks)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email && isValidEmail(session.user.email)) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email,
        };
        setUser(authUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
        }
      } else if (!session) {
        setUser(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(CURRENT_SESSION_KEY);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Remote Supabase Sign In:
   * Works across all devices, browsers, and deployments.
   */
  const signIn = async (
    emailInput: string,
    passwordInput: string,
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: "Please enter both email and password." };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        error: "Please enter a valid email address (e.g. name@gmail.com).",
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
        };
        setUser(authUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
        }
        return { success: true };
      }

      if (error) {
        const errCode = (error as { code?: string }).code || "";
        const errMsg = error.message.toLowerCase();

        if (errCode === "email_not_confirmed" || errMsg.includes("email not confirmed")) {
          return {
            success: false,
            error:
              "Email is not confirmed yet. Please verify your email or enter your confirmation code.",
            code: "email_not_confirmed",
          };
        }

        if (errCode === "invalid_credentials" || errMsg.includes("invalid login credentials")) {
          return {
            success: false,
            error:
              "Incorrect email or password. Please verify your credentials or create an account.",
            code: "invalid_credentials",
          };
        }

        return {
          success: false,
          error: error.message,
          code: errCode,
        };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      return { success: false, error: message };
    }

    return { success: false, error: "Authentication failed. Please try again." };
  };

  /**
   * Remote Supabase Sign Up:
   * Registers account with cloud backend so it is accessible from any device.
   */
  const signUp = async (
    emailInput: string,
    passwordInput: string,
  ): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> => {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!email || !password) {
      return { success: false, error: "Please provide an email and password." };
    }

    if (!isValidEmail(email)) {
      return {
        success: false,
        error: "Please enter a valid email address (e.g. name@gmail.com).",
      };
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    try {
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        const errCode = (error as { code?: string }).code || "";
        const errMsg = error.message.toLowerCase();

        if (errCode === "weak_password" || errMsg.includes("weak")) {
          return {
            success: false,
            error:
              "Password is too simple or commonly compromised. Please choose a stronger password.",
          };
        }

        if (errCode === "user_already_exists" || errMsg.includes("already registered")) {
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead.",
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      // If Supabase has email confirmation disabled, user is immediately logged in
      if (data?.session && data?.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? email,
        };
        setUser(authUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
        }
        return { success: true, needsConfirmation: false };
      }

      // Supabase created the user in cloud database, but email confirmation is required
      return { success: true, needsConfirmation: true };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to register account. Please try again.";
      return { success: false, error: message };
    }
  };

  /**
   * Verifies the 6-digit confirmation code sent to the user's email
   */
  const verifyOtp = async (
    emailInput: string,
    tokenInput: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const email = emailInput.trim().toLowerCase();
    const token = tokenInput.trim();

    if (!email || !token) {
      return { success: false, error: "Please enter the confirmation code." };
    }

    try {
      // Try signup OTP first
      let res = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });

      // If signup type failed, try email type
      if (res.error) {
        res = await supabase.auth.verifyOtp({
          email,
          token,
          type: "email",
        });
      }

      if (res.error) {
        return {
          success: false,
          error: res.error.message || "Invalid or expired confirmation code.",
        };
      }

      if (res.data?.user) {
        const authUser: AuthUser = {
          id: res.data.user.id,
          email: res.data.user.email ?? email,
        };
        setUser(authUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
        }
        return { success: true };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to verify confirmation code.";
      return { success: false, error: message };
    }
  };

  /**
   * Resends the confirmation email
   */
  const resendConfirmation = async (
    emailInput: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !isValidEmail(email)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend confirmation email.";
      return { success: false, error: message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_SESSION_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, verifyOtp, resendConfirmation, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
