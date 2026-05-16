import { statusColor, statusLabel } from "@/lib/format";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(status)} ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}
