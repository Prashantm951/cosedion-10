import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AppShell } from "@/components/sx/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: PrototypeLayout,
});

function PrototypeLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AppShell>
      <motion.div
        key={path}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Outlet />
      </motion.div>
    </AppShell>
  );
}
