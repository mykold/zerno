import { useEffect, useState } from "react";

export interface UseRingProps<T, R = unknown> {
  values: readonly T[];
  interval?: number;
  trigger?: R;
}

export function useRing<T>({
  values,
  interval = 500,
  trigger,
}: UseRingProps<T>): T {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [trigger]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((index) => (index + 1) % values.length);
    }, interval);

    return (): void => clearInterval(timer);
  }, [values, interval]);

  return values[index];
}
