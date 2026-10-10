import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useBrand, useSession } from "@/lib/data";
import { AppShell } from "@/components/sx/AppShell";
import { Skel } from "@/components/sx/primitives";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !session) navigate({ to: "/auth" }); }, [loading, session]);
  if (loading || !session) return <div className="min-h-screen cyber-bg p-8"><Skel className="h-10 w-60" /><Skel className="mt-6 h-64 w-full" /></div>;
  return <BrandGate />;
}

function BrandGate() {
  const { brand, isLoading } = useBrand();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { if (!isLoading && !brand) navigate({ to: "/onboarding" }); }, [isLoading, brand]);
  if (isLoading || !brand) return <div className="min-h-screen cyber-bg p-8"><Skel className="h-10 w-60" /><Skel className="mt-6 h-64 w-full" /></div>;
  return (
    <AppShell>
      <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Outlet />
      </motion.div>
    </AppShell>
  );
}
