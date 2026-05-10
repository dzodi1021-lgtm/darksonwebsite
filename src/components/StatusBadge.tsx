"use client";

interface StatusBadgeProps {
  status: "online" | "idle" | "dnd" | "offline";
}

const statusConfig = {
  online: {
    color: "#22c55e",
    label: "Online",
  },
  idle: {
    color: "#eab308",
    label: "Idle",
  },
  dnd: {
    color: "#ef4444",
    label: "Do not disturb",
  },
  offline: {
    color: "#737373",
    label: "Offline",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="w-2.5 h-2.5 rounded-full status-pulse"
        style={{ backgroundColor: config.color }}
      />
      <span className="text-sm text-[var(--text-muted)]">{config.label}</span>
    </div>
  );
}
