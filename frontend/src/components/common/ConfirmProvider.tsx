import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button, Modal } from "react-bootstrap";

interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal show={options !== null} onHide={() => close(false)} centered dir="rtl">
        {options && (
          <>
            <Modal.Header closeButton>
              <Modal.Title as="h6">{options.title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{options.message}</Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => close(false)}>
                {options.cancelLabel ?? "إلغاء"}
              </Button>
              <Button variant={options.variant ?? "primary"} onClick={() => close(true)}>
                {options.confirmLabel ?? "تأكيد"}
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx;
}
