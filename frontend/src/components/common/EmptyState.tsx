import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

function EmptyState({ icon = "bi-inbox", title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-5">
      <i className={`bi ${icon} d-block mb-3`} style={{ fontSize: "2.75rem", color: "#c2cbcf" }} />
      <div className="fw-semibold text-body">{title}</div>
      {description && <div className="text-muted small mt-1">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export default EmptyState;
