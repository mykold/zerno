import React, { createContext, useContext, useState } from "react";
import { Text, Box } from "ink";

const DefaultToastTimeout = 7_500; /* ms */

const ToastVariantColors = {
  info: "blue",
  success: "green",
  error: "red",
  warning: "yellow",
} as const;

type ToastVariant = keyof typeof ToastVariantColors;

export interface ToastProps {
  id: number;
  variant: ToastVariant;
  message: string;
  expiresAt: number;
}

interface ToastContextValue {
  toasts: ToastProps[];
  sendToast(variant: ToastVariant, message: string, timeout?: number): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  function sendToast(
    variant: ToastVariant,
    message: string,
    timeout = DefaultToastTimeout,
  ): void {
    const toast: ToastProps = {
      id: toastId++,
      variant,
      message,
      expiresAt: Date.now() + timeout,
    };

    setToasts((current) => [...current, toast]);

    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, toast.expiresAt - Date.now());
  }

  return (
    <ToastContext.Provider value={{ toasts, sendToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

export function Toast(): React.JSX.Element {
  const { toasts } = useToast();

  return (
    <Box flexDirection="column" position="absolute" top={1} right={1} gap={1}>
      {toasts.map((toast) => (
        <Box
          key={toast.id}
          borderStyle="single"
          borderColor={ToastVariantColors[toast.variant]}
          gap={1}
        >
          <Text>{toast.message}</Text>
          <Text dimColor>
            {Math.max(0, (toast.expiresAt - Date.now()) / 1_000).toFixed(2)}s
          </Text>
        </Box>
      ))}
    </Box>
  );
}
