import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ArrowLeft, Plus, Calendar, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useAppStore, type Status, type Priority } from "@/store/useAppStore";
import { AvatarStack, UserAvatar } from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { format, isPast, isToday, parseISO } from "date-fns";
import { TaskDetailModal } from "@/components/TaskDetailModal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/projects/$projectId")({
  head: ({ params }) => ({
    meta: [
      { title: "Project Board — Plane" },
      { name: "description", content: `Kanban board for project ${params.projectId}` },
    ],
  }),
  component: ProjectBoard,
});

const columns: { id: Status; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

function ProjectBoard() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId));
  const tasks = useAppStore((s) => s.tasks.filter((t) => t.projectId === projectId));
  const users = useAppStore((s) => s.users);
  const moveTask = useAppStore((s) => s.moveTask);
  const addTask = useAppStore((s) => s.addTask);

  const [openTask, setOpenTask] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newCol, setNewCol] = useState<Status>("todo");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState<string | "none">("none");
  const [due, setDue] = useState<Date | undefined>();

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p>Project not found.</p>
        <Button asChild className="mt-4"><Link to="/projects">Back to projects</Link></Button>
      </div>
    );
  }

  const members = users.filter((u) => project.memberIds.includes(u.id));
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    moveTask(result.draggableId, result.destination.droppableId as Status);
  };

  const openNew = (col: Status) => {
    setNewCol(col);
    setTitle(""); setDesc(""); setPriority("medium"); setAssignee("none"); setDue(undefined);
    setNewOpen(true);
  };

  const createTask = () => {
    if (!title.trim()) return;
    addTask({
      projectId,
      title,
      description: desc,
      status: newCol,
      priority,
      assigneeId: assignee === "none" ? null : assignee,
      dueDate: due ? due.toISOString() : null,
    });
    setNewOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-border">
        <button
          onClick={() => navigate({ to: "/projects" })}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft className="size-4" /> All projects
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg" style={{ backgroundColor: project.color + "22" }}>
                <div className="size-full rounded-lg" style={{ backgroundColor: project.color + "44" }} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-2xl truncate">{project.name}</h1>
                <p className="text-sm text-muted-foreground truncate">{project.description}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block min-w-40">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span><span className="font-semibold text-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
            <AvatarStack users={members} size={32} max={5} />
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden scroll-thin">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 p-6 h-full min-w-max">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <div key={col.id} className="w-[280px] shrink-0 flex flex-col h-full">
                  <div className="flex items-center justify-between px-1 mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{col.title}</h3>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{colTasks.length}</span>
                    </div>
                    <button
                      onClick={() => openNew(col.id)}
                      className="size-6 rounded-md hover:bg-muted grid place-items-center text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 rounded-xl p-2 space-y-2 overflow-y-auto scroll-thin transition-colors",
                          snapshot.isDraggingOver ? "bg-primary/5" : "bg-muted/30",
                        )}
                      >
                        {colTasks.map((task, idx) => {
                          const assignee = users.find((u) => u.id === task.assigneeId);
                          const overdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)) && task.status !== "done";
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={idx}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setOpenTask(task.id)}
                                  style={{
                                    ...prov.draggableProps.style,
                                    transform: snap.isDragging
                                      ? `${prov.draggableProps.style?.transform} rotate(3deg)`
                                      : prov.draggableProps.style?.transform,
                                  }}
                                  className={cn(
                                    "rounded-lg bg-card border border-border p-3 cursor-pointer transition-shadow",
                                    snap.isDragging ? "shadow-2xl ring-1 ring-primary/40" : "card-shadow hover:border-primary/40",
                                  )}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <PriorityBadge priority={task.priority} />
                                  </div>
                                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</p>
                                  )}
                                  <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {task.dueDate && (
                                        <span className={cn("flex items-center gap-1", overdue && "text-danger font-medium")}>
                                          <Calendar className="size-3" />
                                          {format(parseISO(task.dueDate), "MMM d")}
                                        </span>
                                      )}
                                    </div>
                                    {assignee && <UserAvatar user={assignee} size={22} />}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <button
                            onClick={() => openNew(col.id)}
                            className="w-full rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                          >
                            <Plus className="size-4 mx-auto mb-1" />
                            Add task
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* New task dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-lg glass rounded-2xl">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>Add a task to "{columns.find((c) => c.id === newCol)?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Add details…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assignee} onValueChange={(v) => setAssignee(v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-11 justify-start font-normal">
                    <Calendar className="size-4" />
                    {due ? format(due, "PPP") : <span className="text-muted-foreground">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComp mode="single" selected={due} onSelect={setDue} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={createTask}>Create task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailModal taskId={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}
