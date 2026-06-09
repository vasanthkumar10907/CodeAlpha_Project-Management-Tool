import { cn } from "@/lib/utils";
import type { Priority } from "@/store/useAppStore";

const styles: Record<Priority, string> = {
  high: "bg-danger/15 text-danger border-danger/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-success/15 text-success border-success/30",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        styles[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}
