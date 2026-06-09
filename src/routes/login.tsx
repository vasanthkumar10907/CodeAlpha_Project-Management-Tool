import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { KanbanSquare, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Plane" },
      { name: "description", content: "Sign in to your Plane workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("alex@team.io");
  const [password, setPassword] = useState("••••••••");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 p-12 flex flex-col">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary grid place-items-center"><KanbanSquare className="size-4 text-primary-foreground" /></div>
            <span className="font-display font-bold text-lg">Plane</span>
          </Link>
          <div className="my-auto">
            <h2 className="font-display font-bold text-4xl text-balance leading-tight max-w-md">Plan, track, and ship work — beautifully.</h2>
            <p className="mt-4 text-muted-foreground max-w-md">Welcome back. Pick up where you left off.</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center p-6 lg:p-12"
      >
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-primary grid place-items-center"><KanbanSquare className="size-4 text-primary-foreground" /></div>
            <span className="font-display font-bold text-lg">Plane</span>
          </Link>
          <h1 className="font-display font-bold text-3xl">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Welcome back to your workspace.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
              navigate({ to: "/dashboard" });
            }}
            className="mt-8 space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11">
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            No account? <Link to="/register" className="text-primary font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
