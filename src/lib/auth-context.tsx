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

const CURRENT_SESSION_KEY = "sentinelx_active_user_session";
const REGISTERED_ACCOUNTS_KEY = "sentinelx_registered_accounts";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) return false;
  if (trimmed.includes("..")) return false;
  return true;
}

function cleanInvalidAccounts() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    if (raw) {
      const accounts = JSON.parse(raw);
      let changed = false;
      for (const key of Object.keys(accounts)) {
        if (!isValidEmail(key)) {
          delete accounts[key];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    }
    const sessionRaw = localStorage.getItem(CURRENT_SESSION_KEY);
    if (sessionRaw) {
      const sess = JSON.parse(sessionRaw);
      if (sess && !isValidEmail(sess.email)) {
        localStorage.removeItem(CURRENT_SESSION_KEY);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * SHA-256 password hash using standard Web Crypto API
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback string hash
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function getStoredAccounts(): Record<string, RegisteredAccount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredAccount(account: RegisteredAccount) {
  if (typeof window === "undefined") return;
  try {
    const accounts = getStoredAccounts();
    accounts[account.email.toLowerCase()] = account;
    localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0. Clean out any malformed accounts or sessions (e.g. "addsff")
    cleanInvalidAccounts();

    // 1. Check local session
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CURRENT_SESSION_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && isValidEmail(parsed.email)) {
            setUser(parsed);
          } else {
            localStorage.removeItem(CURRENT_SESSION_KEY);
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Check Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email && isValidEmail(session.user.email)) {
          const u = {
            id: session.user.id,
            email: session.user.email,
          };
          setUser(u);
          if (typeof window !== "undefined") {
            localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(u));
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  /**
   * STRICT SIGN IN:
   * Only allows users who have created an account.
   * If user doesn't exist, returns "Account does not exist".
   * If password doesn't match, returns "Incorrect password".
   */
  const signIn = async (
    emailInput: string,
    passwordInput: string
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

    // 1. Try remote Supabase authentication
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
      // Continue to check registered accounts registry
    }

    // 2. Check verified registered accounts registry
    const accounts = getStoredAccounts();
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

    // Credentials match registered account
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
   * STRICT SIGN UP:
   * Registers a new account with email and password.
   * Prevents duplicate registration if account already exists.
   */
  const signUp = async (
    emailInput: string,
    passwordInput: string
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

    const accounts = getStoredAccounts();
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

    // Save to registered accounts database
    saveStoredAccount(newAccount);

    // Also attempt registration on Supabase Auth
    try {
      await supabase.auth.signUp({ email, password });
    } catch {
      // ignore
    }

    // Log the newly registered user in
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
