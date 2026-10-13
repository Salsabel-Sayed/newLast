import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Toast, ToastContainer } from "react-bootstrap";

type ToastVariant = "success" | "danger" | "warning" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: "bi-check-circle-fill",
  danger: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

const AUTO_HIDE_MS = 4500;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, variant }]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position="bottom-start" className="p-3" style={{ zIndex: 2000 }}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            bg={toast.variant}
            onClose={() => remove(toast.id)}
            delay={AUTO_HIDE_MS}
            autohide
          >
            <Toast.Body className={`d-flex align-items-center gap-2 ${toast.variant === "warning" ? "" : "text-white"}`}>
              <i className={`bi ${VARIANT_ICON[toast.variant]}`} />
              <span>{toast.message}</span>
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
