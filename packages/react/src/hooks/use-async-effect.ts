import { useEffect, useState } from "react";
import type { DependencyList } from "react";

/**
 * Runs an async effect and stores its resolved value, discarding results
 * that resolve after the effect re-runs or unmounts (stale deps/unmount).
 */
export function useAsyncEffect<T>(
  fetcher: () => Promise<T> | undefined,
  fallback: T,
  deps: DependencyList,
): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    let isMounted = true;
    setValue(fallback);
    fetcher()?.then(
      (result) => {
        if (isMounted) setValue(result);
      },
      () => {
        if (isMounted) setValue(fallback);
      },
    );
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
