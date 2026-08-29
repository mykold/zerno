import { createContext, useContext, type ReactNode } from "react";
import { RepoContext } from "@automerge/react/slim";
import type { Zerno } from "zerno-core";

export interface ZernoProviderProps {
  zerno: Zerno;
  children: ReactNode;
}

const ZernoContext = createContext<Zerno | null>(null);

export function ZernoProvider({
  zerno,
  children,
}: ZernoProviderProps): React.JSX.Element {
  return (
    <ZernoContext.Provider value={zerno}>
      <RepoContext.Provider value={zerno.repo}>{children}</RepoContext.Provider>
    </ZernoContext.Provider>
  );
}

export function useZerno(): Zerno {
  const zerno = useContext(ZernoContext);
  if (zerno === null) {
    throw new Error("useZerno must be used within a ZernoProvider");
  }
  return zerno;
}
