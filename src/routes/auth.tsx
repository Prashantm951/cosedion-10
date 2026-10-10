import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, isValidEmail } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/sx/Logo";
import { Lock, Mail, ArrowRight, ShieldCheck, KeyRound, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentication — ThreatLens Threat Intelligence" },
      {
        name: "description",
        content: "Sign in to ThreatLens to monitor threats and protect your brand.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const { signIn, signUp, verifyOtp, resendConfirmation } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }

    if (mode === "verify") {
      const cleanOtp = otpCode.trim();
      if (!cleanOtp) {
        toast.error("Please enter the confirmation code from your email.");
        return;
      }
      setBusy(true);
      try {
        const res = await verifyOtp(cleanEmail, cleanOtp);
        if (res.success) {
          toast.success("Account confirmed! Welcome to ThreatLens.");
          navigate({ to: "/dashboard" });
        } else {
          toast.error(res.error || "Invalid confirmation code.");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUp(cleanEmail, password);
        if (res.success) {
          if (res.needsConfirmation) {
            toast.info("Account created! Please enter the confirmation code sent to your email.");
            setMode("verify");
          } else {
            toast.success("Account created successfully!");
            navigate({ to: "/dashboard" });
          }
        } else {
          toast.error(res.error || "Failed to create account.");
        }
      } else {
        const res = await signIn(cleanEmail, password);
        if (res.success) {
          toast.success("Welcome back!");
          navigate({ to: "/dashboard" });
        } else {
          if (res.code === "email_not_confirmed") {
            toast.warning(
              "Email not verified yet. Please enter your confirmation code or request a new one.",
            );
            setMode("verify");
          } else {
            toast.error(res.error || "Failed to sign in");
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendCode() {
    const cleanEmail = email.trim();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      toast.error("Please enter a valid email address first.");
      return;
    }

    setResending(true);
    try {
      const res = await resendConfirmation(cleanEmail);
      if (res.success) {
        toast.success("A new confirmation code has been sent to your email!");
      } else {
        toast.error(res.error || "Failed to resend confirmation email.");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center cyber-bg px-4 py-12">
      <div className="neo-card w-full max-w-md p-7 shadow-[8px_8px_20px_rgba(4,16,13,0.85),-5px_-5px_14px_rgba(42,107,92,0.35)] border border-[#2A6B5C]/50 rounded-2xl">
        <div className="flex items-center justify-between">
          <Logo />
        </div>

        <div className="mt-7">
          <h1 className="text-xl font-bold tracking-tight text-[#E8DCC4]">
            {mode === "signin"
              ? "Sign in to ThreatLens"
              : mode === "signup"
                ? "Create ThreatLens Account"
                : "Verify Your Email"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signin"
              ? "Access brand baselines, look-alike telemetry, and threat reports."
              : mode === "signup"
                ? "Set up cloud brand defense accessible from any device."
                : "Enter the 6-digit confirmation code sent to your email to activate."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-[#C49A45]" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== "verify" && (
              <p className="text-[10px] text-muted-foreground/70">
                Must be a valid email (e.g. yourname@gmail.com)
              </p>
            )}
          </div>

          {mode !== "verify" ? (
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-[#C49A45]" /> Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "signup" && (
                <p className="text-[10px] text-muted-foreground/70">
                  Minimum 6 characters. Use letters, numbers, or symbols.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="otpCode"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5 text-[#C49A45]" /> Confirmation Code / Token
                </Label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-[11px] text-[#C49A45] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                  Resend code
                </button>
              </div>
              <Input
                id="otpCode"
                type="text"
                required
                placeholder="e.g. 123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="font-mono tracking-widest text-base text-center"
              />
              <p className="text-[10px] text-muted-foreground/70">
                Check your inbox (and spam folder) for the confirmation email.
              </p>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            className="w-full h-8 mt-2 font-mono text-xs font-semibold"
            disabled={busy}
          >
            {busy ? (
              "Authenticating..."
            ) : mode === "signin" ? (
              <span className="flex items-center gap-1.5">
                Sign In <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : mode === "signup" ? (
              <span className="flex items-center gap-1.5">
                Create Account <ArrowRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Verify & Sign In <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-center">
          {mode === "signin" && (
            <>
              <div>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Need an account? Sign up here
                </button>
              </div>
              <div>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground/80 hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
                  onClick={() => setMode("verify")}
                >
                  Have a confirmation code? Verify here
                </button>
              </div>
            </>
          )}

          {mode === "signup" && (
            <div>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
                onClick={() => setMode("signin")}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}

          {mode === "verify" && (
            <div className="flex items-center justify-center gap-4 text-xs">
              <button
                type="button"
                className="text-muted-foreground hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
                onClick={() => setMode("signin")}
              >
                ← Back to sign in
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
                onClick={() => setMode("signup")}
              >
                Create new account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
