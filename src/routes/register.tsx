import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { KanbanSquare, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Get started — Plane" },
      { name: "description", content: "Create your Plane workspace in seconds." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-center p-6 lg:p-12 order-2 lg:order-1"
      >
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg bg-primary grid place-items-center"><KanbanSquare className="size-4 text-primary-foreground" /></div>
            <span className="font-display font-bold text-lg">Plane</span>
          </Link>
          <h1 className="font-display font-bold text-3xl">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Start planning in under a minute.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login();
              navigate({ to: "/dashboard" });
            }}
            className="mt-8 space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11">
              Create account <ArrowRight className="size-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>

      <div className="hidden lg:block hero-gradient relative overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 p-12 flex flex-col">
          <Link to="/" className="flex items-center gap-2 self-end">
            <div className="size-8 rounded-lg bg-primary grid place-items-center"><KanbanSquare className="size-4 text-primary-foreground" /></div>
            <span className="font-display font-bold text-lg">Plane</span>
          </Link>
          <div className="my-auto">
            <h2 className="font-display font-bold text-4xl text-balance leading-tight max-w-md">A new home for your team's best work.</h2>
            <p className="mt-4 text-muted-foreground max-w-md">Free during preview. No credit card required.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
