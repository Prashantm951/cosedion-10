import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/sx/Logo";
import { Button } from "@/components/ui/button";
import { Database, ShieldCheck, LogOut, User, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { checkDatabaseConnection } from "@/lib/db";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latencyMs?: number }>({
    connected: true,
  });

  useEffect(() => {
    checkDatabaseConnection().then((res) => {
      setDbStatus({ connected: res.connected, latencyMs: res.latencyMs });
    });
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Logo />
              <div className="hidden sm:flex flex-col">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono leading-none">
                  Digital Risk Protection
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 border-l border-border pl-5">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-foreground bg-accent/60 transition-colors"
              >
                Scan & Monitoring Pipeline
              </Link>
            </nav>
          </div>

          {/* Right: PostgreSQL Status, Auth & Controls */}
          <div className="flex items-center gap-3">
            {/* Live Database status pill */}
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <Database className="h-3 w-3" />
              <span className="hidden sm:inline">PostgreSQL</span>
              <span className="text-[10px] text-emerald-500/80">
                {dbStatus.latencyMs ? `${dbStatus.latencyMs}ms` : "Active"}
              </span>
            </div>

            {/* User Profile & Session */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-surface border border-border px-2.5 py-1 rounded-md">
                  <User className="h-3 w-3 text-primary" />
                  <span className="max-w-[130px] truncate">{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1.5">Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline" className="h-8 text-xs font-mono">
                  <Link to="/auth">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SentinelX Digital Risk Protection Platform · Automated Brand Defense</span>
          <span className="font-mono text-[11px] text-muted-foreground/80">
            PostgreSQL · Homoglyph Analysis · Multi-Signal Risk Scoring
          </span>
        </div>
      </footer>
    </div>
  );
}
