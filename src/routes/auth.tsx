import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, isValidEmail } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/sx/Logo";
import { Lock, Mail, ArrowRight } from "lucide-react";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      toast.error("Please enter a valid email address (e.g. name@gmail.com).");
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
          toast.success("Account created successfully! Welcome to ThreatLens.");
          navigate({ to: "/dashboard" });
        } else {
          toast.error(res.error || "Failed to create account.");
        }
      } else {
        const res = await signIn(cleanEmail, password);
        if (res.success) {
          toast.success("Welcome back!");
          navigate({ to: "/dashboard" });
        } else {
          toast.error(res.error || "Failed to sign in");
        }
      }
    } finally {
      setBusy(false);
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
            {mode === "signin" ? "Sign in to ThreatLens" : "Create ThreatLens Account"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signin"
              ? "Access brand baselines, look-alike telemetry, and threat reports."
              : "Set up brand defense accessible across all devices."}
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
            <p className="text-[10px] text-muted-foreground/70">
              Must be a valid email (e.g. yourname@gmail.com)
            </p>
          </div>

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
                Minimum 6 characters. Accessible on all devices.
              </p>
            )}
          </div>

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
            ) : (
              <span className="flex items-center gap-1.5">
                Create Account <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-[#C49A45] transition-colors underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "Need an account? Sign up here"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
