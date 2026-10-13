import { Button } from "react-bootstrap";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-5">
      <i className="bi bi-exclamation-octagon d-block mb-3" style={{ fontSize: "2.75rem", color: "var(--bs-danger)" }} />
      <div className="fw-semibold text-danger">{message}</div>
      {onRetry && (
        <Button variant="outline-secondary" size="sm" className="mt-3" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
