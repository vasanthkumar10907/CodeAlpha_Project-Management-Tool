import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { format, isPast, isToday, parseISO } from "date-fns";
import { useAppStore, type Status } from "@/store/useAppStore";
import { PriorityBadge } from "@/components/PriorityBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({
    meta: [
      { title: "My Tasks — Plane" },
      { name: "description", content: "Tasks assigned to you across all projects." },
    ],
  }),
  component: MyTasks,
});

const statusLabel: Record<Status, string> = {
  todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done",
};

function MyTasks() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const tasks = useAppStore((s) => s.tasks.filter((t) => t.assigneeId === currentUserId));
  const projects = useAppStore((s) => s.projects);

  const groups: Status[] = ["todo", "in_progress", "review", "done"];

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <h1 className="font-display font-bold text-3xl">My Tasks</h1>
      <p className="text-muted-foreground mt-1">{tasks.length} tasks assigned to you.</p>

      <div className="mt-8 space-y-8">
        {groups.map((g) => {
          const items = tasks.filter((t) => t.status === g);
          if (items.length === 0) return null;
          return (
            <section key={g}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {statusLabel[g]} <span className="text-muted-foreground/60">({items.length})</span>
              </h2>
              <div className="rounded-xl bg-card border border-border divide-y divide-border">
                {items.map((t, i) => {
                  const project = projects.find((p) => p.id === t.projectId);
                  const overdue = t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)) && t.status !== "done";
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                    >
                      <Link
                        to="/projects/$projectId"
                        params={{ projectId: t.projectId }}
                        className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                      >
                        <PriorityBadge priority={t.priority} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{project?.name}</p>
                        </div>
                        {t.dueDate && (
                          <span className={cn("text-xs text-muted-foreground flex items-center gap-1.5", overdue && "text-danger font-medium")}>
                            <Calendar className="size-3.5" />
                            {format(parseISO(t.dueDate), "MMM d")}
                          </span>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {tasks.length === 0 && (
          <div className="rounded-xl bg-card border border-border p-12 text-center text-muted-foreground">
            No tasks assigned to you. Take a break ✨
          </div>
        )}
      </div>
    </div>
  );
}
