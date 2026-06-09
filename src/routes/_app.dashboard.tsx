import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FolderKanban, CheckSquare, Clock, Users as UsersIcon, ArrowRight, Plus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { AvatarStack } from "@/components/UserAvatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { isToday, isPast, parseISO } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Plane" },
      { name: "description", content: "Overview of your projects, tasks due today, and team." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);

  const dueToday = tasks.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)) && t.status !== "done").length;
  const completed = tasks.filter((t) => t.status === "done").length;

  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderKanban, color: "text-primary", bg: "bg-primary/10" },
    { label: "Tasks Due Today", value: dueToday, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { label: "Completed Tasks", value: completed, icon: CheckSquare, color: "text-success", bg: "bg-success/10" },
    { label: "Team Members", value: users.length, icon: UsersIcon, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl">Good to see you, Alex 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your workspace.</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/projects"><Plus className="size-4" /> New project</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-xl bg-card border border-border p-5 card-shadow hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
              <div className={`size-9 rounded-lg grid place-items-center ${s.bg} ${s.color}`}>
                <s.icon className="size-5" strokeWidth={1.75} />
              </div>
            </div>
            <CountUp value={s.value} className="text-3xl font-display font-bold mt-3 block" />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl">Active projects</h2>
            <Link to="/projects" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {projects.map((p, i) => {
              const projTasks = tasks.filter((t) => t.projectId === p.id);
              const done = projTasks.filter((t) => t.status === "done").length;
              const pct = projTasks.length ? Math.round((done / projTasks.length) * 100) : 0;
              const members = users.filter((u) => p.memberIds.includes(u.id));
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 + i * 0.05 }}
                >
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="block rounded-xl bg-card border border-border p-5 card-shadow hover:border-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="size-9 rounded-lg shrink-0" style={{ backgroundColor: p.color + "33", color: p.color }}>
                        <FolderKanban className="size-5 m-auto translate-y-2" style={{ color: p.color }} />
                      </div>
                      <AvatarStack users={members} size={26} max={3} />
                    </div>
                    <h3 className="font-semibold mt-4">{p.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.description}</p>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                        <span>{done}/{projTasks.length} tasks</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-display font-semibold text-xl mb-4">Due soon</h2>
          <div className="rounded-xl bg-card border border-border divide-y divide-border">
            {tasks
              .filter((t) => t.dueDate && t.status !== "done")
              .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!))
              .slice(0, 5)
              .map((t) => {
                const overdue = isPast(parseISO(t.dueDate!)) && !isToday(parseISO(t.dueDate!));
                const assignee = users.find((u) => u.id === t.assigneeId);
                return (
                  <div key={t.id} className="p-4 flex items-center gap-3">
                    <div className={`size-2 rounded-full shrink-0 ${overdue ? "bg-danger" : "bg-warning"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{assignee?.name}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountUp({ value, className }: { value: number; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {value}
    </motion.span>
  );
}
