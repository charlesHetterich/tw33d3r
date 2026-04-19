import { useRef, useEffect } from "react";

export function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean,
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onIntersect(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, enabled]);

  return ref;
}
