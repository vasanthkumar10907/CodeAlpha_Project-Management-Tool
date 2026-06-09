import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, KanbanSquare, Users, Bell, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plane — Premium Project Management" },
      { name: "description", content: "Plan, track, and ship work with your team. A premium Kanban-style project management tool with beautiful design." },
      { property: "og:title", content: "Plane — Premium Project Management" },
      { property: "og:description", content: "Plan, track, and ship work with your team." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: KanbanSquare, title: "Kanban boards", desc: "Drag-and-drop tasks across To Do, In Progress, Review and Done." },
  { icon: Users, title: "Team collaboration", desc: "Assign work, group projects, and share context with avatars + comments." },
  { icon: Bell, title: "Smart notifications", desc: "Stay in the loop on what matters — mentions, due dates, and updates." },
  { icon: Sparkles, title: "Beautiful by default", desc: "A refined dark UI with thoughtful motion and typography." },
  { icon: Zap, title: "Built for speed", desc: "Local-first state with smooth animations and snappy interactions." },
  { icon: ShieldCheck, title: "Your data, your rules", desc: "Persisted locally — you control your workspace." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="max-w-[1280px] mx-auto h-16 px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary grid place-items-center accent-glow">
              <KanbanSquare className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">Plane</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
            <Button variant="hero" asChild><Link to="/register">Get Started</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient">
        <div className="max-w-[1280px] mx-auto px-6 pt-24 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 text-xs text-muted-foreground mb-8"
          >
            <Sparkles className="size-3.5 text-primary" />
            New: Real-time Kanban with smooth drag & drop
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
            className="font-display font-bold text-5xl md:text-7xl text-balance max-w-4xl mx-auto leading-[1.05]"
          >
            Where teams plan,<br />
            track and <span className="bg-gradient-to-r from-primary to-[#a855f7] bg-clip-text text-transparent">ship work</span>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            A premium project management workspace with Kanban boards, team avatars, and beautiful design — minus the bloat.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex items-center justify-center gap-3"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/register">Get started free <ArrowRight className="size-4" /></Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </motion.div>

          {/* Hero preview card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: "easeOut" }}
            className="mt-20 mx-auto max-w-5xl"
          >
            <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md card-shadow p-3">
              <div className="rounded-xl bg-background/60 p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {["To Do", "In Progress", "Review", "Done"].map((col, i) => (
                  <div key={col} className="rounded-lg bg-card/70 border border-border/50 p-3 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{col}</span>
                      <span className="text-xs text-muted-foreground">{[3,2,1,4][i]}</span>
                    </div>
                    <div className="space-y-2">
                      {[1,2].map(k => (
                        <div key={k} className="rounded-md bg-background/80 border border-border/40 p-3">
                          <div className="h-2 w-3/4 rounded bg-muted-foreground/20 mb-2" />
                          <div className="h-2 w-1/2 rounded bg-muted-foreground/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-bold text-4xl md:text-5xl">Everything you need.<br />Nothing you don't.</h2>
            <p className="mt-4 text-muted-foreground">A focused toolkit for fast-moving teams.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-xl border border-border/60 bg-card p-6 hover:border-primary/40 transition-colors"
              >
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary mb-4">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-24 border-t border-border/60">
        <div className="max-w-[1280px] mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display font-bold text-4xl md:text-5xl">A workflow that just works.</h2>
            <p className="mt-4 text-muted-foreground">From idea to ship — Plane keeps your team aligned without getting in the way.</p>
            <ul className="mt-6 space-y-3">
              {["Create projects in seconds", "Drag tasks across columns", "Comment, mention, and resolve", "Track progress with live %"].map(t => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="size-4 text-success" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button variant="hero" asChild><Link to="/register">Start free <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-6 card-shadow">
            <div className="space-y-3">
              {[
                { p: "high", t: "Define hero composition", c: "#EF4444" },
                { p: "medium", t: "Build navigation component", c: "#F59E0B" },
                { p: "low", t: "Audit competitor sites", c: "#22C55E" },
              ].map((task) => (
                <div key={task.t} className="rounded-lg border border-border/40 bg-background/70 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{task.t}</p>
                    <p className="text-xs text-muted-foreground mt-1">Apollo Web Redesign</p>
                  </div>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: task.c, backgroundColor: task.c + "22" }}>
                    {task.p}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24 border-t border-border/60">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display font-bold text-4xl md:text-5xl">Ready when you are.</h2>
          <p className="mt-4 text-muted-foreground">Free during preview. No credit card required.</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="hero" size="xl" asChild><Link to="/register">Get Started <ArrowRight className="size-4" /></Link></Button>
            <Button variant="outline" size="xl" asChild><Link to="/login">Login</Link></Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-primary grid place-items-center">
              <KanbanSquare className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Plane</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
