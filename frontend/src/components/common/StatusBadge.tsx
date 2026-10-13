import { Badge } from "react-bootstrap";

export type StatusVariant = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "dark";

interface StatusBadgeProps {
  label: string;
  variant: StatusVariant;
}

function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <Badge bg={variant} pill className="fw-normal px-2 py-1">
      {label}
    </Badge>
  );
}

export default StatusBadge;
