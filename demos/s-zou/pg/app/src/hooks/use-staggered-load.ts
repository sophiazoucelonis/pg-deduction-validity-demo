import { useState, useEffect } from "react";

export function useStaggeredLoad(
  count: number,
  baseDelay = 150,
  spread = 200
): boolean[] {
  const [visible, setVisible] = useState<boolean[]>(() =>
    Array(count).fill(false)
  );
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      const delay = baseDelay * (i + 1) + Math.random() * spread;
      timers.push(
        setTimeout(() => {
          setVisible((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, delay)
      );
    }

    return () => {
      timers.forEach(clearTimeout);
      setVisible(Array(count).fill(false));
    };
  }, [count, baseDelay, spread]);

  return visible;
}
