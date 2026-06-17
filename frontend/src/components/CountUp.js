import React, { useEffect, useState, useRef } from 'react';

// Animates a numeric value counting up from 0 when it first mounts/changes.
export default function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const target = parseFloat(value);
    if (isNaN(target)) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}
