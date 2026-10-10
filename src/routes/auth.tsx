import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth, isValidEmail } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/sx/Logo";
import { ShieldCheck, Lock, Mail, ArrowRight, Database } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentication — SentinelX Digital Risk Protection" },
      { name: "description", content: "Sign in to SentinelX to monitor and protect your brand." },
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
        const res = await signUp(email, password);
        if (res.success) {
          toast.success("Account created successfully!");
          navigate({ to: "/dashboard" });
        } else {
          toast.error(res.error || "Failed to create account");
        }
      } else {
        const res = await signIn(email, password);
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
      <div className="glass w-full max-w-md rounded-2xl border border-border p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs text-primary font-mono">
            <Database className="h-3 w-3" />
            <span>PostgreSQL</span>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "signin" ? "Sign in to SentinelX" : "Create SentinelX Account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access brand baselines, look-alike scanning, and scan reports."
              : "Set up enterprise brand protection and automated candidate detection."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email Address
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background/60"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Must be a valid email (e.g. yourname@gmail.com)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Password
            </Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-background/60"
            />
          </div>

          <Button type="submit" className="w-full h-10 mt-2 font-medium" disabled={busy}>
            {busy ? (
              "Authenticating..."
            ) : mode === "signin" ? (
              <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
            ) : (
              <span className="flex items-center gap-2">Create Account <ArrowRight className="h-4 w-4" /></span>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
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
