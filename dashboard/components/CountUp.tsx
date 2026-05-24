"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Tween a numeric value from previous to new over `duration` ms.
 * No external dep — uses requestAnimationFrame.
 */
export function CountUp({
  value,
  digits = 3,
  duration = 480,
}: {
  value: number | null;
  digits?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevRef = useRef(value ?? 0);

  useEffect(() => {
    if (value == null || Number.isNaN(value)) return;
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value == null) return <>—</>;
  return <>{display.toFixed(digits)}</>;
}
