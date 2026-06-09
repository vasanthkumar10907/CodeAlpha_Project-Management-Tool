import { create } from "zustand";
import { persist } from "zustand/middleware";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "review" | "done";

export interface User {
  id: string;
  name: string;
  avatar: string; // initials or URL
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
  position: number;
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
  token: string | null;
  currentUserId: string;
  users: User[];
  projects: Project[];
  tasks: Task[];
  comments: Comment[];
  notifications: Notification[];
  socket: Socket | null;

  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
  setToken: (token: string | null) => void;
  
  // Auth actions
  login: (email?: string, password?: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Initial loading
  initializeData: () => Promise<void>;

  // Project CRUD
  addProject: (p: Omit<Project, "id" | "createdAt">) => Promise<string | null>;
  updateProject: (id: string, p: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Task CRUD & Kanban
  addTask: (t: Omit<Task, "id" | "createdAt" | "position">) => Promise<string | null>;
  updateTask: (id: string, t: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: Status) => Promise<void>;
  updateTaskPosition: (id: string, position: number, status?: Status) => Promise<void>;

  // Comments & Notifications
  addComment: (taskId: string, text: string) => Promise<void>;
  markAllRead: () => Promise<void>;

  // Socket triggers
  socketJoinProject: (projectId: string) => void;
  socketLeaveProject: (projectId: string) => void;
  socketJoinTask: (taskId: string) => void;
  socketLeaveTask: (taskId: string) => void;
  initSocket: () => void;
}

// Entity mappers to reconcile backend SQLite types with frontend store interfaces
const mapUser = (u: any): User => ({
  id: String(u.id),
  name: u.name,
  avatar: u.avatar_url || u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
  color: u.color || '#6366F1',
  email: u.email,
  role: u.role || 'member'
});

const mapProject = (p: any): Project => ({
  id: String(p.id),
  name: p.name,
  description: p.description || '',
  memberIds: p.members ? p.members.map((m: any) => String(m.id)) : [String(p.owner_id)],
  color: p.color || '#6366F1',
  createdAt: p.created_at
});

const mapTask = (t: any): Task => ({
  id: String(t.id),
  projectId: String(t.project_id),
  title: t.title,
  description: t.description || '',
  status: t.status === 'inprogress' ? 'in_progress' : t.status,
  priority: t.priority,
  assigneeId: t.assignee_id ? String(t.assignee_id) : null,
  dueDate: t.due_date,
  position: Number(t.position || 0),
  createdAt: t.created_at
});

const mapComment = (c: any): Comment => ({
  id: String(c.id),
  taskId: String(c.task_id),
  authorId: String(c.user_id),
  text: c.content,
  createdAt: c.created_at
});

const mapNotification = (n: any): Notification => ({
  id: String(n.id),
  text: n.message,
  read: !!n.is_read,
  createdAt: n.created_at
});

// Map status for DB constraints
const mapStatusToDb = (status: Status): string => {
  return status === 'in_progress' ? 'inprogress' : status;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      authed: false,
      token: null,
      currentUserId: "",
      users: [],
      projects: [],
      tasks: [],
      comments: [],
      notifications: [],
      socket: null,

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setTheme: (t) => set({ theme: t }),
      setToken: (token) => set({ token }),

      login: async (email, password) => {
        // Fallback for blank/dev quick logins if no inputs provided
        const loginEmail = email || 'alex@team.io';
        const loginPassword = password || 'password123';

        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: { email: loginEmail, password: loginPassword }
        }, useAppStore);

        if (res.success && res.data?.token) {
          set({
            authed: true,
            token: res.data.token,
            currentUserId: String(res.data.user.id)
          });
          
          // Connect real-time socket and fetch DB data
          get().initSocket();
          await get().initializeData();
          return true;
        } else {
          toast.error(res.message || 'Login failed. Please check credentials.');
          return false;
        }
      },

      register: async (name, email, password) => {
        const res = await apiRequest('/auth/register', {
          method: 'POST',
          body: { name, email, password }
        }, useAppStore);

        if (res.success && res.data?.token) {
          set({
            authed: true,
            token: res.data.token,
            currentUserId: String(res.data.user.id)
          });
          
          get().initSocket();
          await get().initializeData();
          return true;
        } else {
          toast.error(res.message || 'Registration failed.');
          return false;
        }
      },

      logout: async () => {
        // Disconnect socket if exists
        const socket = get().socket;
        if (socket) {
          socket.disconnect();
        }

        // Call backend logout to clear refresh cookie & invalidate token
        await apiRequest('/auth/logout', { method: 'POST' }, useAppStore);

        // Reset local state
        set({
          authed: false,
          token: null,
          currentUserId: "",
          users: [],
          projects: [],
          tasks: [],
          comments: [],
          notifications: [],
          socket: null
        });
      },

      initializeData: async () => {
        if (!get().authed || !get().token) return;

        // Fetch users
        const usersRes = await apiRequest('/users', {}, useAppStore);
        if (usersRes.success) {
          set({ users: usersRes.data.map(mapUser) });
        }

        // Fetch projects
        const projectsRes = await apiRequest('/projects', {}, useAppStore);
        if (projectsRes.success) {
          const mappedProjs = projectsRes.data.map(mapProject);
          set({ projects: mappedProjs });

          // Fetch tasks for all active projects
          const allTasks: Task[] = [];
          for (const proj of mappedProjs) {
            const tasksRes = await apiRequest(`/tasks/project/${proj.id}`, {}, useAppStore);
            if (tasksRes.success) {
              allTasks.push(...tasksRes.data.map(mapTask));
            }
          }
          set({ tasks: allTasks });
        }

        // Fetch notifications
        const notifRes = await apiRequest('/notifications', {}, useAppStore);
        if (notifRes.success) {
          set({ notifications: notifRes.data.map(mapNotification) });
        }
      },

      addProject: async (p) => {
        // Create the project first
        const createRes = await apiRequest('/projects', {
          method: 'POST',
          body: {
            name: p.name,
            description: p.description,
            color: p.color
          }
        }, useAppStore);

        if (createRes.success && createRes.data) {
          const projectId = createRes.data.id;
          
          // Add other members if specified
          const currentUserId = get().currentUserId;
          const otherMembers = p.memberIds.filter(uid => uid !== currentUserId);
          
          for (const memberId of otherMembers) {
            await apiRequest(`/projects/${projectId}/members`, {
              method: 'POST',
              body: {
                userId: parseInt(memberId),
                role: 'editor'
              }
            }, useAppStore);
          }

          // Fetch full project with members to update local state
          const fullProjRes = await apiRequest(`/projects/${projectId}`, {}, useAppStore);
          if (fullProjRes.success && fullProjRes.data) {
            const newProj = mapProject(fullProjRes.data);
            set((s) => ({ projects: [newProj, ...s.projects] }));
            toast.success('Project created successfully!');
            return newProj.id;
          }
        }
        
        toast.error(createRes.message || 'Failed to create project.');
        return null;
      },

      updateProject: async (id, p) => {
        // 1. Update project details
        const detailsRes = await apiRequest(`/projects/${id}`, {
          method: 'PUT',
          body: {
            name: p.name,
            description: p.description,
            color: p.color
          }
        }, useAppStore);

        if (!detailsRes.success) {
          toast.error(detailsRes.message || 'Failed to update project.');
          return;
        }

        // 2. Sync members if provided
        if (p.memberIds) {
          const project = get().projects.find(x => x.id === id);
          if (project) {
            const oldMembers = project.memberIds;
            const newMembers = p.memberIds;

            // Members to add
            const toAdd = newMembers.filter(mid => !oldMembers.includes(mid));
            // Members to remove (can't remove owner)
            const currentUserId = get().currentUserId;
            const toRemove = oldMembers.filter(mid => !newMembers.includes(mid) && mid !== currentUserId);

            for (const mid of toAdd) {
              await apiRequest(`/projects/${id}/members`, {
                method: 'POST',
                body: { userId: parseInt(mid), role: 'editor' }
              }, useAppStore);
            }

            for (const mid of toRemove) {
              await apiRequest(`/projects/${id}/members/${mid}`, {
                method: 'DELETE'
              }, useAppStore);
            }
          }
        }

        // Fetch updated project
        const updatedRes = await apiRequest(`/projects/${id}`, {}, useAppStore);
        if (updatedRes.success && updatedRes.data) {
          const updated = mapProject(updatedRes.data);
          set((s) => ({
            projects: s.projects.map((x) => (x.id === id ? updated : x))
          }));
          toast.success('Project details updated.');
        }
      },

      deleteProject: async (id) => {
        const res = await apiRequest(`/projects/${id}`, {
          method: 'DELETE'
        }, useAppStore);

        if (res.success) {
          set((s) => ({
            projects: s.projects.filter((x) => x.id !== id),
            tasks: s.tasks.filter((t) => t.projectId !== id)
          }));
          toast.success('Project deleted.');
        } else {
          toast.error(res.message || 'Failed to delete project.');
        }
      },

      addTask: async (t) => {
        const payload = {
          ...t,
          project_id: parseInt(t.projectId),
          assignee_id: t.assigneeId ? parseInt(t.assigneeId) : null,
          status: mapStatusToDb(t.status),
          due_date: t.dueDate
        };

        const res = await apiRequest('/tasks', {
          method: 'POST',
          body: payload
        }, useAppStore);

        if (res.success && res.data) {
          const newTask = mapTask(res.data);
          // Socket will broadcast this, but we append locally for snappy UI if not received
          set((s) => {
            if (s.tasks.some(x => x.id === newTask.id)) return s;
            return { tasks: [...s.tasks, newTask] };
          });
          return newTask.id;
        } else {
          toast.error(res.message || 'Failed to add task.');
          return null;
        }
      },

      updateTask: async (id, t) => {
        const payload: any = { ...t };
        if (t.projectId) payload.project_id = parseInt(t.projectId);
        if (t.assigneeId !== undefined) payload.assignee_id = t.assigneeId ? parseInt(t.assigneeId) : null;
        if (t.status) payload.status = mapStatusToDb(t.status);
        if (t.dueDate !== undefined) payload.due_date = t.dueDate;

        const res = await apiRequest(`/tasks/${id}`, {
          method: 'PUT',
          body: payload
        }, useAppStore);

        if (res.success && res.data) {
          const updated = mapTask(res.data);
          set((s) => ({
            tasks: s.tasks.map((x) => (x.id === id ? { ...x, ...updated } : x))
          }));
        } else {
          toast.error(res.message || 'Failed to update task.');
        }
      },

      deleteTask: async (id) => {
        const res = await apiRequest(`/tasks/${id}`, {
          method: 'DELETE'
        }, useAppStore);

        if (res.success) {
          set((s) => ({ tasks: s.tasks.filter((x) => x.id !== id) }));
        } else {
          toast.error(res.message || 'Failed to delete task.');
        }
      },

      moveTask: async (id, status) => {
        // Optimistic UI update
        set((s) => ({
          tasks: s.tasks.map((x) => (x.id === id ? { ...x, status } : x))
        }));

        const res = await apiRequest(`/tasks/${id}/status`, {
          method: 'PATCH',
          body: { status: mapStatusToDb(status) }
        }, useAppStore);

        if (!res.success) {
          toast.error(res.message || 'Failed to move task.');
          // Revert on failure
          get().initializeData();
        }
      },

      updateTaskPosition: async (id, position, status) => {
        // Optimistic UI update
        set((s) => ({
          tasks: s.tasks.map((x) => (x.id === id ? { ...x, position, ...(status ? { status } : {}) } : x))
        }));

        const res = await apiRequest(`/tasks/${id}/position`, {
          method: 'PATCH',
          body: {
            position,
            ...(status ? { status: mapStatusToDb(status) } : {})
          }
        }, useAppStore);

        if (!res.success) {
          toast.error(res.message || 'Failed to update task position.');
          get().initializeData();
        }
      },

      addComment: async (taskId, text) => {
        const res = await apiRequest('/comments', {
          method: 'POST',
          body: {
            task_id: parseInt(taskId),
            content: text
          }
        }, useAppStore);

        if (res.success && res.data) {
          const newComment = mapComment(res.data);
          set((s) => ({ comments: [...s.comments, newComment] }));
        } else {
          toast.error(res.message || 'Failed to add comment.');
        }
      },

      markAllRead: async () => {
        const res = await apiRequest('/notifications/read-all', {
          method: 'PATCH'
        }, useAppStore);

        if (res.success) {
          set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true }))
          }));
        } else {
          toast.error(res.message || 'Failed to mark notifications read.');
        }
      },

      // ================= SOCKET TRIGGERS & LISTENERS =================

      socketJoinProject: (projectId) => {
        const socket = get().socket;
        if (socket) {
          socket.emit('joinProject', parseInt(projectId));
        }
      },

      socketLeaveProject: (projectId) => {
        const socket = get().socket;
        if (socket) {
          socket.emit('leaveProject', parseInt(projectId));
        }
      },

      socketJoinTask: (taskId) => {
        const socket = get().socket;
        if (socket) {
          socket.emit('joinTask', parseInt(taskId));
        }
      },

      socketLeaveTask: (taskId) => {
        const socket = get().socket;
        if (socket) {
          // Socket.io doesn't have an explicit leaveTask listener registered,
          // but we can leave the room or let connection handle it.
          // Leaving the task room is not strictly required but we can leave it.
          socket.emit('leaveTask', parseInt(taskId));
        }
      },

      initSocket: () => {
        const token = get().token;
        if (!token) return;

        // Clean up previous socket if exists
        const currentSocket = get().socket;
        if (currentSocket) {
          currentSocket.disconnect();
        }

        console.log('Connecting to Socket.io backend...');
        const socket = io('http://localhost:5000', {
          auth: { token }
        });

        socket.on('connect', () => {
          console.log('Socket.io connected successfully!');
          // Re-register rooms if currently on a project details page
          const location = typeof window !== 'undefined' ? window.location.pathname : '';
          const match = location.match(/\/projects\/(\d+)/);
          if (match && match[1]) {
            socket.emit('joinProject', parseInt(match[1]));
          }
        });

        // Task created event broadcasted to project room
        socket.on('task:created', (data: any) => {
          const newTask = mapTask(data);
          set((s) => {
            if (s.tasks.some((t) => t.id === newTask.id)) return s;
            return { tasks: [...s.tasks, newTask] };
          });
        });

        // Task updated event broadcasted to project room
        socket.on('task:updated', (data: any) => {
          const updatedTask = mapTask(data);
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
          }));
        });

        // Task deleted event broadcasted to project room
        socket.on('task:deleted', (data: any) => {
          const deletedId = String(data.id);
          set((s) => ({
            tasks: s.tasks.filter((t) => t.id !== deletedId)
          }));
        });

        // Task moved event (Kanban drag-drop)
        socket.on('task:moved', (data: any) => {
          const movedTask = mapTask(data);
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === movedTask.id ? movedTask : t))
          }));
        });

        // Comment added event broadcasted to task room
        socket.on('comment:added', (data: any) => {
          const newComment = mapComment(data);
          set((s) => {
            if (s.comments.some((c) => c.id === newComment.id)) return s;
            return { comments: [...s.comments, newComment] };
          });
        });

        // Private notification received
        socket.on('notification:new', (data: any) => {
          const notif = mapNotification(data);
          set((s) => {
            if (s.notifications.some((n) => n.id === notif.id)) return s;
            return { notifications: [notif, ...s.notifications] };
          });
          // Show real-time notification toast
          toast.info(notif.text, {
            description: 'New Task Action Assigned'
          });
        });

        socket.on('disconnect', () => {
          console.log('Socket.io disconnected.');
        });

        set({ socket });
      }
    }),
    {
      name: "pm-app-store",
      partialize: (s) => ({
        theme: s.theme,
        authed: s.authed,
        token: s.token,
        currentUserId: s.currentUserId
      })
    }
  )
);
