import { useSyncExternalStore } from "react";
import type { DocHandle } from "@automerge/automerge-repo/slim";

export function useDocSelector<T, R>(
  handle: DocHandle<T>,
  selector: (doc: T) => R,
): R;

export function useDocSelector<T, R>(
  handle: DocHandle<T> | undefined,
  selector: (doc: T) => R,
): R | undefined;

/**
 * Reads one slice of a handle's document, re-rendering only when that
 * slice changes — not on every change to the document. Use this instead
 * of `useDocument` on documents with fields that update independently
 * and often (e.g. a workspace with a fast-changing message log).
 *
 * @example
 * ```tsx
 * const handle = useDocHandle<Workspace>(url, { suspense: true });
 * const name = useDocSelector(handle, (doc) => doc.name);
 * ```
 */
export function useDocSelector<T, R>(
  handle: DocHandle<T> | undefined,
  selector: (doc: T) => R,
): R | undefined {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!handle) return () => {};
      handle.on("change", onStoreChange);
      return () => void handle.removeListener("change", onStoreChange);
    },
    () => {
      if (!handle) return undefined;
      const doc = handle.doc();
      if (!doc) return undefined;
      return selector(doc);
    },
  );
}
