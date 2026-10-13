import { Spinner } from "react-bootstrap";

interface LoadingStateProps {
  label?: string;
}

function LoadingState({ label = "جارٍ التحميل..." }: LoadingStateProps) {
  return (
    <div className="app-loading-overlay flex-column gap-2">
      <Spinner animation="border" role="status" variant="primary" />
      <span className="text-muted small">{label}</span>
    </div>
  );
}

export default LoadingState;
