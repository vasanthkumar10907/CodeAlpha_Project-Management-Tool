import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Plus, FolderKanban, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { AvatarStack } from "@/components/UserAvatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Plane" },
      { name: "description", content: "All your team projects in one place." },
    ],
  }),
  component: ProjectsPage,
});

const colors = ["#6366F1", "#14B8A6", "#F59E0B", "#EF4444", "#22C55E", "#A855F7"];

function ProjectsPage() {
  const projects = useAppStore((s) => s.projects);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const addProject = useAppStore((s) => s.addProject);
  const updateProject = useAppStore((s) => s.updateProject);
  const deleteProject = useAppStore((s) => s.deleteProject);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [color, setColor] = useState(colors[0]);

  const openCreate = () => {
    setEditing(null);
    setName(""); setDesc(""); setMemberIds([]); setColor(colors[0]);
    setOpen(true);
  };
  const openEdit = (id: string) => {
    const p = projects.find((x) => x.id === id)!;
    setEditing(id);
    setName(p.name); setDesc(p.description); setMemberIds(p.memberIds); setColor(p.color);
    setOpen(true);
  };

  const onSubmit = () => {
    if (!name.trim()) return;
    if (editing) {
      updateProject(editing, { name, description: desc, memberIds, color });
      toast.success("Project updated");
    } else {
      addProject({ name, description: desc, memberIds, color });
      toast.success("Project created");
    }
    setOpen(false);
  };

  return (
    <div className="p-8 max-w-[1280px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl">Projects</h1>
          <p className="text-muted-foreground mt-1">{projects.length} active projects in your workspace.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}><Plus className="size-4" /> New project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg glass rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit project" : "Create a project"}</DialogTitle>
              <DialogDescription>{editing ? "Update details and team." : "Start a new project and invite your team."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Project name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Launch" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this project about?" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`size-8 rounded-lg border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Team members</Label>
                <div className="space-y-2 max-h-44 overflow-auto pr-1">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={memberIds.includes(u.id)}
                        onCheckedChange={(c) => {
                          setMemberIds((m) => c ? [...m, u.id] : m.filter((x) => x !== u.id));
                        }}
                      />
                      <div className="size-7 rounded-full grid place-items-center text-white text-xs font-semibold" style={{ backgroundColor: u.color }}>{u.avatar}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="hero" onClick={onSubmit}>{editing ? "Save changes" : "Create project"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-xl bg-card border border-border card-shadow group hover:border-primary/40 transition-all hover:-translate-y-0.5"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <Link to="/projects/$projectId" params={{ projectId: p.id }} className="flex-1 min-w-0">
                    <div className="size-10 rounded-lg grid place-items-center" style={{ backgroundColor: p.color + "22" }}>
                      <FolderKanban className="size-5" style={{ color: p.color }} />
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p.id)}><Pencil className="size-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-danger" onClick={() => { deleteProject(p.id); toast.success("Project deleted"); }}>
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link to="/projects/$projectId" params={{ projectId: p.id }} className="block">
                  <h3 className="font-semibold mt-4 truncate">{p.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">{p.description}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{done}/{projTasks.length} tasks</span>
                      <span className="font-semibold text-foreground">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <AvatarStack users={members} size={26} max={4} />
                    <span className="text-xs text-muted-foreground">{members.length} members</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
