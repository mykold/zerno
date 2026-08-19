import React, { createContext, useContext, useEffect, useState } from "react";

const DefaultPopupTimeout = 3_000; /* ms */

export interface PopupProps {
  variant: "info" | "success" | "error" | "warning";
  message: string;
  timeout?: number;
}

interface PopupContextValue {
  popup: PopupProps | null;
  setPopup(popup: PopupProps | null): void;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export function PopupProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [popup, setPopup] = useState<PopupProps | null>(null);

  useEffect(() => {
    if (!popup) return;

    const timeout = setTimeout(
      () => setPopup(null),
      popup.timeout ?? DefaultPopupTimeout,
    );

    return () => clearTimeout(timeout);
  }, [popup]);

  return (
    <PopupContext.Provider
      value={{
        popup,
        setPopup,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
}

export function usePopup(): PopupContextValue {
  const context = useContext(PopupContext);

  if (!context) {
    throw new Error("usePopup must be used within PopupProvider");
  }

  return context;
}
