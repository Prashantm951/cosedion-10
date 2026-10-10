import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/sx/Logo";
import { Button } from "@/components/ui/button";
import { LogOut, User, Activity } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#C49A45] selection:text-[#123F36]">
      <header className="sticky top-0 z-40 border-b border-[#2A6B5C]/50 bg-[#143f36] shadow-[0_4px_16px_rgba(5,18,15,0.7)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-2.5">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-6">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 hover:opacity-95 transition-opacity"
            >
              <Logo />
              <div className="hidden sm:flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-[#C49A45] font-mono font-semibold leading-none">
                  Threat Analysis Engine
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2 border-l border-[#2A6B5C]/50 pl-5">
              <Link
                to="/dashboard"
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#E8DCC4] bg-[#123830] shadow-[inset_1px_1px_3px_rgba(5,18,15,0.8)] border border-[#2A6B5C]/60 flex items-center gap-1.5"
              >
                <Activity className="h-3 w-3 text-[#C49A45]" />
                Command Center & Pipeline
              </Link>
            </nav>
          </div>

          {/* Right: Auth & Controls */}
          <div className="flex items-center gap-2.5">
            {/* User Profile & Session */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#E8DCC4] bg-[#123830] border border-[#2A6B5C]/60 px-2.5 py-1 rounded-md shadow-[inset_1px_1px_3px_rgba(5,18,15,0.6)]">
                  <User className="h-3 w-3 text-[#C49A45]" />
                  <span className="max-w-[130px] truncate">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-white hover:border-[#e25252]/60"
                >
                  <LogOut className="h-3 w-3" />
                  <span className="hidden sm:inline ml-1">Sign Out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="default" className="h-7 text-xs font-mono">
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
      <footer className="border-t border-[#2A6B5C]/40 bg-[#123F36] py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ThreatLens Threat Analysis Platform · Automated Brand Defense</span>
          <span className="font-mono text-[11px] text-[#C49A45]/80">
            Homoglyph Analysis · Multi-Signal Risk Telemetry
          </span>
        </div>
      </footer>
    </div>
  );
}
