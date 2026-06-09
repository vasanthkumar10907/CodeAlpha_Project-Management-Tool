import type { User } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function UserAvatar({ user, size = 28, className }: { user: User; size?: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center rounded-full text-white font-semibold shrink-0 ring-2 ring-background", className)}
      style={{ width: size, height: size, backgroundColor: user.color, fontSize: size * 0.4 }}
      title={user.name}
    >
      {user.avatar}
    </div>
  );
}

export function AvatarStack({ users, max = 4, size = 28 }: { users: User[]; max?: number; size?: number }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <UserAvatar user={u} size={size} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="flex items-center justify-center rounded-full bg-muted text-foreground font-semibold ring-2 ring-background"
          style={{ width: size, height: size, marginLeft: -8, fontSize: size * 0.36 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
