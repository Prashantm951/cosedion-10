import { createContext, useContext } from "react";
import { Link } from "@tanstack/react-router";
import type { Brand } from "@/lib/brand";

type ShellContext = {
  brand: Brand | null;
  runScan: () => void;
};

const ShellCtx = createContext<ShellContext>({ brand: null, runScan: () => {} });
export const useShell = () => useContext(ShellCtx);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellCtx.Provider value={{ brand: null, runScan: () => {} }}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
            <Link to="/dashboard" className="text-lg font-semibold">
              SentinelX Prototype Tester
            </Link>
            <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
              Auth and database writes disabled for now
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </ShellCtx.Provider>
  );
}
