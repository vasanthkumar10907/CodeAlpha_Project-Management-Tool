import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore, type Priority, type Status } from "@/store/useAppStore";
import { UserAvatar } from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Calendar, Trash2, Send } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function TaskDetailModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const comments = useAppStore((s) => s.comments);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const addComment = useAppStore((s) => s.addComment);
  const currentUserId = useAppStore((s) => s.currentUserId);

  const task = tasks.find((t) => t.id === taskId);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (task) { setTitle(task.title); setDesc(task.description); }
  }, [task?.id]);

  if (!task) return null;
  const assignee = users.find((u) => u.id === task.assigneeId);
  const taskComments = comments.filter((c) => c.taskId === task.id);
  const me = users.find((u) => u.id === currentUserId) || {
    id: currentUserId || "0",
    name: "User",
    avatar: "U",
    color: "#6366F1",
    email: "",
    role: "member"
  };

  const saveTitle = () => { if (title !== task.title) updateTask(task.id, { title }); };
  const saveDesc = () => { if (desc !== task.description) updateTask(task.id, { description: desc }); };

  return (
    <Dialog open={!!task} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto glass rounded-2xl scroll-thin">
        <DialogTitle className="sr-only">Task: {task.title}</DialogTitle>
        <DialogDescription className="sr-only">Task details and comments</DialogDescription>

        <div className="flex items-center gap-2 mb-4">
          <PriorityBadge priority={task.priority} />
          <span className="text-xs text-muted-foreground">Created {formatDistanceToNow(parseISO(task.createdAt), { addSuffix: true })}</span>
          <button
            className="ml-auto p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-danger"
            onClick={() => { deleteTask(task.id); toast.success("Task deleted"); onClose(); }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="h-12 text-xl font-display font-bold border-none px-0 focus-visible:ring-0 bg-transparent"
        />

        <div className="grid sm:grid-cols-3 gap-4 mt-4 pb-4 border-b border-border">
          <Field label="Assignee">
            <Select value={task.assigneeId ?? "none"} onValueChange={(v) => updateTask(task.id, { assigneeId: v === "none" ? null : v })}>
              <SelectTrigger className="h-9">
                <SelectValue>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <UserAvatar user={assignee} size={20} />
                      <span className="text-sm">{assignee.name}</span>
                    </div>
                  ) : "Unassigned"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2"><UserAvatar user={u} size={18} /> {u.name}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Due date">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 w-full justify-start font-normal">
                  <Calendar className="size-4" />
                  {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : <span className="text-muted-foreground">No date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComp
                  mode="single"
                  selected={task.dueDate ? parseISO(task.dueDate) : undefined}
                  onSelect={(d) => updateTask(task.id, { dueDate: d ? d.toISOString() : null })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="Priority">
            <Select value={task.priority} onValueChange={(v) => updateTask(task.id, { priority: v as Priority })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Status" className="sm:col-span-3">
            <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v as Status })}>
              <SelectTrigger className="h-9 max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={saveDesc}
            placeholder="Add a description…"
            className="mt-2 min-h-24"
          />
        </div>

        {/* Comments */}
        <div className="mt-6">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Comments ({taskComments.length})
          </h4>
          <div className="space-y-4">
            {taskComments.map((c) => {
              const author = users.find((u) => u.id === c.authorId) || {
                id: c.authorId,
                name: "Deleted User",
                avatar: "D",
                color: "#9CA3AF",
                email: "",
                role: "member"
              };
              return (
                <div key={c.id} className="flex gap-3">
                  <UserAvatar user={author} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{author.name}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-3">
              <UserAvatar user={me} size={32} />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!comment.trim()) return;
                  addComment(task.id, comment);
                  setComment("");
                }}
                className="flex-1 flex gap-2"
              >
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                  className="h-10"
                />
                <Button type="submit" variant="hero" size="icon" className="h-10 w-10 shrink-0">
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
