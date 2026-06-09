import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { UserAvatar } from "@/components/UserAvatar";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/_app/team")({
  head: () => ({
    meta: [
      { title: "Team — Plane" },
      { name: "description", content: "Meet your workspace members." },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <h1 className="font-display font-bold text-3xl">Team</h1>
      <p className="text-muted-foreground mt-1">{users.length} members in your workspace.</p>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u, i) => {
          const open = tasks.filter((t) => t.assigneeId === u.id && t.status !== "done").length;
          const done = tasks.filter((t) => t.assigneeId === u.id && t.status === "done").length;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl bg-card border border-border p-6 card-shadow"
            >
              <div className="flex items-center gap-4">
                <UserAvatar user={u} size={56} />
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{u.name}</h3>
                  <p className="text-sm text-muted-foreground">{u.role}</p>
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="size-4" /> {u.email}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div>
                  <div className="text-2xl font-display font-bold">{open}</div>
                  <div className="text-xs text-muted-foreground">Open tasks</div>
                </div>
                <div>
                  <div className="text-2xl font-display font-bold text-success">{done}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
