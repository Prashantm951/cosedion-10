import { createContext, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, ChevronsUpDown, FileText, LayoutDashboard, LogOut, Menu, Network, PanelLeftClose, PanelLeftOpen, Radar, Search, Settings, ShieldAlert, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBrand, useThreats, useInvalidate, type Brand } from "@/lib/data";
import { ScanOverlay } from "./ScanOverlay";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PlatformIcon, SeverityBadge } from "./primitives";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/threats", label: "Threats", icon: ShieldAlert },
  { to: "/graph", label: "Threat Graph", icon: Network },
  { to: "/apps", label: "Suspicious Apps", icon: Smartphone },
  { to: "/reports", label: "Takedowns", icon: FileText },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

type Ctx = { brand: Brand | null; runScan: () => void };
const ShellCtx = createContext<Ctx>({ brand: null, runScan: () => {} });
export const useShell = () => useContext(ShellCtx);

function NavList({ collapsed, onNav }: { collapsed?: boolean; onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = path === n.to || path.startsWith(n.to + "/");
        return (
          <Link key={n.to} to={n.to} onClick={onNav} title={n.label} className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground", collapsed && "justify-center px-0")}>
            {active && <motion.span layoutId="nav-glow" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary glow-primary" />}
            <n.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            {!collapsed && <span>{n.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { brand, brands, switchBrand } = useBrand();
  const threats = useThreats(brand?.id);
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [scan, setScan] = useState(false);
  const [email, setEmail] = useState("");
  const [seenAt, setSeenAt] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    setSeenAt(Number(localStorage.getItem("sx.seen") ?? 0));
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((c) => !c); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const unread = (threats.data ?? []).filter((t) => t.severity === "critical" && new Date(t.detected_at).getTime() > seenAt);
  const runScan = () => setScan(true);

  return (
    <ShellCtx.Provider value={{ brand, runScan }}>
      <div className="flex min-h-screen w-full cyber-bg">
        <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar/80 p-3 backdrop-blur md:flex transition-[width] duration-200", collapsed ? "w-16" : "w-60")}>
          <div className={cn("mb-6 flex items-center px-2 pt-1", collapsed ? "justify-center" : "justify-between")}>
            {!collapsed && <Logo />}
            <button onClick={() => setCollapsed(!collapsed)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Toggle sidebar">
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <NavList collapsed={collapsed} />
          <div className="mt-auto">
            <Button onClick={runScan} className={cn("w-full", collapsed && "px-0")} title="Run scan"><Radar />{!collapsed && "Run Scan"}</Button>
          </div>
        </aside>

        <Sheet open={mobile} onOpenChange={setMobile}>
          <SheetContent side="left" className="w-64 border-border bg-sidebar p-4">
            <SheetTitle className="mb-6"><Logo /></SheetTitle>
            <NavList onNav={() => setMobile(false)} />
            <Button onClick={() => { setMobile(false); runScan(); }} className="mt-6 w-full"><Radar />Run Scan</Button>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
            <button className="rounded-md p-1.5 text-muted-foreground md:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2.5 py-1.5 text-sm hover:border-primary/40">
                {brand?.logo_url ? <img src={brand.logo_url} alt="" className="h-5 w-5 rounded" /> : <span className="h-5 w-5 rounded bg-gradient-brand" />}
                <span className="max-w-[120px] truncate font-medium">{brand?.name ?? "No brand"}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="label-caps">Brands</DropdownMenuLabel>
                {brands.map((b) => <DropdownMenuItem key={b.id} onClick={() => { switchBrand(b.id); invalidate("threats", "apps", "reports"); }}>{b.name}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>+ Add brand</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => setCmd(true)} className="ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 text-sm text-muted-foreground hover:border-primary/40 sm:ml-4 sm:mr-auto">
              <Search className="h-4 w-4" /><span className="hidden sm:inline">Search threats, pages…</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
            </button>
            <DropdownMenu onOpenChange={(o) => { if (!o) { const now = Date.now(); localStorage.setItem("sx.seen", String(now)); setSeenAt(now); } }}>
              <DropdownMenuTrigger className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Notifications, ${unread.length} unread`}>
                <Bell className="h-4 w-4" />
                {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] font-bold text-destructive-foreground glow-critical">{unread.length}</span>}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="label-caps">Critical alerts</DropdownMenuLabel>
                {(threats.data ?? []).filter((t) => t.severity === "critical").slice(0, 6).map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => navigate({ to: "/threats/$id", params: { id: t.id } })} className="gap-2">
                    <PlatformIcon platform={t.platform} /><span className="truncate font-mono text-xs">@{t.handle}</span><span className="ml-auto font-mono text-xs text-critical">{t.risk_score}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground" aria-label="User menu">{email[0]?.toUpperCase() ?? "U"}</DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-mono text-xs">{email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="h-4 w-4" />Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}><LogOut className="h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      <CommandDialog open={cmd} onOpenChange={setCmd}>
        <CommandInput placeholder="Search threats, jump to a page, or run a scan…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setCmd(false); runScan(); }}><Radar className="h-4 w-4" />Run scan</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Pages">
            {NAV.map((n) => <CommandItem key={n.to} onSelect={() => { setCmd(false); navigate({ to: n.to }); }}><n.icon className="h-4 w-4" />{n.label}</CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Threats">
            {(threats.data ?? []).map((t) => (
              <CommandItem key={t.id} value={`${t.handle} ${t.display_name} ${t.platform}`} onSelect={() => { setCmd(false); navigate({ to: "/threats/$id", params: { id: t.id } }); }}>
                <PlatformIcon platform={t.platform} /><span className="font-mono text-xs">@{t.handle}</span><span className="ml-auto"><SeverityBadge severity={t.severity} /></span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <ScanOverlay open={scan} onClose={() => setScan(false)} brand={brand} onDone={() => invalidate("threats")} />
    </ShellCtx.Provider>
  );
}
