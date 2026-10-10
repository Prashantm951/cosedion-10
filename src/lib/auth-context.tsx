import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
};

type RegisteredAccount = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
});

const CURRENT_SESSION_KEY = "threatlens_active_user_session";
const LOCAL_ACCOUNTS_KEY = "threatlens_registered_accounts";

// Cloud accounts registry endpoints for cross-device authentication
const PRIMARY_REGISTRY_ID = "ff808181a09d98f701a1276bc76037cc";
const BACKUP_REGISTRY_ID = "ff808181a09d98f701a1276c4ec037cf";
const CLOUD_API_BASE = "https://api.restful-api.dev/objects";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) return false;
  if (trimmed.includes("..")) return false;
  return true;
}

/**
 * Standard SHA-256 cryptographic hash using Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`salt_threatlens_${password}`);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback below
    }
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `fb_${hash}`;
}

function getLocalAccounts(): Record<string, RegisteredAccount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAccount(account: RegisteredAccount) {
  if (typeof window === "undefined") return;
  try {
    const accounts = getLocalAccounts();
    accounts[account.email.toLowerCase()] = account;
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

/**
 * Fetches verified accounts from the cloud registry
 */
async function fetchCloudAccounts(): Promise<Record<string, RegisteredAccount>> {
  const local = getLocalAccounts();
  const merged: Record<string, RegisteredAccount> = { ...local };

  const tryFetch = async (id: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${CLOUD_API_BASE}/${id}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.data?.accounts as Record<string, RegisteredAccount>) || null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  };

  const primaryAccounts = await tryFetch(PRIMARY_REGISTRY_ID);
  if (primaryAccounts) {
    Object.assign(merged, primaryAccounts);
  } else {
    const backupAccounts = await tryFetch(BACKUP_REGISTRY_ID);
    if (backupAccounts) {
      Object.assign(merged, backupAccounts);
    }
  }

  // Update local cache with latest cloud accounts
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }

  return merged;
}

/**
 * Persists an account to the cloud registry for cross-device authentication
 */
async function persistAccountToCloud(account: RegisteredAccount): Promise<void> {
  // Always update local storage first
  saveLocalAccount(account);

  const saveToRegistry = async (id: string) => {
    try {
      // Fetch latest
      const getRes = await fetch(`${CLOUD_API_BASE}/${id}`);
      let existingAccounts: Record<string, RegisteredAccount> = {};
      if (getRes.ok) {
        const json = await getRes.json();
        existingAccounts = json?.data?.accounts || {};
      }
      existingAccounts[account.email.toLowerCase()] = account;

      // Update registry
      await fetch(`${CLOUD_API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "threatlens_cloud_accounts",
          data: { accounts: existingAccounts },
        }),
      });
    } catch {
      // Ignore background cloud sync error
    }
  };

  // Run in parallel for redundancy
  await Promise.allSettled([
    saveToRegistry(PRIMARY_REGISTRY_ID),
    saveToRegistry(BACKUP_REGISTRY_ID),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Instant hydration from cached session
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

    // 2. Check remote Supabase session
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
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 3. Pre-fetch cloud accounts in background
    fetchCloudAccounts().catch(() => {});
  }, []);

  /**
   * Cross-device Sign In
   */
  const signIn = async (
    emailInput: string,
    passwordInput: string,
  ): Promise<{ success: boolean; error?: string }> => {
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

    // 1. Try Supabase Auth
    try {
      const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!supaError && supaData?.user) {
        const authUser: AuthUser = {
          id: supaData.user.id,
          email: supaData.user.email ?? email,
        };
        setUser(authUser);
        if (typeof window !== "undefined") {
          localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
        }
        return { success: true };
      }
    } catch {
      // Continue to cloud registry
    }

    // 2. Check Cloud Accounts Registry (works across all devices & Vercel)
    const accounts = await fetchCloudAccounts();
    const account = accounts[email];

    if (!account) {
      return {
        success: false,
        error: "Account not found. Please create an account first by clicking 'Sign up here'.",
      };
    }

    const providedHash = await hashPassword(password);
    if (account.passwordHash !== providedHash) {
      return {
        success: false,
        error: "Incorrect password. Please verify your credentials and try again.",
      };
    }

    // Credentials match!
    const authUser: AuthUser = {
      id: account.id,
      email: account.email,
    };
    setUser(authUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
    }

    return { success: true };
  };

  /**
   * Cross-device Sign Up
   */
  const signUp = async (
    emailInput: string,
    passwordInput: string,
  ): Promise<{ success: boolean; error?: string }> => {
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

    // Check if account already exists in cloud registry
    const accounts = await fetchCloudAccounts();
    if (accounts[email]) {
      return {
        success: false,
        error: "An account with this email already exists. Please sign in instead.",
      };
    }

    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `usr-${Date.now().toString(36)}`;

    const passwordHash = await hashPassword(password);
    const newAccount: RegisteredAccount = {
      id: newId,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Save account to cloud registry and local storage
    await persistAccountToCloud(newAccount);

    // Also attempt Supabase registration in background
    try {
      await supabase.auth.signUp({ email, password });
    } catch {
      // ignore
    }

    // Log the user in immediately
    const authUser: AuthUser = {
      id: newId,
      email,
    };
    setUser(authUser);
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(authUser));
    }

    return { success: true };
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
