import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  useDocument as automergeUseDocument,
  useDocuments as automergeUseDocuments,
  useRepo,
  type AnyDocumentId,
  type ChangeDocFn,
  type UseDocumentsOptions,
  type UseDocumentSynchronousParams,
} from "@automerge/react/slim";
import type { Doc } from "@automerge/react/slim";
import type { AutomergeUrl } from "zerno-core";

export function useDocumentProgress(id?: AnyDocumentId): void {
  const repo = useRepo();
  const query = useMemo(() => {
    if (!id) return null;
    return repo.findWithProgress(id);
  }, [repo, id]);

  useSyncExternalStore(
    (onChange) => {
      if (!query) return () => {};
      return query.subscribe(onChange);
    },
    () => (query ? query.peek().state : undefined),
  );
}

export function useDocument<T>(
  id?: AnyDocumentId,
  params?: UseDocumentSynchronousParams,
): [Doc<T>, ChangeDocFn<T>];

export function useDocument<T>(
  id?: AnyDocumentId,
  params?: any,
): [Doc<T> | undefined, ChangeDocFn<T>];

export function useDocument<T>(id?: AnyDocumentId, params?: any): any {
  useDocumentProgress(id);
  return automergeUseDocument<T>(id, params);
}

export function useDocuments<T>(
  ids: AutomergeUrl[],
  options?: UseDocumentsOptions,
) {
  const repo = useRepo();
  const [, forceRender] = useState({});

  useEffect(() => {
    const subscriptions = ids.filter(Boolean).map((id) => {
      const query = repo.findWithProgress(id);
      return query.subscribe(() => forceRender({}));
    });
    return (): void => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [repo, JSON.stringify(ids)]);

  return automergeUseDocuments<T>(ids, options);
}
