import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/store/useAppStore";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Plane" },
      { name: "description", content: "Manage your workspace and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const users = useAppStore((s) => s.users);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const me = users.find((u) => u.id === currentUserId);
  const displayUser = me || {
    id: currentUserId || "0",
    name: "Loading...",
    avatar: "L",
    color: "#6366F1",
    email: "loading...",
    role: "member"
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-3xl">Settings</h1>
      <p className="text-muted-foreground mt-1">Personalize your workspace.</p>

      <div className="mt-8 space-y-6">
        <section className="rounded-xl bg-card border border-border p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <UserAvatar user={displayUser} size={64} />
            <div>
              <div className="font-semibold">{displayUser.name}</div>
              <div className="text-sm text-muted-foreground">{displayUser.role}</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input defaultValue={displayUser.name} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={displayUser.email} className="h-11" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="hero">Save changes</Button>
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Appearance</h2>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">Dark mode</div>
              <div className="text-sm text-muted-foreground">Use the deep navy theme.</div>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </section>

        <section className="rounded-xl bg-card border border-border p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Notifications</h2>
          <div className="space-y-3">
            {["Mentions", "Task assignments", "Due date reminders", "Weekly summary"].map((n) => (
              <div key={n} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">{n}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
