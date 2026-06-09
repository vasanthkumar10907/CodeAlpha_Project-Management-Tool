import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "review" | "done";

export interface User {
  id: string;
  name: string;
  avatar: string; // initials color seed
  color: string;
  email: string;
  role: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  color: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  text: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  theme: "dark" | "light";
  authed: boolean;
  currentUserId: string;
  users: User[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  notifications: Notification[];

  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
  login: () => void;
  logout: () => void;

  addProject: (p: Omit<Project, "id" | "createdAt">) => string;
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addTask: (t: Omit<Task, "id" | "createdAt">) => string;
  updateTask: (id: string, t: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, status: Status) => void;

  addComment: (taskId: string, text: string) => void;

  markAllRead: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const users: User[] = [
  { id: "u1", name: "Alex Morgan", avatar: "AM", color: "#6366F1", email: "alex@team.io", role: "Product Lead" },
  { id: "u2", name: "Priya Shah", avatar: "PS", color: "#22C55E", email: "priya@team.io", role: "Engineer" },
  { id: "u3", name: "Diego Reyes", avatar: "DR", color: "#F59E0B", email: "diego@team.io", role: "Designer" },
  { id: "u4", name: "Mei Chen", avatar: "MC", color: "#EF4444", email: "mei@team.io", role: "Engineer" },
  { id: "u5", name: "Jonah Kim", avatar: "JK", color: "#14B8A6", email: "jonah@team.io", role: "PM" },
];

const projects: Project[] = [
  { id: "p1", name: "Apollo Web Redesign", description: "Marketing site rebuild with new brand", memberIds: ["u1","u2","u3","u4"], color: "#6366F1", createdAt: new Date().toISOString() },
  { id: "p2", name: "Mobile App v2", description: "iOS & Android shipping next quarter", memberIds: ["u2","u4","u5"], color: "#14B8A6", createdAt: new Date().toISOString() },
  { id: "p3", name: "Onboarding Flow", description: "Reduce drop-off in first session", memberIds: ["u1","u3","u5"], color: "#F59E0B", createdAt: new Date().toISOString() },
];

const today = new Date();
const addDays = (n: number) => new Date(today.getTime() + n * 86400000).toISOString();

const tasks: Task[] = [
  { id: "t1", projectId: "p1", title: "Define hero composition", description: "Decide between split-screen and centered hero.", status: "todo", priority: "high", assigneeId: "u3", dueDate: addDays(0), createdAt: today.toISOString() },
  { id: "t2", projectId: "p1", title: "Audit competitor sites", description: "Pull 6 references and annotate.", status: "todo", priority: "low", assigneeId: "u1", dueDate: addDays(3), createdAt: today.toISOString() },
  { id: "t3", projectId: "p1", title: "Build navigation component", description: "Sticky header with collapse on scroll.", status: "in_progress", priority: "medium", assigneeId: "u2", dueDate: addDays(2), createdAt: today.toISOString() },
  { id: "t4", projectId: "p1", title: "Color token migration", description: "Move all colors into design tokens.", status: "in_progress", priority: "high", assigneeId: "u4", dueDate: addDays(1), createdAt: today.toISOString() },
  { id: "t5", projectId: "p1", title: "QA pricing page", description: "", status: "review", priority: "medium", assigneeId: "u5", dueDate: addDays(4), createdAt: today.toISOString() },
  { id: "t6", projectId: "p1", title: "Ship footer redesign", description: "", status: "done", priority: "low", assigneeId: "u3", dueDate: addDays(-2), createdAt: today.toISOString() },
  { id: "t7", projectId: "p2", title: "Push notification permission flow", description: "", status: "todo", priority: "medium", assigneeId: "u4", dueDate: addDays(0), createdAt: today.toISOString() },
  { id: "t8", projectId: "p2", title: "Refactor auth module", description: "", status: "in_progress", priority: "high", assigneeId: "u2", dueDate: addDays(5), createdAt: today.toISOString() },
  { id: "t9", projectId: "p2", title: "App icon variants", description: "", status: "done", priority: "low", assigneeId: "u5", dueDate: addDays(-5), createdAt: today.toISOString() },
  { id: "t10", projectId: "p3", title: "Write welcome copy", description: "", status: "review", priority: "low", assigneeId: "u1", dueDate: addDays(1), createdAt: today.toISOString() },
  { id: "t11", projectId: "p3", title: "Empty-state illustrations", description: "", status: "in_progress", priority: "medium", assigneeId: "u3", dueDate: addDays(2), createdAt: today.toISOString() },
];

const comments: Comment[] = [
  { id: "c1", taskId: "t1", authorId: "u1", text: "Let's go with split-screen for stronger hierarchy.", createdAt: today.toISOString() },
  { id: "c2", taskId: "t1", authorId: "u3", text: "Agreed — I'll mock both quickly.", createdAt: today.toISOString() },
];

const notifications: Notification[] = [
  { id: "n1", text: "Priya assigned you a task on Apollo Web Redesign", read: false, createdAt: today.toISOString() },
  { id: "n2", text: "Diego commented on “Define hero composition”", read: false, createdAt: today.toISOString() },
  { id: "n3", text: "Mobile App v2 milestone updated", read: true, createdAt: today.toISOString() },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      authed: false,
      currentUserId: "u1",
      users,
      projects,
      tasks,
      comments,
      notifications,

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (t) => set({ theme: t }),
      login: () => set({ authed: true }),
      logout: () => set({ authed: false }),

      addProject: (p) => {
        const id = uid();
        set((s) => ({ projects: [...s.projects, { ...p, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateProject: (id, p) =>
        set((s) => ({ projects: s.projects.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((x) => x.id !== id),
          tasks: s.tasks.filter((t) => t.projectId !== id),
        })),

      addTask: (t) => {
        const id = uid();
        set((s) => ({ tasks: [...s.tasks, { ...t, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateTask: (id, t) =>
        set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) })),
      moveTask: (id, status) =>
        set((s) => ({ tasks: s.tasks.map((x) => (x.id === id ? { ...x, status } : x)) })),

      addComment: (taskId, text) => {
        const c: Comment = {
          id: uid(),
          taskId,
          authorId: get().currentUserId,
          text,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ comments: [...s.comments, c] }));
      },

      markAllRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    }),
    {
      name: "pm-app-store",
      partialize: (s) => ({ theme: s.theme, authed: s.authed }),
    },
  ),
);
