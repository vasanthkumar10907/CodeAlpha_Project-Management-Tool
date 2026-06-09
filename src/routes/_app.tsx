import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const authed = useAppStore.getState().authed;
      if (!authed) throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== "undefined" ? window.location.pathname : "ssr"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
